import './styles/main.css';
import { supabase, ensureAuthSession, getSavedProfile, saveVisitorProfile, notifyLeadAlert } from './lib/supabase.js';
import { renderAdminPage } from './admin.js';
import { renderGamePage } from './game.js';
import { renderProofVaultPage } from './proof.js';
import { renderSolutionsPage, bindSolutionsEvents } from './solutions.js';
import {
  ensureIconsCatalog,
  renderPyramidSection,
  bindPyramidEvents,
  renderIconSystemLab,
  bindIconLabEvents,
  renderAcademyPage
} from './pyramid.js';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const HEADSHOT_URL = 'https://owlglaqltdniywcprzab.supabase.co/storage/v1/object/public/visuals/brand/ahmed-headshot-480.webp';

function pUrl(sub = '/') {
  const clean = sub.startsWith('/') ? sub : `/${sub}`;
  return `${BASE}${clean}` || '/';
}

const REACTION_TYPES = [
  { key: 'heart', labelEn: '❤️ Love', labelAr: '❤️ إعجاب' },
  { key: 'wahashni', labelEn: '🌙 Nostalgic', labelAr: '🌙 وحشني' },
  { key: 'coffee', labelEn: '☕ Warm', labelAr: '☕ ريحتها قهوة' },
  { key: 'me', labelEn: '🪞 This is me', labelAr: '🪞 ده أنا' },
  { key: 'deep', labelEn: '✨ Deep', labelAr: '✨ مش فاهم بس حلو' }
];

const HM_CHAPTERS = [
  { key: 'all', ar: 'كل الفصول (60)', en: 'All Chapters (60)' },
  { key: 'plates', ar: 'الإنسان والآلة (36)', en: 'Human x Machine (36)' },
  { key: 'cairo', ar: 'القاهرة في صمت سريالي (8)', en: 'Cairo Silence (8)' },
  { key: 'memory', ar: 'أرشيف الذاكرة الرقمية (8)', en: 'Digital Memory (8)' },
  { key: 'chiaroscuro', ar: 'دراسات الضوء والظل (8)', en: 'Chiaroscuro (8)' }
];

const PHOTO_CHAPTERS = [
  { key: 'all', ar: 'كل الفصول', en: 'All Chapters' },
  { key: 'river', ar: 'نهرٌ وسماء', en: 'River & Sky' },
  { key: 'table', ar: 'طاولةٌ وقهوة', en: 'Table & Cup' },
  { key: 'night', ar: 'ليلٌ وحركة', en: 'Night & Motion' },
  { key: 'small', ar: 'أشياءُ صغيرة', en: 'Small Things' }
];

if (window.location.hash.startsWith('#/')) {
  const cleanSub = window.location.hash.slice(1);
  window.history.replaceState(null, '', pUrl(cleanSub));
}

const FIGMA_THEMES = [
  { id: 'obsidian', dot: '#0B0B0B', ring: '#FFFFFF', label: 'Obsidian' },
  { id: 'acid', dot: '#D5FF5F', ring: '#181C19', label: 'Acid' },
  { id: 'paper', dot: '#F2E8DA', ring: '#0B0B0B', label: 'Warm Paper' },
  { id: 'cobalt', dot: '#244BEE', ring: '#EEF1FF', label: 'Cobalt' }
];

function normalizeTheme(raw) {
  if (raw === 'dark') return 'obsidian';
  if (raw === 'light') return 'paper';
  if (FIGMA_THEMES.some(t => t.id === raw)) return raw;
  return 'obsidian';
}

function artIco(file, cls = 'art-ico') {
  return `<img src="${pUrl(`/dna/icons/${file}`)}" class="${cls}" alt="" aria-hidden="true" loading="lazy" />`;
}

const state = {
  lang: localStorage.getItem('artelligence_lang') || localStorage.getItem('ahmed_visuals_lang') || 'ar',
  theme: normalizeTheme(localStorage.getItem('artelligence_theme') || localStorage.getItem('ahmed_visuals_theme') || 'obsidian'),
  origin: 'all',
  chapter: 'all',
  showFullPhotoArchive: false,
  searchQuery: '',
  collections: [],
  works: [],
  caseStudies: [],
  mindNotes: [],
  servicesOffers: [],
  digitalProducts: [],
  reactions: new Map(),
  userReactions: new Set(),
  profile: getSavedProfile(),
  activeWork: null,
  activeComments: [],
  inquiryStatus: '',
  route: parseRoute()
};

const T = {
  en: {
    brand: 'Ahmed Issam Ramadan',
    subBrand: 'Artelligence',
    home: 'Home',
    solutions: 'Solutions',
    proof: 'Case Studies',
    mind: 'How I Think',
    archive: 'Visual Archive',
    academy: 'Apps & Academy',
    lab: 'Interactive Lab',
    bookCall: 'Free 2m Teardown',
    availBadge: 'Business Transformation & AI Integration Consultant · Founder of Artelligence',
    heroTitle: 'What eats your time every day, runs on its own.',
    heroSub: 'I turn messy daily operations in factories, finishing firms, and growing SMEs into simple autonomous systems - backed by real numbers and zero complexity.',
    exploreSolutions: 'Request Free 2m Teardown',
    exploreProof: 'Case Studies',
    openMind: 'Enter My Mind',
    all: 'All',
    camera: 'Camera',
    ai: 'AI Plates',
    design: 'Design',
    worksCount: (n) => `${n} works`,
    backHome: '← Back Home',
    openExternal: 'Open Live ↗',
    copyLink: 'Copy Link',
    exportStory: 'Story Card (1080x1920)',
    copied: 'Copied!',
    comments: 'Comments',
    commentPlaceholder: 'Write a thought...',
    send: 'Send',
    signInPrompt: 'Enter your name to react & comment',
    yourName: 'Your name',
    saveProfile: 'Continue',
    noWorks: 'No works match this filter yet.'
  },
  ar: {
    brand: 'أحمد عصام رمضان',
    subBrand: 'Artelligence',
    home: 'الرئيسية',
    solutions: 'الحلول و Growth OS',
    proof: 'خزينة الأدلة',
    mind: 'طريقة تفكيري',
    archive: 'المتحف البصري',
    academy: 'التطبيقات والأكاديمية',
    lab: 'المختبر التفاعلي',
    bookCall: 'اطلب تشريح دقيقتين',
    availBadge: 'مستشار تحوّل الأعمال ودمج الذكاء الاصطناعي · مؤسس Artelligence',
    heroTitle: 'اللي بياخد وقتك كل يوم، يشتغل لوحده.',
    heroSub: 'أحوّل الشغل اليومي المتلخبط في الشركات الصغيرة والمتوسطة والمصانع وشركات التشطيبات لأنظمة بسيطة تشتغل لوحدها، بأرقام حقيقية ومن غير تعقيد.',
    exploreSolutions: 'اطلب فيديو تشريح مجاني (دقيقتين)',
    exploreProof: 'شاهد الأدلة ودراسات الحالة',
    openMind: 'ادخل عقلي',
    all: 'الكل',
    camera: 'كاميرا',
    ai: 'ذكاء اصطناعي',
    design: 'تصميم وهوية',
    worksCount: (n) => `${n} عمل`,
    backHome: '→ العودة للرئيسية',
    openExternal: 'عرض مباشر ↗',
    copyLink: 'نسخ الرابط',
    exportStory: 'بطاقة ستوري (1080x1920)',
    copied: 'تم النسخ!',
    comments: 'التعليقات',
    commentPlaceholder: 'اكتب تعليقاً...',
    send: 'إرسال',
    signInPrompt: 'أدخل اسمك للتفاعل والتعليق',
    yourName: 'اسمك',
    saveProfile: 'متابعة',
    noWorks: 'لا توجد أعمال مطابقة لهذا الفلتر حالياً.'
  }
};

