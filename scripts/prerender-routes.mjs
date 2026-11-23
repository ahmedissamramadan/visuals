import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const distDir = path.resolve('dist');
const templateHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// 1. Copy 404.html for GitHub Pages SPA fallback (supports clean URLs like /visuals/work/<slug>)
fs.writeFileSync(path.join(distDir, '404.html'), templateHtml);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://owlglaqltdniywcprzab.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGdsYXFsdGRuaXl3Y3ByemFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNTY2NDgsImV4cCI6MjExMDkzMjY0OH0._Y7iR4YU7z10-TOkRHSYC_466_5pJ3mFSYjRqGgbWGo';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BASE_URL = 'https://ahmedissamramadan.github.io/visuals';
const DEFAULT_OG = 'https://owlglaqltdniywcprzab.supabase.co/storage/v1/object/public/visuals/brand/ahmed-headshot-1000.webp';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeRouteHtml(relPath, { title, desc, ogImage, canonical }) {
  let html = templateHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${esc(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${esc(desc)}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${esc(ogImage)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${esc(canonical)}" />`);

  const targetDir = path.join(distDir, relPath);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), html);
}

const staticRoutes = [
  { path: 'mind', title: 'داخل عقلي والمنظومة · Artelligence', desc: 'مبادئ العمل، التفكيك البعدي، هندسة Artelligence، والتركيز الحالي لأحمد عصام رمضان.', ogImage: DEFAULT_OG },
  { path: 'case-studies', title: 'دراسات الحالة وشغل العملاء · Artelligence', desc: 'مشكلات حقيقية وحلول عملية: WASL Network، هوية KHEM، منظومة التهامي، ومحرك Astro Cosmic.', ogImage: DEFAULT_OG },
  { path: 'game', title: 'تحدي إنسان أم آلة؟ · Artelligence', desc: 'اختبر عينك في 10 جولات: هل هذه الصورة بكاميرا حقيقية أم بالذكاء الاصطناعي؟', ogImage: DEFAULT_OG },
  { path: 'about', title: 'عن أحمد عصام رمضان · Artelligence', desc: 'مستشار تحول الأعمال ودمج الذكاء الاصطناعي ومؤسس Artelligence.', ogImage: DEFAULT_OG },
  { path: 'admin', title: 'Artelligence Control Studio', desc: 'Admin studio for managing collections, works, and live mind notes.', ogImage: DEFAULT_OG }
];

for (const r of staticRoutes) {
  writeRouteHtml(r.path, {
    title: r.title,
    desc: r.desc,
    ogImage: r.ogImage,
    canonical: `${BASE_URL}/${r.path}/`
  });
}

const sitemapUrls = [
  `${BASE_URL}/`,
  ...staticRoutes.filter(r => r.path !== 'admin').map(r => `${BASE_URL}/${r.path}/`)
];

try {
  const { data: cols } = await supabase.from('collections').select('*').eq('is_published', true).order('sort_order');
  const { data: works } = await supabase.from('works').select('collection_id, image_urls').eq('is_published', true).order('sort_order');

  for (const col of cols || []) {
    const firstWork = (works || []).find(w => w.collection_id === col.id);
    const ogImg = col.cover || firstWork?.image_urls?.['1200'] || firstWork?.image_urls?.['480'] || DEFAULT_OG;
    writeRouteHtml(`collection/${col.slug}`, {
      title: `${col.title_ar} · ${col.title_en} - Artelligence`,
      desc: col.description_ar || col.description_en,
      ogImage: ogImg,
      canonical: `${BASE_URL}/collection/${col.slug}/`
    });
    sitemapUrls.push(`${BASE_URL}/collection/${col.slug}/`);
  }
  console.log(`Prerendered ${(cols || []).length} collections and ${staticRoutes.length} static routes + 404.html`);
} catch (err) {
  console.warn('Could not fetch collections during prerender:', err.message);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
