import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const templateHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// 1. Copy 404.html for GitHub Pages SPA fallback
fs.writeFileSync(path.join(distDir, '404.html'), templateHtml);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://owlglaqltdniywcprzab.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93bGdsYXFsdGRuaXl3Y3ByemFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNTY2NDgsImV4cCI6MjExMDkzMjY0OH0._Y7iR4YU7z10-TOkRHSYC_466_5pJ3mFSYjRqGgbWGo';

const BASE_URL = (process.env.SITE_ORIGIN || 'https://ahmedissamramadan.github.io').replace(/\/$/, '');
const DEFAULT_OG = 'https://owlglaqltdniywcprzab.supabase.co/storage/v1/object/public/visuals/brand/ahmed-headshot-1000.webp';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeRouteHtml(relPath, { title, desc, ogImage, canonical }) {
  const html = templateHtml
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
  { path: 'solutions', title: 'الحلول وسُلّم Growth OS · Artelligence', desc: 'منهجية ABTI، حاسبة الاستفسارات الضائعة، وطلب فيديو تشريح مجاني (دقيقتين) للشركات والمصانع وشركات التشطيبات.', ogImage: DEFAULT_OG },
  { path: 'proof', title: 'خزينة الأدلة ودراسات الحالة الموثقة · Artelligence', desc: 'مشكلات حقيقية وحلول معمارية موثقة: WASL Network، هوية KHEM في 7 أيام، منظومة التشطيبات، ومحرك 92 ريل.', ogImage: DEFAULT_OG },
  { path: 'mind', title: 'داخل عقلي وهرم الذكاء الاصطناعي · Artelligence', desc: 'مبادئ العمل، التفكيك البعدي، هرم النضج في الذكاء الاصطناعي، والتركيز الحي لأحمد عصام رمضان.', ogImage: DEFAULT_OG },
  { path: 'archive', title: 'المتحف البصري ومختبر الـ 216 أيقونة · Artelligence', desc: 'هويات العملاء، 60 لوحة في الإنسان والآلة، الفوتوغرافيا المنتقاة، ونظام الأيقونات الهندسي بزاوية 56.9 درجة.', ogImage: DEFAULT_OG },
  { path: 'academy', title: 'التطبيقات الرسمية والأكاديمية والأنظمة · Artelligence', desc: 'تحميل تطبيق Artelligence للأندرويد و macOS، واستعراض المناهج التفاعلية ومهارات الوكلاء المستقلين.', ogImage: DEFAULT_OG },
  { path: 'lab', title: 'المختبر التفاعلي: إنسان أم آلة؟ وفحص الجاهزية · Artelligence', desc: 'اختبر عينك في 10 جولات أو افحص جاهزية نظام المبيعات والأتمتة في شركتك خلال دقيقتين.', ogImage: DEFAULT_OG },
  { path: 'studio', title: 'Artelligence Executive Command Studio', desc: 'مركز القيادة لإدارة الـ Mini-CRM، طلبات التشريح، المحتوى، والمجموعات البصرية.', ogImage: DEFAULT_OG },
  // Legacy clean route aliases so zero old URLs ever break
  { path: 'case-studies', title: 'خزينة الأدلة ودراسات الحالة · Artelligence', desc: 'دراسات الحالة الموثقة لمنظومة Artelligence.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'game', title: 'تحدي إنسان أم آلة؟ · Artelligence', desc: 'المختبر التفاعلي وتحدي التمييز بين الكاميرا والذكاء الاصطناعي.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'admin', title: 'Artelligence Studio', desc: 'Command Studio.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'about', title: 'عن أحمد عصام رمضان · Artelligence', desc: 'مستشار تحوّل الأعمال ودمج الذكاء الاصطناعي · مؤسس Artelligence.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'services', title: 'الخدمات وسُلّم Growth OS · Artelligence', desc: 'تحوّل الأعمال وتأسيس أنظمة الذكاء الاصطناعي للشركات.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'artelligence', title: 'Artelligence · أحمد عصام رمضان', desc: 'بوابة حلول ومنظومة Artelligence الموحدة.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'ai-pyramid', title: 'هرم الذكاء الاصطناعي · Artelligence', desc: 'هرم النضج والانعكاس الذاتي في عصر الذكاء الاصطناعي.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'air', title: 'حاسبة العائد ومنظومة المحتوى · Artelligence', desc: 'حاسبة الاستفسارات الضائعة ومنظومة Growth OS.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'store', title: 'الأنظمة والأدلة الرقمية · Artelligence', desc: 'مكتبة الأنظمة والمناهج والتطبيقات الرسمية.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'microsaas', title: 'الأنظمة والتطبيقات · Artelligence', desc: 'تطبيقات ومنظومات Artelligence.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'portfolio', title: 'الأعمال ودراسات الحالة · Artelligence', desc: 'خزينة الأدلة والمتحف البصري.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'contact', title: 'تواصل مباشر مع أحمد عصام رمضان · Artelligence', desc: 'احجز مكالمة 15 دقيقة أو اطلب فيديو تشريح مجاني لشركتك.', ogImage: DEFAULT_OG, aliasOnly: true },
  { path: 'links', title: 'الروابط الرسمية الموحدة · Artelligence', desc: 'القنوات الرسمية الموحدة لأحمد عصام رمضان و Artelligence.', ogImage: DEFAULT_OG, aliasOnly: true }
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
  ...staticRoutes.filter(r => !r.aliasOnly && r.path !== 'studio').map(r => `${BASE_URL}/${r.path}/`)
];

async function sbFetch(tablePath) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tablePath}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${tablePath}`);
  return res.json();
}

try {
  const [cols, works] = await Promise.all([
    sbFetch('collections?select=*&is_published=eq.true&order=sort_order'),
    sbFetch('works?select=collection_id,image_urls&is_published=eq.true&order=sort_order')
  ]);

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
  console.log(`Prerendered ${(cols || []).length} collections and ${staticRoutes.length} routes + 404.html`);
} catch (err) {
  console.warn('Could not fetch collections during prerender:', err.message);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