function t(key, ...args) {
  const val = T[state.lang][key];
  return typeof val === 'function' ? val(...args) : val;
}

function parseRoute() {
  let path = window.location.pathname;
  if (BASE && path.startsWith(BASE)) path = path.slice(BASE.length);
  if (path.startsWith('/visuals')) path = path.slice('/visuals'.length);
  const parts = path.split('/').filter(Boolean);
  let p0 = (parts[0] || '').toLowerCase();
  if (p0 === 'ar' || p0 === 'en') {
    state.lang = p0;
    localStorage.setItem('artelligence_lang', p0);
    p0 = (parts[1] || '').toLowerCase();
    if (p0 === 'collection' && parts[2]) return { page: 'collection', slug: parts[2] };
    if (p0 === 'work' && parts[2]) return { page: 'work', slug: parts[2] };
  }

  if (p0 === 'collection' && parts[1]) return { page: 'collection', slug: parts[1] };
  if (p0 === 'work' && parts[1]) return { page: 'work', slug: parts[1] };
  if (['solutions', 'services', 'artelligence', 'air'].includes(p0)) return { page: 'solutions' };
  if (['proof', 'case-studies', 'portfolio'].includes(p0)) return { page: 'cases' };
  if (['mind', 'ai-pyramid', 'about'].includes(p0)) return { page: 'mind' };
  if (p0 === 'archive') return { page: 'archive' };
  if (['academy', 'store', 'microsaas'].includes(p0)) return { page: 'academy' };
  if (['lab', 'game'].includes(p0)) return { page: 'game' };
  if (['studio', 'admin'].includes(p0)) return { page: 'admin' };
  if (['contact', 'links'].includes(p0)) return { page: 'contact' };
  return { page: 'home' };
}

function navigate(targetPath) {
  const full = targetPath.startsWith('http') ? targetPath : pUrl(targetPath);
  window.history.pushState(null, '', full);
  state.route = parseRoute();
  state.chapter = 'all';
  if (state.route.page !== 'work') state.activeWork = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (state.route.page === 'archive') ensureIconsCatalog().then(() => render());
  else render();
}

function applyThemeAndLang() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.classList.toggle('light-mode', state.theme === 'paper');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getWorkImg(work, size = '480') {
  const urls = work.image_urls || {};
  return urls[size] || urls['1200'] || urls['480'] || urls['2400'] || '';
}

function getWorkSrcset(work) {
  const urls = work.image_urls || {};
  const parts = [];
  if (urls['480']) parts.push(`${urls['480']} 480w`);
  if (urls['1200']) parts.push(`${urls['1200']} 1200w`);
  if (urls['2400']) parts.push(`${urls['2400']} 2400w`);
  return parts.join(', ');
}

async function generateStoryCard(work) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(48, 48, 984, 1824);

  const imgUrl = getWorkImg(work, '1200');
  const res = await fetch(imgUrl);
  const bmp = await createImageBitmap(await res.blob());
  const scale = Math.min(900 / bmp.width, 1280 / bmp.height);
  const drawW = Math.round(bmp.width * scale);
  const drawH = Math.round(bmp.height * scale);
  ctx.drawImage(bmp, Math.round((1080 - drawW) / 2), Math.round(180 + (1280 - drawH) / 2), drawW, drawH);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 42px "IBM Plex Sans Arabic", sans-serif';
  const title = state.lang === 'ar' ? (work.title_ar || work.title_en) : (work.title_en || work.title_ar);
  ctx.fillText(title.slice(0, 42), 540, 1580);

  ctx.fillStyle = '#A1A1AA';
  ctx.font = '600 24px "IBM Plex Sans", sans-serif';
  ctx.fillText('ARTELLIGENCE · AHMED ISSAM RAMADAN', 540, 1655);
  ctx.font = '400 20px "IBM Plex Sans", sans-serif';
  ctx.fillText('ahmedissamramadan.github.io', 540, 1705);

  const outBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(outBlob);
  a.download = `${work.slug}-artelligence-story-1080x1920.png`;
  a.click();
}

async function loadData() {
  const [
    { data: cols },
    { data: works },
    { data: reacts },
    { data: cases },
    { data: notes },
    { data: offers },
    { data: products }
  ] = await Promise.all([
    supabase.from('collections').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('works').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('reactions').select('work_id, profile_id, reaction_type'),
    supabase.from('case_studies').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('mind_notes').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('services_offers').select('*').eq('is_active', true).order('step_order'),
    supabase.from('digital_products').select('*').eq('is_published', true).order('sort_order')
  ]);

  state.collections = cols || [];
  state.works = works || [];
  state.caseStudies = cases || [];
  state.mindNotes = notes || [];
  state.servicesOffers = offers || [];
  state.digitalProducts = products || [];
  state.reactions = new Map();
  state.userReactions = new Set();

  for (const r of reacts || []) {
    const key = `${r.work_id}:${r.reaction_type || 'heart'}`;
    state.reactions.set(key, (state.reactions.get(key) || 0) + 1);
    if (state.profile && r.profile_id === state.profile.id) state.userReactions.add(key);
  }

  if (state.route.page === 'archive') {
    await ensureIconsCatalog();
  }
  if (state.route.page === 'work') {
    const found = state.works.find(w => w.slug === state.route.slug);
    if (found) await openWork(found, false);
  }
  render();
}

function subscribeRealtime() {
  supabase
    .channel('artelligence-unified-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mind_notes' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'case_studies' }, () => loadData())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
      if (state.activeWork && payload.new.work_id === state.activeWork.id && !payload.new.is_hidden) {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', payload.new.profile_id).single();
        state.activeComments.push({ ...payload.new, profiles: prof });
        render();
      }
    })
    .subscribe();
}

async function openWork(work, pushUrl = true) {
  state.activeWork = work;
  if (pushUrl) window.history.pushState(null, '', pUrl(`/work/${work.slug}`));
  document.title = `${state.lang === 'ar' ? work.title_ar : work.title_en} · ${t('subBrand')}`;
  supabase.rpc('increment_work_view', { target_work_id: work.id }).then(() => {});
  const { data } = await supabase
    .from('comments')
    .select('id, body, created_at, profile_id, profiles(display_name)')
    .eq('work_id', work.id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });
  state.activeComments = data || [];
  render();
}

function closeWork() {
  state.activeWork = null;
  state.activeComments = [];
  document.title = `${t('subBrand')} · ${t('brand')}`;
  if (state.route.page === 'work') navigate('/archive');
  else render();
}

async function toggleReaction(workId, reactionType = 'heart') {
  if (!state.profile) {
    showProfileModal(() => toggleReaction(workId, reactionType));
    return;
  }
  const key = `${workId}:${reactionType}`;
  if (state.userReactions.has(key)) {
    await supabase.from('reactions').delete().eq('work_id', workId).eq('profile_id', state.profile.id).eq('reaction_type', reactionType);
    state.userReactions.delete(key);
    state.reactions.set(key, Math.max(0, (state.reactions.get(key) || 1) - 1));
  } else {
    await supabase.from('reactions').insert({ work_id: workId, profile_id: state.profile.id, reaction_type: reactionType });
    state.userReactions.add(key);
    state.reactions.set(key, (state.reactions.get(key) || 0) + 1);
  }
  render();
}

async function submitComment(workId, body) {
  if (!state.profile) {
    showProfileModal(() => submitComment(workId, body));
    return;
  }
  const trimmed = body.trim();
  if (!trimmed) return;
  await supabase.from('comments').insert({ work_id: workId, profile_id: state.profile.id, body: trimmed });
}

