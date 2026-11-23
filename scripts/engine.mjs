#!/usr/bin/env node
/**
 * Visuals Production & Curation Engine (محرك التحكم والإنتاج البصري)
 *
 * Commands:
 *   node scripts/engine.mjs audit
 *   node scripts/engine.mjs ingest <dir> --collection <slug> --origin <camera|ai|design> [--user admin] [--pass 301196]
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://owlglaqltdniywcprzab.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGdsYXFsdGRuaXl3Y3ByemFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNTY2NDgsImV4cCI6MjExMDkzMjY0OH0._Y7iR4YU7z10-TOkRHSYC_466_5pJ3mFSYjRqGgbWGo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/\.[^.]+$/, '')
    .replace(/\((JPEG|PNG|WEBP)\)/gi, '')
    .replace(/^(Portrait_\d+_|Slide_\d+_)/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/—/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeQualityScore(width, height, titleEn, titleAr) {
  const pixels = (width || 1200) * (height || 1200);
  let score = 80;
  if (pixels >= 3500000) score = 96;
  else if (pixels >= 2000000) score = 92;
  else if (pixels >= 1000000) score = 86;
  else if (pixels < 600000) score = 48;

  if (titleAr && titleEn && titleAr !== titleEn) score = Math.min(99, score + 3);
  return score;
}

async function runAudit() {
  const { data: cols } = await supabase.from('collections').select('*').order('sort_order');
  const { data: works } = await supabase.from('works').select('*').order('sort_order');

  const pubWorks = (works || []).filter(w => w.is_published !== false);
  const archWorks = (works || []).filter(w => w.is_published === false);
  const featWorks = pubWorks.filter(w => w.is_featured);

  console.log('=== VISUALS CURATION & PRODUCTION ENGINE AUDIT ===');
  console.log(`Published Collections : ${(cols || []).filter(c => c.is_published).length}`);
  console.log(`Published Works       : ${pubWorks.length}`);
  console.log(`Archived (Filtered)   : ${archWorks.length}`);
  console.log(`Featured Masterworks  : ${featWorks.length}`);
  console.log('--------------------------------------------------');
  for (const c of (cols || []).filter(x => x.is_published)) {
    const cw = pubWorks.filter(w => w.collection_id === c.id);
    const avgScore = cw.length
      ? Math.round(cw.reduce((s, w) => s + (w.quality_score || 85), 0) / cw.length)
      : 0;
    console.log(`${c.slug.padEnd(25)} | ${String(cw.length).padStart(3)} works | Avg Quality: ${avgScore}% | ${c.title_ar}`);
  }
}

async function runIngest(dir, args) {
  const colSlug = args['--collection'];
  const origin = args['--origin'] || 'ai';
  const user = args['--user'] || 'admin';
  const pass = args['--pass'] || process.env.VISUALS_ADMIN_PASS;

  if (!dir || !colSlug || !pass) {
    console.error('Usage: node scripts/engine.mjs ingest <dir> --collection <slug> --origin <camera|ai|design> --pass <password>');
    process.exit(1);
  }

  const sharp = (await import('sharp')).default;
  const email = user === 'admin' ? 'ahmedissam.personal@gmail.com' : user === 'boda890' ? 'bodykhaled5000@gmail.com' : user;
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (authErr) throw authErr;

  const { data: col } = await supabase.from('collections').select('id, slug').eq('slug', colSlug).single();
  if (!col) throw new Error(`Collection not found: ${colSlug}`);

  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const seenHashes = new Set();
  let published = 0, filtered = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(dir, files[i]);
    const buf = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    if (seenHashes.has(hash)) {
      console.log(`Skipping exact duplicate: ${files[i]}`);
      continue;
    }
    seenHashes.add(hash);

    const base = sharp(buf).rotate();
    const meta = await base.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1200;
    const title = cleanTitle(files[i]);
    const score = computeQualityScore(width, height, title, title);
    const isPublished = score >= 65;

    const slug = `${colSlug}-${hash}`;
    const blurBuf = await base.clone().resize(24).webp({ quality: 40 }).toBuffer();
    const blurDataUrl = `data:image/webp;base64,${blurBuf.toString('base64')}`;

    const imageUrls = {};
    for (const w of [480, 1200, 2400]) {
      const out = await base.clone().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const storagePath = `works/${slug}/${w}.webp`;
      const { error } = await supabase.storage.from('visuals').upload(storagePath, out, { contentType: 'image/webp', upsert: true });
      if (error) throw error;
      imageUrls[String(w)] = `${SUPABASE_URL}/storage/v1/object/public/visuals/${storagePath}`;
    }

    const { error: insErr } = await supabase.from('works').upsert({
      slug,
      collection_id: col.id,
      origin,
      media_type: 'image',
      title_en: title,
      title_ar: title,
      themes: [colSlug],
      image_urls: imageUrls,
      blur_data_url: blurDataUrl,
      width,
      height,
      quality_score: score,
      is_published: isPublished,
      sort_order: i + 1
    }, { onConflict: 'slug' });
    if (insErr) throw insErr;

    if (isPublished) published++; else filtered++;
    console.log(`[${isPublished ? 'PUBLISHED' : 'ARCHIVED '}] ${slug} (${width}x${height}, score=${score})`);
  }

  console.log(`Done! Published: ${published}, Auto-Archived (low quality): ${filtered}`);
}

const [, , cmd, arg1, ...rest] = process.argv;
const flags = {};
for (let i = 0; i < rest.length; i += 2) flags[rest[i]] = rest[i + 1];

if (cmd === 'ingest') runIngest(arg1, flags);
else runAudit();