let pendingProfileCallback = null;
function showProfileModal(cb = null) {
  pendingProfileCallback = cb;
  document.getElementById('profile-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'profile-modal';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-card">
      <h3>${t('signInPrompt')}</h3>
      <input id="profile-name-input" class="input" type="text" placeholder="${t('yourName')}" maxlength="40" value="${escHtml(state.profile?.display_name || '')}" />
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="profile-cancel" class="pill-btn" type="button">✕</button>
        <button id="profile-save" class="pill-btn active" type="button">${t('saveProfile')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#profile-cancel').onclick = () => modal.remove();
  modal.querySelector('#profile-save').onclick = async () => {
    const val = modal.querySelector('#profile-name-input').value;
    if (!val.trim()) return;
    state.profile = await saveVisitorProfile(val);
    modal.remove();
    render();
    if (pendingProfileCallback) {
      const fn = pendingProfileCallback;
      pendingProfileCallback = null;
      fn();
    }
  };
}

function renderHeader() {
  const p = state.route.page;
  return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="${pUrl('/')}" data-nav="/" class="brand">
          <span class="brand-mark"><img src="${pUrl('/dna/logos/Artelligence_04_Symbol.svg')}" alt="" /></span>
          <span>${t('subBrand')}</span>
          <span style="color:var(--muted);font-weight:400;font-size:0.82rem;">· ${t('brand')}</span>
        </a>
        <nav class="nav-links">
          <a href="${pUrl('/')}" data-nav="/" class="nav-link ${p === 'home' ? 'active' : ''}">${t('home')}</a>
          <a href="${pUrl('/solutions')}" data-nav="/solutions" class="nav-link ${p === 'solutions' ? 'active' : ''}">${t('solutions')}</a>
          <a href="${pUrl('/proof')}" data-nav="/proof" class="nav-link ${p === 'cases' ? 'active' : ''}">${t('proof')}</a>
          <a href="${pUrl('/mind')}" data-nav="/mind" class="nav-link ${p === 'mind' ? 'active' : ''}">${t('mind')}</a>
          <a href="${pUrl('/archive')}" data-nav="/archive" class="nav-link ${p === 'archive' || p === 'collection' ? 'active' : ''}">${t('archive')}</a>
          <a href="${pUrl('/academy')}" data-nav="/academy" class="nav-link ${p === 'academy' ? 'active' : ''}">${t('academy')}</a>
          <a href="${pUrl('/lab')}" data-nav="/lab" class="nav-link ${p === 'game' ? 'active' : ''}">${t('lab')}</a>
        </nav>
        <div class="header-actions">
          <div class="theme-switcher" role="group" aria-label="Theme Palette">
            ${FIGMA_THEMES.map(th => `
              <button
                class="theme-dot ${state.theme === th.id ? 'active' : ''}"
                data-theme-pick="${th.id}"
                type="button"
                title="${th.label}"
                aria-label="${th.label}"
                style="background:${th.dot};border-color:${th.ring};"
              ></button>
            `).join('')}
          </div>
          <button id="lang-toggle" class="pill-btn" type="button">${state.lang === 'en' ? 'عربي' : 'English'}</button>
          <a href="${state.lang === 'ar' ? 'https://wa.me/201501656010?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20Teardown%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%2F%D9%85%D9%88%D9%82%D8%B9%D9%8A%3A%20' : 'https://wa.me/201501656010?text=Hi%20Ahmed%2C%20I%27d%20like%20a%20free%202-min%20teardown%20for%3A%20'}" target="_blank" rel="noopener" class="pill-btn active hide-xs">${t('bookCall')}</a>
        </div>
      </div>
    </header>
  `;
}

function renderMobileBottomNav() {
  const p = state.route.page;
  const isAr = state.lang === 'ar';
  const items = [
    { route: '/', active: p === 'home', icon: '060_home.svg', ar: 'الرئيسية', en: 'Home' },
    { route: '/solutions', active: p === 'solutions', icon: '013_automation.svg', ar: 'الحلول', en: 'Solutions' },
    { route: '/proof', active: p === 'cases', icon: '017_work.svg', ar: 'الأدلة', en: 'Proof' },
    { route: '/mind', active: p === 'mind', icon: '040_knowledge.svg', ar: 'عقلي', en: 'Mind' },
    { route: '/archive', active: p === 'archive' || p === 'collection', icon: '014_creative.svg', ar: 'المتحف', en: 'Archive' },
    { route: '/lab', active: p === 'game', icon: '039_agents.svg', ar: 'المختبر', en: 'Lab' }
  ];
  return `
    <nav class="mobile-bottom-nav" aria-label="Mobile Navigation">
      ${items.map(it => `
        <a href="${pUrl(it.route)}" data-nav="${it.route}" class="mob-nav-item ${it.active ? 'active' : ''}">
          ${artIco(it.icon, 'art-ico')}
          <span>${isAr ? it.ar : it.en}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

function renderOriginFilter() {
  return `
    <div class="filter-bar">
      ${['all', 'camera', 'ai', 'design'].map(o => `
        <button class="pill-btn ${state.origin === o ? 'active' : ''}" data-origin="${o}" type="button">${t(o)}</button>
      `).join('')}
    </div>
  `;
}

function renderCollectionCard(c) {
  const isAr = state.lang === 'ar';
  const name = isAr ? c.title_ar : c.title_en;
  const desc = isAr ? c.description_ar : c.description_en;
  const medium = isAr ? c.medium_ar : c.medium_en;
  const colWorks = state.works.filter(w => w.collection_id === c.id);
  const displayCount = c.slug === 'photography' ? colWorks.filter(w => w.is_curated !== false).length : colWorks.length;
  const cover = c.cover || (colWorks[0] ? getWorkImg(colWorks[0], '480') : '');
  const metaText = medium ? `${escHtml(medium)} · ${t('worksCount', displayCount)}` : t('worksCount', displayCount);

  return `
    <a href="${pUrl(`/collection/${c.slug}`)}" data-nav="/collection/${escHtml(c.slug)}" class="collection-card">
      <div class="collection-cover">
        ${cover ? `<img src="${escHtml(cover)}" alt="" loading="lazy" />` : ''}
      </div>
      <div class="collection-body">
        <div class="collection-meta">${metaText}</div>
        <div class="collection-name">${escHtml(name)}</div>
        <p class="collection-desc">${escHtml(desc)}</p>
      </div>
    </a>
  `;
}

function renderWorkCard(w) {
  const title = state.lang === 'ar' ? (w.title_ar || w.title_en) : (w.title_en || w.title_ar);
  const imgUrl = getWorkImg(w, '480');
  const srcset = getWorkSrcset(w);
  const blurBg = w.blur_data_url ? `background-image:url('${w.blur_data_url}')` : '';
  return `
    <article class="work-card" data-work-slug="${escHtml(w.slug)}">
      <div class="work-thumb" style="${blurBg}">
        <img
          src="${escHtml(imgUrl)}"
          ${srcset ? `srcset="${escHtml(srcset)}" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"` : ''}
          alt=""
          loading="lazy"
          decoding="async"
          width="${w.width || 480}"
          height="${w.height || 480}"
        />
      </div>
      <div class="work-caption">
        <span class="work-title">${escHtml(title)}</span>
        <span class="work-badge">${t(w.origin)}</span>
      </div>
    </article>
  `;
}

function renderCaseCard(cs) {
  const isAr = state.lang === 'ar';
  const displayTitle = cs.is_anonymized
    ? (isAr ? (cs.anon_title_ar || cs.title_ar) : (cs.anon_title_en || cs.title_en))
    : (isAr ? cs.title_ar : cs.title_en);
  const delivs = isAr ? (cs.deliverables_ar || []) : (cs.deliverables_en || []);
  const evNote = isAr ? cs.evidence_note_ar : cs.evidence_note_en;

  return `
    <article class="case-card">
      ${cs.cover_url ? `<div class="case-cover"><img src="${escHtml(cs.cover_url)}" alt="" loading="lazy" /></div>` : ''}
      <div class="case-body">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="collection-meta">${escHtml(isAr ? cs.sector_ar : cs.sector_en)}</div>
          ${cs.is_illustrative ? `<span class="work-badge">${isAr ? 'سيناريو توضيحي' : 'Illustrative'}</span>` : `<span class="work-badge">${isAr ? 'دليل موثق ✓' : 'Verified Proof ✓'}</span>`}
        </div>
        <h3 style="font-size:1.18rem;font-weight:700;">${escHtml(displayTitle)}</h3>
        <div class="case-pso">
          <div><strong>${isAr ? 'المشكلة:' : 'Problem:'}</strong> ${escHtml(isAr ? cs.problem_ar : cs.problem_en)}</div>
          <div><strong>${isAr ? 'الحل المعماري:' : 'Architecture:'}</strong> ${escHtml(isAr ? cs.solution_ar : cs.solution_en)}</div>
          <div><strong>${isAr ? 'المخرج الموثق:' : 'Verified Outcome:'}</strong> ${escHtml(isAr ? cs.outcome_ar : cs.outcome_en)}</div>
        </div>
        ${delivs.length ? `
          <ul class="offer-list" style="margin-top:6px;">
            ${delivs.slice(0, 4).map(d => `<li><span>•</span><span>${escHtml(d)}</span></li>`).join('')}
          </ul>
        ` : ''}
        ${evNote ? `<div style="font-size:0.76rem;color:var(--muted);padding-top:6px;border-top:1px dashed var(--border);">${escHtml(evNote)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:10px;">
          ${cs.collection_slug && !cs.is_anonymized ? `<a href="${pUrl(`/collection/${cs.collection_slug}`)}" data-nav="/collection/${escHtml(cs.collection_slug)}" class="pill-btn active">${isAr ? 'معاينة الهوية داخل التطبيق' : 'View System In-App'}</a>` : ''}
          ${cs.external_url ? `<a href="${escHtml(cs.external_url)}" target="_blank" rel="noopener" class="pill-btn">${t('openExternal')}</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

function renderTrustSignatures() {
  const isAr = state.lang === 'ar';
  return `
    <section class="section-block container">
      <div class="contact-grid">
        <div class="about-card">
          <span class="section-kicker">${isAr ? 'ميثاق الصدق التشغيلي' : 'OPERATIONAL INTEGRITY PACT'}</span>
          <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:12px;">${isAr ? 'ما لا نفعله في Artelligence' : 'What We Never Do at Artelligence'}</h2>
          <ul class="offer-list">
            <li><span>✕</span><span>${isAr ? 'لا نؤلف أرقام عائد مالي أو قصص عملاء غير موثقة بملفات حقيقية.' : 'We never fabricate ROI figures or unverified client claims.'}</span></li>
            <li><span>✕</span><span>${isAr ? 'لا نبيع اشتراكات أدوات ذكاء اصطناعي معقدة لا يحتاجها فريقك.' : 'We never push bloated AI tool stacks your team does not need.'}</span></li>
            <li><span>✕</span><span>${isAr ? 'لا نطلب التزاماً شهرياً طويلاً قبل إثبات تحسن خط الأساس في أول 30 يوماً.' : 'We never lock clients into long retainers before proving 30-day baseline impact.'}</span></li>
            <li><span>✕</span><span>${isAr ? 'لا نستبدل الفريق البشري ببوت أصم؛ المساعد الذكي يؤهّل الطلب ويحوّله لفريقك فوراً.' : 'We never trap buyers in robotic loops; our assistant qualifies and hands off to humans.'}</span></li>
          </ul>
        </div>

        <div class="about-card">
          <span class="section-kicker">${isAr ? 'من وراء هذه المنصة؟' : 'WHO BUILT THIS PLATFORM?'}</span>
          <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:10px;">${isAr ? 'أحمد عصام رمضان · مؤسس Artelligence' : 'Ahmed Issam Ramadan · Founder of Artelligence'}</h2>
          <p style="font-size:0.9rem;color:var(--muted);margin-bottom:12px;">
            ${isAr
              ? 'درست الحقوق في جامعة الزقازيق (دفعة 2022)، ولم أمارس المحاماة يوماً. علّمت نفسي التصميم والبرمجة وهندسة قواعد البيانات وأتمتة الذكاء الاصطناعي بالتطبيق العملي المباشر وبناء منتجات وأنظمة تعمل فعلياً على أرض الواقع.'
              : 'Graduated with an LL.B. from Zagazig University (2022) and never practiced law. Self-taught across UI/UX, full-stack engineering, databases, and AI workflow automation by shipping real systems.'}
          </p>
          <p style="font-size:0.84rem;color:var(--muted);">
            <strong>Business First. AI Where It Matters. Results Always.</strong>
          </p>
        </div>
      </div>
    </section>
  `;
}

function renderContactSection() {
  const isAr = state.lang === 'ar';
  return `
    <section id="contact" class="section-block container">
      <div class="section-head">
        <div>
          <span class="section-kicker">${isAr ? 'قنوات التواصل المباشر' : 'DIRECT CHANNELS'}</span>
          <h2 class="section-title">${isAr ? 'احجز مكالمة 15 دقيقة أو أرسل تفاصيل مشروعك مباشرة' : 'Book a 15-Min Call or Send Your Brief Directly'}</h2>
        </div>
      </div>
      <div class="contact-grid">
        <div class="about-card">
          <h3 style="font-size:1.1rem;margin-bottom:10px;">${isAr ? 'التواصل المباشر مع أحمد عصام رمضان' : 'Direct Verified Channels'}</h3>
          <p style="color:var(--muted);font-size:0.9rem;margin-bottom:16px;">
            ${isAr ? 'مستشار تحوّل الأعمال ودمج الذكاء الاصطناعي · مؤسس Artelligence. للتعاقدات في مصر والخليج والشراكات التقنية.' : 'Business Transformation & AI Integration Consultant · Founder of Artelligence. Serving Egypt & GCC.'}
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:0.9rem;margin-bottom:18px;">
            <div><strong>Email:</strong> <a href="mailto:ahmedissam.work@gmail.com" style="text-decoration:underline;">ahmedissam.work@gmail.com</a></div>
            <div><strong>WhatsApp (15m Call):</strong> <a href="https://wa.me/201501656010" target="_blank" rel="noopener" style="text-decoration:underline;" dir="ltr">+20 150 165 6010</a></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="${isAr ? 'https://wa.me/201501656010?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20%D8%A3%D8%AD%D8%AC%D8%B2%20%D9%85%D9%83%D8%A7%D9%84%D9%85%D8%A9%2015%20%D8%AF%D9%82%D9%8A%D9%82%D8%A9.' : 'https://wa.me/201501656010?text=Hi%20Ahmed%2C%20I%27d%20like%20to%20book%20a%2015-min%20call.'}" target="_blank" rel="noopener" class="pill-btn active">WhatsApp · 15m Call ↗</a>
            <a href="https://www.linkedin.com/in/ahmdesam96" target="_blank" rel="noopener" class="pill-btn">LinkedIn ↗</a>
            <a href="https://www.instagram.com/ahmdesam96" target="_blank" rel="noopener" class="pill-btn">Instagram ↗</a>
            <a href="https://github.com/ahmedissamramadan/visuals-android/releases/download/v2.0.18/Artelligence.apk" target="_blank" rel="noopener" class="pill-btn">${isAr ? 'تطبيق الأندرويد ↓' : 'Android App ↓'}</a>
          </div>
        </div>
        <div class="about-card">
          <h3 style="font-size:1.1rem;margin-bottom:12px;">${isAr ? 'رسالة فورية إلى مركز القيادة' : 'Instant Message to Command Studio'}</h3>
          <form id="inquiry-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="inq-name" class="input" type="text" placeholder="${isAr ? 'الاسم الكريم' : 'Your Name'}" required />
            <input id="inq-contact" class="input" type="text" placeholder="${isAr ? 'رقم الواتساب أو البريد الإلكتروني' : 'WhatsApp or Email'}" required />
            <textarea id="inq-msg" class="input" rows="3" placeholder="${isAr ? 'ما النظام الذي تود بناءه أو المشكلة اليومية التي تريد حلها؟' : 'What daily bottleneck or system would you like to solve?'}" required></textarea>
            <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? 'إرسال الرسالة الآن' : 'Send Direct Message'}</button>
            ${state.inquiryStatus ? `<div style="font-size:0.85rem;color:#10B981;font-weight:600;">${escHtml(state.inquiryStatus)}</div>` : ''}
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderHome() {
  const isAr = state.lang === 'ar';
  const q = state.searchQuery.trim().toLowerCase();
  const filteredWorks = q
    ? state.works.filter(w =>
        (state.origin === 'all' || w.origin === state.origin) &&
        (`${w.title_ar} ${w.title_en} ${(w.themes || []).join(' ')}`.toLowerCase().includes(q))
      )
    : state.origin === 'all'
      ? []
      : state.works.filter(w => w.origin === state.origin);

  const clientCols = state.collections.filter(c => c.category === 'client');
  const camSample = state.works.find(w => w.origin === 'camera');
  const aiSample = state.works.find(w => w.origin === 'ai');

  return `
    <!-- 01 · Command Home & Audience Compass -->
    <section class="hero container">
      <div class="hero-grid">
        <div>
          <span class="hero-badge"><span class="hero-badge-dot"></span><span>${t('availBadge')}</span></span>
          <h1 class="hero-title">${t('heroTitle')}</h1>
          <p class="hero-sub">${t('heroSub')}</p>
          <div class="hero-cta-row">
            <a href="${pUrl('/solutions')}" data-nav="/solutions" class="pill-btn active">${t('exploreSolutions')}</a>
            <a href="${pUrl('/proof')}" data-nav="/proof" class="pill-btn">${t('exploreProof')}</a>
            <a href="${pUrl('/mind')}" data-nav="/mind" class="pill-btn">${t('openMind')}</a>
          </div>
          <div style="max-width:480px;margin-bottom:14px;">
            <input id="global-search" class="input" type="search" placeholder="${isAr ? 'ابحث في الأنظمة، دراسات الحالة، والأعمال البصرية...' : 'Search systems, case studies & visual works...'}" value="${escHtml(state.searchQuery)}" />
          </div>
          ${renderOriginFilter()}
        </div>
        <div class="hero-portrait-card">
          <img src="${HEADSHOT_URL}" alt="${t('brand')}" class="hero-portrait-img" />
          <div style="font-size:0.86rem;color:var(--muted);">
            <strong style="color:var(--text);display:block;margin-bottom:2px;">${t('brand')} · Artelligence</strong>
            ${isAr ? 'ليسانس حقوق (2022) · باني أنظمة ذكاء اصطناعي ومنتجات رقمية وهويات بصرية بالتطبيق العملي.' : 'LL.B. (2022) · Self-taught AI systems architect, full-stack builder & visual director.'}
          </div>
        </div>
      </div>

      <!-- 3-Way Audience Compass (Figma Icon System v2) -->
      <div class="audience-grid" style="margin-top:32px;">
        <a href="${pUrl('/solutions')}" data-nav="/solutions" class="audience-card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            ${artIco('013_automation.svg', 'art-ico-lg')}
            <div class="collection-meta">PATH 01 · ${isAr ? 'لأصحاب المصانع وشركات التشطيب والـ SMEs' : 'FOR FACTORIES, FINISHING & SMES'}</div>
          </div>
          <h3>${isAr ? 'سُلّم الحلول وتأسيس Growth OS' : 'ABTI & Growth OS Solutions'}</h3>
          <p>${isAr ? 'احصل على فيديو تشريح مجاني لحسابك في دقيقتين واكتشف كيف يعمل الرد والكتالوج والمحتوى لوحده.' : 'Get a free 2-minute video teardown and deploy autonomous catalog & WhatsApp systems.'}</p>
        </a>
        <a href="${pUrl(`/${state.lang}/proof/`)}" data-nav="/${state.lang}/proof/" class="audience-card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            ${artIco('017_work.svg', 'art-ico-lg')}
            <div class="collection-meta">${isAr ? 'لشركاء الأعمال وجهات الاستثمار والتوظيف' : 'FOR PARTNERS, INVESTORS & TEAMS'}</div>
          </div>
          <h3>${isAr ? 'خزينة الأدلة ودراسات الحالة' : 'Proof Vault & Case Studies'}</h3>
          <p>${isAr ? 'أنظمة حية: WASL Network، محرك النشر التلقائي لـ 92 ريل، ومحرك المحتوى المستمر.' : 'Live systems: WASL Network, the 92-reel publishing engine, and our always-on content engine.'}</p>
        </a>
        <a href="${pUrl('/archive')}" data-nav="/archive" class="audience-card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
            ${artIco('014_creative.svg', 'art-ico-lg')}
            <div class="collection-meta">PATH 03 · ${isAr ? 'للمبدعين والمهتمين بالفكر والفن البصري' : 'FOR CREATORS & VISUAL EXPLORERS'}</div>
          </div>
          <h3>${isAr ? 'داخل عقلي والمتحف البصري ومختبر الأيقونات' : 'Mind, Visual Archive & 216-Icon Lab'}</h3>
          <p>${isAr ? 'هرم النضج في الذكاء الاصطناعي، 60 لوحة في الإنسان والآلة، الفوتوغرافيا، ومكتبة 216 أيقونة هندسية.' : 'AI Maturity Pyramid, 60 Human x Machine plates, curated photography, and 216 geometric icons.'}</p>
        </a>
      </div>
    </section>

    ${(state.origin !== 'all' || q) ? `
      <section class="section-block container">
        <div class="masonry-grid">
          ${filteredWorks.length ? filteredWorks.map(renderWorkCard).join('') : `<p style="color:var(--muted)">${t('noWorks')}</p>`}
        </div>
      </section>
    ` : `
      <!-- 02 · Solutions Ladder Preview -->
      <section class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">02 · ${isAr ? 'سُلّم واحد واضح لتحوّل الأعمال' : 'UNIFIED SERVICE LADDER'}</span>
            <h2 class="section-title">${isAr ? 'من فيديو التشريح المجاني إلى نظام Growth OS المتكامل' : 'From Free 2-Min Teardown to Full Growth OS'}</h2>
          </div>
          <a href="${pUrl('/solutions')}" data-nav="/solutions" class="pill-btn active">${isAr ? 'افتح الحاسبة واطلب التشريح' : 'Open Calculator & Teardown'}</a>
        </div>
        <div class="offers-grid">
          ${(state.servicesOffers || []).map((off, idx) => `
            <article class="offer-card ${idx === 0 || idx === 2 ? 'offer-featured' : ''}">
              <div class="collection-meta">${escHtml(isAr ? off.badge_ar : off.badge_en)}</div>
              <h3 style="font-size:1.08rem;font-weight:700;margin:6px 0;">${escHtml(isAr ? off.title_ar : off.title_en)}</h3>
              <div class="offer-price" style="font-size:1.1rem;">${escHtml(isAr ? off.price_egp_label : off.price_usd_label)}</div>
              <p style="font-size:0.84rem;color:var(--muted);">${escHtml(isAr ? off.subtitle_ar : off.subtitle_en)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- 03 · Verified Proof & Client Systems -->
      <section id="client-work" class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">03 · ${isAr ? 'أدلة حقيقية وشغل موثق' : 'VERIFIED EVIDENCE VAULT'}</span>
            <h2 class="section-title">${isAr ? 'دراسات الحالة والأنظمة المبنية فعلياً' : 'Verified Case Studies & Brand Systems'}</h2>
          </div>
          <a href="${pUrl('/proof')}" data-nav="/proof" class="pill-btn">${isAr ? 'كل الأدلة ودراسات الحالة' : 'All Case Studies'}</a>
        </div>
        <div class="case-grid" style="margin-bottom:28px;">
          ${state.caseStudies.filter(c => !c.is_illustrative).slice(0, 3).map(renderCaseCard).join('')}
        </div>
        <div class="collections-grid">
          ${clientCols.map(renderCollectionCard).join('')}
        </div>
      </section>

      <!-- 04 · Inside My Mind Preview -->
      <section class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">04 · ${isAr ? 'كيف أفكر وما أبنيه الآن' : 'LIVE MIND & AI PYRAMID'}</span>
            <h2 class="section-title">${isAr ? 'داخل عقلي والتركيز الحي' : 'Inside My Mind & Operating Principles'}</h2>
          </div>
          <a href="${pUrl('/mind')}" data-nav="/mind" class="pill-btn">${isAr ? 'افتح عقلي وهرم الذكاء الاصطناعي' : 'Open Mind & AI Pyramid'}</a>
        </div>
        <div class="mind-grid">
          ${state.mindNotes.slice(0, 4).map(n => `
            <article class="mind-card">
              <div class="collection-meta">${escHtml(n.category.toUpperCase())}</div>
              <h3 style="font-size:1.05rem;font-weight:700;">${escHtml(isAr ? n.title_ar : n.title_en)}</h3>
              <p style="font-size:0.87rem;color:var(--muted);">${escHtml(isAr ? n.body_ar : n.body_en)}</p>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- 07 · Interactive Lab Banner -->
      <section class="section-block container">
        <div class="game-banner">
          <div style="flex:1;min-width:260px;">
            <span class="section-kicker">07 · ${isAr ? 'المختبر التفاعلي' : 'INTERACTIVE LAB'}</span>
            <h2 class="section-title" style="margin-bottom:10px;">${isAr ? 'تحدي «إنسان أم آلة؟» + فحص جاهزية شركتك للأتمتة' : 'Human or AI? Challenge + 2-Min SME Readiness Check'}</h2>
            <p style="color:var(--muted);margin-bottom:18px;max-width:560px;">
              ${isAr ? 'اختبر عينك في 10 جولات بين تصوير الكاميرا والذكاء الاصطناعي، أو افحص جاهزية نظام مبيعات شركتك في دقيقتين.' : 'Test your eye across 10 camera vs. AI rounds, or diagnose your company sales readiness in 2 minutes.'}
            </p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <a href="${pUrl('/lab')}" data-nav="/lab" class="pill-btn active">${isAr ? 'ادخل المختبر التفاعلي' : 'Enter Interactive Lab'}</a>
              <a href="${pUrl('/archive')}" data-nav="/archive" class="pill-btn">${isAr ? 'استعرض المتحف البصري الكامل' : 'Explore Full Visual Archive'}</a>
            </div>
          </div>
          <div style="display:flex;gap:12px;">
            ${camSample ? `<img src="${escHtml(getWorkImg(camSample, '480'))}" alt="" style="width:116px;height:146px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" loading="lazy" />` : ''}
            ${aiSample ? `<img src="${escHtml(getWorkImg(aiSample, '480'))}" alt="" style="width:116px;height:146px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" loading="lazy" />` : ''}
          </div>
        </div>
      </section>

      ${renderTrustSignatures()}
    `}

    ${renderContactSection()}
  `;
}

function renderArchivePage() {
  const isAr = state.lang === 'ar';
  const clientCols = state.collections.filter(c => c.category === 'client');
  const personalCols = state.collections.filter(c => c.category === 'personal');
  const eduCols = state.collections.filter(c => c.category === 'educational');

  return `
    <section class="container" style="padding:40px 24px 72px;">
      <span class="section-kicker">05 · ${isAr ? 'المتحف البصري ومختبر الهوية' : 'ARTELLIGENCE VISUAL ARCHIVE & ICON LAB'}</span>
      <h1 class="hero-title">${isAr ? 'الهويات التجارية، الفوتوغرافيا، ولوحات الإنسان والآلة' : 'Client Identities, Curated Photography & AI Plates'}</h1>
      <p class="hero-sub">${isAr ? 'مقسمة بوضوح بين أعمال العملاء، الاستكشافات البصرية والفوتوغرافية، السلاسل النفسية، ونظام الـ 216 أيقونة الهندسية.' : 'Structured across Client Systems, Personal Camera & AI Explorations, Visual Psychology, and the 216-Icon Geometric Lab.'}</p>

      <div class="section-head" style="margin-top:28px;">
        <h2 class="section-title">${isAr ? 'أعمال وهويات العملاء' : 'Client Brand Systems'}</h2>
      </div>
      <div class="collections-grid">${clientCols.map(renderCollectionCard).join('')}</div>

      <div class="section-head" style="margin-top:28px;">
        <h2 class="section-title">${isAr ? 'الاستكشافات الفنية والفوتوغرافيا' : 'Personal Camera & AI Explorations'}</h2>
      </div>
      <div class="collections-grid">${personalCols.map(renderCollectionCard).join('')}</div>

      <div class="section-head" style="margin-top:28px;">
        <h2 class="section-title">${isAr ? 'السلاسل النفسية والتوعوية' : 'Visual Psychology & Educational Series'}</h2>
      </div>
      <div class="collections-grid">${eduCols.map(renderCollectionCard).join('')}</div>

      ${renderIconSystemLab(isAr)}
    </section>
  `;
}

function renderMindPage() {
  const isAr = state.lang === 'ar';
  const stages = [
    { img: 'Artelligence_01_Point.svg', ar: '01 · النقطة (Point)', en: '01 · Point', descAr: 'الأصل والتركيز. كل نظام يبدأ من نقطة حقيقية واحدة.', descEn: 'Origin and focus before any tool.' },
    { img: 'Artelligence_02_Stroke.svg', ar: '02 · الضربة 56.9° (Stroke)', en: '02 · Stroke 56.9°', descAr: 'الحركة والنية البشرية الموجهة بزاوية 56.9 درجة.', descEn: 'Human direction at a 56.9° trajectory.' },
    { img: 'Artelligence_03_Form.svg', ar: '03 · الشكل Ø22mm (Form)', en: '03 · Form Ø22mm', descAr: 'الإبداع حين يتحول لنظام هندسي على شبكة 48px.', descEn: 'Creativity structured on a 48px grid.' },
    { img: 'Artelligence_04_Symbol.svg', ar: '04 · الرمز (Symbol)', en: '04 · Symbol', descAr: 'التناغم النهائي بين الفن والذكاء الاصطناعي والأثر.', descEn: 'Harmony between Art, Intelligence, and Impact.' }
  ];

  return `
    <section class="container" style="padding:40px 24px 64px;">
      <span class="section-kicker">04 · ${isAr ? 'العقل الحي والهرم المعرفي' : 'INSIDE MY MIND & AI MATURITY PYRAMID'}</span>
      <h1 class="hero-title">${isAr ? 'داخل عقلي ومنظومة تفكير Artelligence' : 'Inside My Mind & Artelligence Operating Philosophy'}</h1>
      <p class="hero-sub">${isAr ? 'مبادئ العمل، التفكيك البعدي، هرم النضج في الذكاء الاصطناعي، والتركيز الحالي متزامنة مباشرة مع قاعدة البيانات.' : 'Operating principles, post-mortem skill engineering, the AI Maturity Pyramid, and live focus synced from Supabase.'}</p>

      <div class="mind-grid" style="margin-bottom:36px;">
        ${state.mindNotes.map(n => `
          <article class="mind-card">
            <div class="collection-meta">${escHtml(n.category.toUpperCase())}</div>
            <h2 style="font-size:1.1rem;font-weight:700;">${escHtml(isAr ? n.title_ar : n.title_en)}</h2>
            <p style="font-size:0.9rem;color:var(--muted);">${escHtml(isAr ? n.body_ar : n.body_en)}</p>
          </article>
        `).join('')}
      </div>

      ${renderPyramidSection(isAr)}

      <h2 class="section-title" style="margin-bottom:12px;">${isAr ? 'الفلسفة الهندسية لبناء Artelligence (النقطة <- الرمز)' : '4-Stage Geometric Philosophy (Point -> Symbol)'}</h2>
      <div class="geometry-grid" style="margin-bottom:36px;">
        ${stages.map(s => `
          <div class="geometry-card">
            <img src="${pUrl(`/dna/logos/${s.img}`)}" alt="" />
            <strong>${isAr ? s.ar : s.en}</strong>
            <span style="font-size:0.82rem;color:var(--muted);">${isAr ? s.descAr : s.descEn}</span>
          </div>
        `).join('')}
      </div>

      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:10px;">${isAr ? 'الستاك التقني والخلفية الموثقة' : 'Verified Tech Stack & Background'}</h2>
        <p style="color:var(--muted);font-size:0.9rem;margin-bottom:10px;">
          <strong>UI/UX:</strong> Figma, Stitch, Anima · <strong>Frontend:</strong> HTML, CSS, Tailwind CSS, JavaScript, TypeScript, React, Next.js · <strong>Mobile & Desktop:</strong> Kotlin, Jetpack Compose, Electron macOS · <strong>Backend & Automation:</strong> Node.js, Python, SQLite, Supabase PostgreSQL, n8n, Make.com, Official WhatsApp Business API.
        </p>
        <p style="color:var(--muted);font-size:0.86rem;">
          ${isAr ? 'التعليم: ليسانس الحقوق - جامعة الزقازيق (2022)، بدون ممارسة للمحاماة، وتعلّم ذاتي تطبيقي كامل في التقنية · الشهادات المكتملة من ALX: AI Career Essentials (AiCE) و Project Management Crash Course.' : 'Education: Bachelor of Laws (LL.B.), Zagazig University (2022), never practiced law; 100% self-taught in software & AI systems · Earned ALX Certificates: AI Career Essentials (AiCE) & Project Management Crash Course.'}
        </p>
      </div>
    </section>
    ${renderContactSection()}
  `;
}

function renderCasesPage() {
  return `${renderProofVaultPage(state, pUrl)}${renderContactSection()}`;
}

function renderCollection(slug) {
  const isAr = state.lang === 'ar';
  const col = state.collections.find(c => c.slug === slug);
  if (!col) return `<div class="container" style="padding:60px 24px"><a href="${pUrl('/archive')}" data-nav="/archive" class="pill-btn">${t('backHome')}</a></div>`;

  let works = state.works.filter(w => w.collection_id === col.id);

  if (slug === 'photography' && !state.showFullPhotoArchive) {
    works = works.filter(w => w.is_curated !== false);
  }
  if ((slug === 'photography' || slug === 'human-machine') && state.chapter !== 'all') {
    works = works.filter(w => w.chapter === state.chapter);
  } else if (state.origin !== 'all') {
    works = works.filter(w => w.origin === state.origin);
  }

  const name = isAr ? col.title_ar : col.title_en;
  const desc = isAr ? col.description_ar : col.description_en;
  const chapters = slug === 'human-machine' ? HM_CHAPTERS : slug === 'photography' ? PHOTO_CHAPTERS : null;

  return `
    <section class="container" style="padding-top:36px;">
      <div style="margin-bottom:20px;">
        <a href="${pUrl('/archive')}" data-nav="/archive" class="pill-btn">← ${isAr ? 'العودة للمتحف البصري' : 'Back to Visual Archive'}</a>
      </div>
      <div class="section-head" style="flex-direction:column;gap:8px;margin-bottom:24px;">
        <span class="section-kicker">${escHtml(isAr ? col.medium_ar : col.medium_en)}</span>
        <h1 class="hero-title" style="font-size:clamp(1.9rem,4vw,2.8rem);margin:0;">${escHtml(name)}</h1>
        <p style="color:var(--muted);max-width:680px;">${escHtml(desc)}</p>
      </div>

      ${slug === 'photography' ? `
        <div style="margin-bottom:16px;">
          <button id="toggle-photo-archive" class="pill-btn ${state.showFullPhotoArchive ? 'active' : ''}" type="button">
            ${state.showFullPhotoArchive
              ? (isAr ? 'العودة للمختارات المنتقاة (36 صورة)' : 'Show 36 Curated Selection')
              : (isAr ? 'عرض الأرشيف الكامل للكاميرا (217 صورة)' : 'Open Full Camera Archive (217)')}
          </button>
        </div>
      ` : ''}

      ${chapters ? `
        <div class="filter-bar">
          ${chapters.map(ch => `
            <button class="pill-btn ${state.chapter === ch.key ? 'active' : ''}" data-chapter="${ch.key}" type="button">
              ${isAr ? ch.ar : ch.en}
            </button>
          `).join('')}
        </div>
      ` : renderOriginFilter()}

      <div class="masonry-grid">
        ${works.length ? works.map(renderWorkCard).join('') : `<p style="color:var(--muted)">${t('noWorks')}</p>`}
      </div>
    </section>
  `;
}

function renderLightbox() {
  const w = state.activeWork;
  if (!w) return '';
  const title = state.lang === 'ar' ? (w.title_ar || w.title_en) : (w.title_en || w.title_ar);
  const fullImg = getWorkImg(w, '1200');

  return `
    <div id="lightbox" class="lightbox-backdrop">
      <div class="lightbox-shell">
        <div class="lightbox-media">
          <img src="${escHtml(fullImg)}" alt="${escHtml(title)}" />
        </div>
        <div class="lightbox-side">
          <div class="lightbox-top">
            <div>
              <h2 style="font-size:1.22rem;font-weight:700;">${escHtml(title)}</h2>
              <span class="work-badge">${t(w.origin)}</span>
            </div>
            <button id="lb-close" class="pill-btn" type="button">✕</button>
          </div>

          <div class="lightbox-actions">
            ${REACTION_TYPES.map(rt => {
              const key = `${w.id}:${rt.key}`;
              const cnt = state.reactions.get(key) || 0;
              const active = state.userReactions.has(key);
              const label = state.lang === 'ar' ? rt.labelAr : rt.labelEn;
              return `
                <button class="pill-btn lb-react-btn ${active ? 'active' : ''}" data-rtype="${rt.key}" type="button">
                  <span>${label}</span>
                  ${cnt > 0 ? `<span style="font-weight:700">${cnt}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div class="lightbox-actions">
            <button id="lb-share" class="pill-btn" type="button">${t('copyLink')}</button>
            <button id="lb-story" class="pill-btn" type="button">${t('exportStory')}</button>
            ${w.external_url ? `<a href="${escHtml(w.external_url)}" target="_blank" rel="noopener" class="pill-btn active">${t('openExternal')}</a>` : ''}
          </div>

          <div style="font-size:0.84rem;color:var(--muted);margin-top:4px;">${t('comments')} (${state.activeComments.length})</div>
          <div class="comments-list">
            ${state.activeComments.map(c => `
              <div class="comment-item">
                <div class="comment-author">${escHtml(c.profiles?.display_name || 'Visitor')}</div>
                <div>${escHtml(c.body)}</div>
              </div>
            `).join('')}
          </div>

          <form id="lb-comment-form" class="comment-form">
            <input id="lb-comment-input" class="input" type="text" placeholder="${t('commentPlaceholder')}" maxlength="500" />
            <button class="pill-btn active" type="submit">${t('send')}</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  const isAr = state.lang === 'ar';
  return `
    <footer class="site-footer">
      <div class="container">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <span style="width:12px;height:12px;border-radius:50%;background:var(--accent);display:inline-block;"></span>
          <span style="font-size:0.82rem;color:var(--text);">
            ${isAr ? 'فن · ذكاء · أثر' : 'ART • INTELLIGENCE • IMPACT'}
          </span>
        </div>

        <div class="eco-links">
          <a href="${pUrl('/solutions')}" data-nav="/solutions" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">${isAr ? 'سُلّم Growth OS' : 'Growth OS Ladder'}</a>
          <a href="${pUrl('/proof')}" data-nav="/proof" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">${isAr ? 'خزينة الأدلة' : 'Proof Vault'}</a>
          <a href="${pUrl('/academy')}" data-nav="/academy" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">${isAr ? 'تحميل تطبيق الأندرويد' : 'Android App'}</a>
          <a href="https://wasl-network.com" target="_blank" rel="noopener" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">WASL Network ↗</a>
          <a href="https://ahmedissamramadan.github.io/chronicle-2026/" target="_blank" rel="noopener" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">2026 Chronicle ↗</a>
        </div>

        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:center;">
          <span>${isAr ? '© 2026 أحمد عصام رمضان · مؤسس Artelligence · جميع الحقوق محفوظة' : '© 2026 Ahmed Issam Ramadan · Founder of Artelligence'}</span>
          <a href="${pUrl('/studio')}" data-nav="/studio" style="color:var(--muted);">${isAr ? 'مركز القيادة (Admin Studio)' : 'Command Studio'}</a>
        </div>
      </div>
    </footer>
  `;
}

function render() {
  const app = document.getElementById('app');
  let mainHtml = '';
  const page = state.route.page;

  if (page === 'collection') mainHtml = renderCollection(state.route.slug);
  else if (page === 'solutions') mainHtml = renderSolutionsPage(state);
  else if (page === 'mind') mainHtml = renderMindPage();
  else if (page === 'cases') mainHtml = renderCasesPage();
  else if (page === 'archive') mainHtml = renderArchivePage();
  else if (page === 'academy') mainHtml = renderAcademyPage(state);
  else if (page === 'contact') mainHtml = renderContactSection();
  else if (page === 'game') mainHtml = '<div id="game-root"></div>';
  else if (page === 'admin') mainHtml = '<div id="admin-root"></div>';
  else mainHtml = renderHome();

  app.innerHTML = `${renderHeader()}<main style="padding-bottom:68px;">${mainHtml}</main>${renderFooter()}${renderMobileBottomNav()}${renderLightbox()}`;

  if (page === 'admin') renderAdminPage(document.getElementById('admin-root'), state, loadData);
  if (page === 'game') renderGamePage(document.getElementById('game-root'), state, navigate);
  if (page === 'solutions') bindSolutionsEvents(state, render);
  if (page === 'mind') bindPyramidEvents(render);
  if (page === 'archive') bindIconLabEvents(render);

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.nav);
    });
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('artelligence_lang', state.lang);
    applyThemeAndLang();
    if (state.route.page === 'cases') {
      window.history.replaceState(null, '', pUrl(`/${state.lang}/proof/`));
    }
    render();
  });

  document.querySelectorAll('[data-theme-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.theme = btn.dataset.themePick;
      localStorage.setItem('artelligence_theme', state.theme);
      applyThemeAndLang();
      render();
    });
  });

  document.getElementById('global-search')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    render();
    const inp = document.getElementById('global-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  });

  document.querySelectorAll('[data-origin]').forEach(btn => {
    btn.addEventListener('click', () => { state.origin = btn.dataset.origin; render(); });
  });

  document.querySelectorAll('[data-chapter]').forEach(btn => {
    btn.addEventListener('click', () => { state.chapter = btn.dataset.chapter; render(); });
  });

  document.getElementById('toggle-photo-archive')?.addEventListener('click', () => {
    state.showFullPhotoArchive = !state.showFullPhotoArchive;
    state.chapter = 'all';
    render();
  });

  document.querySelectorAll('[data-work-slug]').forEach(card => {
    card.addEventListener('click', () => {
      const work = state.works.find(w => w.slug === card.dataset.workSlug);
      if (work) openWork(work);
    });
  });

  document.getElementById('inquiry-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('inq-name').value.trim();
    const contact = document.getElementById('inq-contact').value.trim();
    const msg = document.getElementById('inq-msg').value.trim();
    if (!name || !contact || !msg) return;
    const { error } = await supabase.from('inquiries').insert({ sender_name: name, sender_contact: contact, message: msg });
    if (error) {
      state.inquiryStatus = error.message;
    } else {
      notifyLeadAlert('direct_inquiry', { sender_name: name, sender_contact: contact, message: msg });
      state.inquiryStatus = state.lang === 'ar'
        ? 'تم استلام رسالتك في مركز القيادة بنجاح! سأتواصل معك قريباً.'
        : 'Brief received in Command Studio! I will reach out shortly.';
    }
    render();
  });

  document.getElementById('lb-close')?.addEventListener('click', closeWork);
  document.getElementById('lightbox')?.addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeWork(); });
  document.querySelectorAll('.lb-react-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(state.activeWork.id, btn.dataset.rtype));
  });
  document.getElementById('lb-share')?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(window.location.href);
    e.currentTarget.textContent = t('copied');
  });
  document.getElementById('lb-story')?.addEventListener('click', () => generateStoryCard(state.activeWork));
  document.getElementById('lb-comment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('lb-comment-input');
    const text = input.value;
    input.value = '';
    await submitComment(state.activeWork.id, text);
  });
}

window.addEventListener('popstate', () => {
  state.route = parseRoute();
  if (state.route.page === 'work') {
    const found = state.works.find(w => w.slug === state.route.slug);
    if (found) openWork(found, false);
  } else {
    state.activeWork = null;
    if (state.route.page === 'archive') ensureIconsCatalog().then(() => render());
    else render();
  }
});

document.addEventListener('keydown', (e) => {
  if (!state.activeWork) return;
  if (e.key === 'Escape') { closeWork(); return; }
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const idx = state.works.findIndex(w => w.id === state.activeWork.id);
    if (idx === -1) return;
    const next = state.works[(idx + (e.key === 'ArrowRight' ? 1 : -1) + state.works.length) % state.works.length];
    if (next) openWork(next);
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(pUrl('/sw.js')).catch(() => {}));
}

applyThemeAndLang();
ensureAuthSession().then(() => {
  loadData();
  subscribeRealtime();
});
