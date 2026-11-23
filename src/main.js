import './styles/main.css';
import { supabase, ensureAuthSession, getSavedProfile, saveVisitorProfile } from './lib/supabase.js';
import { renderAdminPage } from './admin.js';
import { renderGamePage } from './game.js';

const BASE = '/visuals';
const HEADSHOT_URL = 'https://owlglaqltdniywcprzab.supabase.co/storage/v1/object/public/visuals/brand/ahmed-headshot-480.webp';

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

// Convert legacy #/... URLs to clean History API URLs
if (window.location.hash.startsWith('#/')) {
  const cleanSub = window.location.hash.slice(1);
  window.history.replaceState(null, '', `${BASE}${cleanSub}`);
}

const state = {
  lang: localStorage.getItem('ahmed_visuals_lang') || 'ar',
  theme: localStorage.getItem('ahmed_visuals_theme') || 'dark',
  origin: 'all',
  chapter: 'all',
  showFullPhotoArchive: false,
  searchQuery: '',
  collections: [],
  works: [],
  caseStudies: [],
  mindNotes: [],
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
    cases: 'Case Studies',
    mind: 'Inside My Mind',
    game: 'Human or AI?',
    bookCall: 'Book 15m Call',
    availBadge: 'Available for SME AI & Brand Systems',
    heroTitle: 'Turning messy daily operations into simple autonomous systems.',
    heroSub: 'AI Business Transformation & Integration Consultant · Founder of Artelligence. One living home for my client case studies, live thinking, and visual explorations.',
    exploreWork: 'Explore Client Work',
    openMind: 'Enter My Mind',
    all: 'All',
    camera: '📷 Camera',
    ai: '✨ AI',
    design: '🎨 Design',
    worksCount: (n) => `${n} works`,
    backHome: '← Back to Home',
    openExternal: 'Open Live ↗',
    copyLink: 'Share Link',
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
    cases: 'دراسات الحالة',
    mind: 'داخل عقلي',
    game: 'إنسان أم آلة؟',
    bookCall: 'احجز مكالمة 15 د',
    availBadge: 'متاح للاستشارات وبناء أنظمة الذكاء الاصطناعي والهوية',
    heroTitle: 'أحوّل الشغل اليومي المتلخبط لأنظمة بسيطة تشتغل لوحدها.',
    heroSub: 'مستشار تحول الأعمال ودمج الذكاء الاصطناعي · مؤسس Artelligence. بيت واحد حي يجمع دراسات الحالة لعملائي، طريقة تفكيري، ومكتبتي البصرية.',
    exploreWork: 'شاهد شغل العملاء',
    openMind: 'ادخل عقلي',
    all: 'الكل',
    camera: '📷 كاميرا',
    ai: '✨ ذكاء اصطناعي',
    design: '🎨 تصميم',
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
  if (path.startsWith(BASE)) path = path.slice(BASE.length);
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'collection' && parts[1]) return { page: 'collection', slug: parts[1] };
  if (parts[0] === 'work' && parts[1]) return { page: 'work', slug: parts[1] };
  if (parts[0] === 'mind') return { page: 'mind' };
  if (parts[0] === 'case-studies') return { page: 'cases' };
  if (parts[0] === 'about') return { page: 'mind' };
  if (parts[0] === 'game') return { page: 'game' };
  if (parts[0] === 'admin') return { page: 'admin' };
  return { page: 'home' };
}

function navigate(fullPath) {
  window.history.pushState(null, '', fullPath);
  state.route = parseRoute();
  state.chapter = 'all';
  if (state.route.page !== 'work') state.activeWork = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  render();
}

function applyThemeAndLang() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.classList.toggle('light-mode', state.theme === 'light');
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
  ctx.fillText('ahmedissamramadan.github.io/visuals', 540, 1705);

  const outBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(outBlob);
  a.download = `${work.slug}-story-1080x1920.png`;
  a.click();
}

async function loadData() {
  const [{ data: cols }, { data: works }, { data: reacts }, { data: cases }, { data: notes }] = await Promise.all([
    supabase.from('collections').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('works').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('reactions').select('work_id, profile_id, reaction_type'),
    supabase.from('case_studies').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('mind_notes').select('*').eq('is_published', true).order('sort_order')
  ]);

  state.collections = cols || [];
  state.works = works || [];
  state.caseStudies = cases || [];
  state.mindNotes = notes || [];
  state.reactions = new Map();
  state.userReactions = new Set();

  for (const r of reacts || []) {
    const key = `${r.work_id}:${r.reaction_type || 'heart'}`;
    state.reactions.set(key, (state.reactions.get(key) || 0) + 1);
    if (state.profile && r.profile_id === state.profile.id) state.userReactions.add(key);
  }

  if (state.route.page === 'work') {
    const found = state.works.find(w => w.slug === state.route.slug);
    if (found) await openWork(found, false);
  }
  render();
}

function subscribeRealtime() {
  supabase
    .channel('artelligence-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mind_notes' }, () => loadData())
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
  if (pushUrl) window.history.pushState(null, '', `${BASE}/work/${work.slug}`);
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
  if (state.route.page === 'work') navigate(`${BASE}/`);
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
        <a href="${BASE}/" data-nav="${BASE}/" class="brand">
          <span class="brand-mark"><img src="${BASE}/brand/Artelligence_04_Symbol.svg" alt="" /></span>
          <span>${t('subBrand')}</span>
          <span style="color:var(--muted);font-weight:400;font-size:0.85rem;">· ${t('brand')}</span>
        </a>
        <nav class="nav-links">
          <a href="${BASE}/" data-nav="${BASE}/" class="nav-link ${p === 'home' || p === 'collection' ? 'active' : ''}">${t('home')}</a>
          <a href="${BASE}/case-studies" data-nav="${BASE}/case-studies" class="nav-link ${p === 'cases' ? 'active' : ''}">${t('cases')}</a>
          <a href="${BASE}/mind" data-nav="${BASE}/mind" class="nav-link ${p === 'mind' ? 'active' : ''}">${t('mind')}</a>
          <a href="${BASE}/game" data-nav="${BASE}/game" class="nav-link ${p === 'game' ? 'active' : ''}">${t('game')}</a>
        </nav>
        <div class="header-actions">
          <button id="theme-toggle" class="pill-btn" type="button" aria-label="Toggle theme">${state.theme === 'dark' ? '☀️' : '🌙'}</button>
          <button id="lang-toggle" class="pill-btn" type="button">${state.lang === 'en' ? 'عربي' : 'EN'}</button>
          <a href="#contact" class="pill-btn active">${t('bookCall')}</a>
        </div>
      </div>
    </header>
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
    <a href="${BASE}/collection/${escHtml(c.slug)}" data-nav="${BASE}/collection/${escHtml(c.slug)}" class="collection-card">
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
  return `
    <article class="case-card">
      ${cs.cover_url ? `<div class="case-cover"><img src="${escHtml(cs.cover_url)}" alt="" loading="lazy" /></div>` : ''}
      <div class="case-body">
        <div class="collection-meta">${escHtml(isAr ? cs.sector_ar : cs.sector_en)}</div>
        <h3 style="font-size:1.18rem;font-weight:700;">${escHtml(isAr ? cs.title_ar : cs.title_en)}</h3>
        <div class="case-pso">
          <div><strong>${isAr ? 'المشكلة:' : 'Problem:'}</strong> ${escHtml(isAr ? cs.problem_ar : cs.problem_en)}</div>
          <div><strong>${isAr ? 'الحل:' : 'Solution:'}</strong> ${escHtml(isAr ? cs.solution_ar : cs.solution_en)}</div>
          <div><strong>${isAr ? 'النتيجة الموثقة:' : 'Verified Outcome:'}</strong> ${escHtml(isAr ? cs.outcome_ar : cs.outcome_en)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:10px;">
          ${cs.collection_slug ? `<a href="${BASE}/collection/${escHtml(cs.collection_slug)}" data-nav="${BASE}/collection/${escHtml(cs.collection_slug)}" class="pill-btn active">${isAr ? 'معاينة الأصول داخل التطبيق' : 'View Assets In-App'}</a>` : ''}
          ${cs.external_url ? `<a href="${escHtml(cs.external_url)}" target="_blank" rel="noopener" class="pill-btn">${t('openExternal')}</a>` : ''}
        </div>
      </div>
    </article>
  `;
}

function renderContactSection() {
  const isAr = state.lang === 'ar';
  return `
    <section id="contact" class="section-block container">
      <div class="section-head">
        <div>
          <span class="section-kicker">05 · ${isAr ? 'تواصل مباشر' : 'DIRECT CONTACT'}</span>
          <h2 class="section-title">${isAr ? 'احجز مكالمة استكشافية (15 دقيقة) أو أرسل تفاصيل مشروعك' : 'Book a 15-Min Discovery Call or Send a Brief'}</h2>
        </div>
      </div>
      <div class="contact-grid">
        <div class="about-card">
          <h3 style="font-size:1.1rem;margin-bottom:10px;">${isAr ? 'قنوات التواصل المعتمدة' : 'Verified Direct Channels'}</h3>
          <p style="color:var(--muted);font-size:0.92rem;margin-bottom:16px;">
            ${isAr ? 'أعمل مباشرة مع أصحاب الشركات الصغيرة والمتوسطة في مصر والخليج، ومؤسسي المنتجات الرقمية.' : 'Working directly with SME founders in Egypt & GCC, and digital product teams.'}
          </p>
          <div style="display:flex;flex-direction:column;gap:10px;font-size:0.9rem;margin-bottom:18px;">
            <div><strong>Email:</strong> <a href="mailto:ahmedissam.work@gmail.com" style="text-decoration:underline;">ahmedissam.work@gmail.com</a></div>
            <div><strong>WhatsApp (15m Call):</strong> <a href="https://wa.me/201501656010" target="_blank" rel="noopener" style="text-decoration:underline;">+20 150 165 6010</a></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            <a href="https://wa.me/201501656010" target="_blank" rel="noopener" class="pill-btn active">WhatsApp · 15m Call ↗</a>
            <a href="https://www.linkedin.com/in/ahmdesam96" target="_blank" rel="noopener" class="pill-btn">LinkedIn ↗</a>
            <a href="https://www.behance.net/ahmedissam_personal" target="_blank" rel="noopener" class="pill-btn">Behance ↗</a>
            <a href="https://www.instagram.com/ahmdesam96" target="_blank" rel="noopener" class="pill-btn">Instagram ↗</a>
            <a href="https://linkie.bio/ahmedissam.personal" target="_blank" rel="noopener" class="pill-btn">Linkie ↗</a>
          </div>
        </div>
        <div class="about-card">
          <h3 style="font-size:1.1rem;margin-bottom:12px;">${isAr ? 'أرسل رسالة مباشرة للوحة التحكم' : 'Send Direct In-App Brief'}</h3>
          <form id="inquiry-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="inq-name" class="input" type="text" placeholder="${isAr ? 'الاسم' : 'Your Name'}" required />
            <input id="inq-contact" class="input" type="text" placeholder="${isAr ? 'البريد الإلكتروني أو رقم الواتساب' : 'Email or WhatsApp'}" required />
            <textarea id="inq-msg" class="input" rows="3" placeholder="${isAr ? 'ما الذي تود بناءه أو أتمتته؟' : 'What are you building or looking to automate?'}" required></textarea>
            <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? 'إرسال الرسالة الآن' : 'Send Message'}</button>
            ${state.inquiryStatus ? `<div style="font-size:0.85rem;color:#22C55E;">${escHtml(state.inquiryStatus)}</div>` : ''}
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
  const personalCols = state.collections.filter(c => c.category === 'personal');
  const eduCols = state.collections.filter(c => c.category === 'educational');

  const camSample = state.works.find(w => w.origin === 'camera');
  const aiSample = state.works.find(w => w.origin === 'ai');

  return `
    <section class="hero container">
      <div class="hero-grid">
        <div>
          <span class="hero-badge"><span class="hero-badge-dot"></span><span>${t('availBadge')}</span></span>
          <h1 class="hero-title">${t('heroTitle')}</h1>
          <p class="hero-sub">${t('heroSub')}</p>
          <div class="hero-cta-row">
            <a href="#client-work" class="pill-btn active">${t('exploreWork')}</a>
            <a href="${BASE}/mind" data-nav="${BASE}/mind" class="pill-btn">${t('openMind')}</a>
            <a href="https://wa.me/201501656010" target="_blank" rel="noopener" class="pill-btn">${t('bookCall')} ↗</a>
          </div>
          <div style="max-width:480px;margin-bottom:14px;">
            <input id="global-search" class="input" type="search" placeholder="${isAr ? 'ابحث في الأعمال والأنظمة...' : 'Search works & systems...'}" value="${escHtml(state.searchQuery)}" />
          </div>
          ${renderOriginFilter()}
        </div>
        <div class="hero-portrait-card">
          <img src="${HEADSHOT_URL}" alt="${t('brand')}" class="hero-portrait-img" />
          <div style="font-size:0.86rem;color:var(--muted);">
            <strong style="color:var(--text);display:block;margin-bottom:2px;">${t('brand')}</strong>
            ${isAr ? 'ليسانس حقوق (2022) · علّمت نفسي التصميم والبرمجة والأتمتة بالتطبيق العملي.' : 'LL.B. (2022) · Self-taught product designer, systems builder & AI automation consultant.'}
          </div>
        </div>
      </div>
    </section>

    ${(state.origin !== 'all' || q) ? `
      <section class="section-block container">
        <div class="masonry-grid">
          ${filteredWorks.length ? filteredWorks.map(renderWorkCard).join('') : `<p style="color:var(--muted)">${t('noWorks')}</p>`}
        </div>
      </section>
    ` : `
      <!-- 01 · Client Work & Case Studies -->
      <section id="client-work" class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">01 · ${isAr ? 'نتائج وشغل عملاء حقيقي' : 'VERIFIED CLIENT WORK'}</span>
            <h2 class="section-title">${isAr ? 'دراسات الحالة والهويات التجارية' : 'Case Studies & Client Systems'}</h2>
          </div>
          <a href="${BASE}/case-studies" data-nav="${BASE}/case-studies" class="pill-btn">${isAr ? 'عرض كل دراسات الحالة' : 'All Case Studies'}</a>
        </div>
        <div class="case-grid" style="margin-bottom:32px;">
          ${state.caseStudies.slice(0, 3).map(renderCaseCard).join('')}
        </div>
        <div class="collections-grid">
          ${clientCols.map(renderCollectionCard).join('')}
        </div>
      </section>

      <!-- 02 · Inside My Mind & Live OS -->
      <section class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">02 · ${isAr ? 'كيف أفكر وما أبنيه الآن' : 'MINDSET & OPERATING SYSTEM'}</span>
            <h2 class="section-title">${isAr ? 'داخل عقلي والتركيز الحي' : 'Inside My Mind & Live Focus'}</h2>
          </div>
          <a href="${BASE}/mind" data-nav="${BASE}/mind" class="pill-btn">${isAr ? 'اقرأ الدليل الكامل' : 'Full Mind Archive'}</a>
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

      <!-- 03 · Personal, AI & Educational Explorations -->
      <section class="section-block container">
        <div class="section-head">
          <div>
            <span class="section-kicker">03 · ${isAr ? 'مختبر البصريات والفوتوغرافيا' : 'VISUAL ARCHIVE'}</span>
            <h2 class="section-title">${isAr ? 'استكشافات فنية وذكاء اصطناعي' : 'Personal & AI Explorations'}</h2>
          </div>
        </div>
        <div class="collections-grid">
          ${personalCols.map(renderCollectionCard).join('')}
        </div>

        <div class="section-head" style="margin-top:24px;">
          <div>
            <span class="section-kicker">${isAr ? 'محتوى توعوي نفسي' : 'EDUCATIONAL SERIES'}</span>
            <h3 style="font-size:1.25rem;font-weight:700;">${isAr ? 'السلاسل النفسية والمعرفية' : 'Visual Psychology & Mental Health'}</h3>
          </div>
        </div>
        <div class="collections-grid">
          ${eduCols.map(renderCollectionCard).join('')}
        </div>
      </section>

      <!-- 04 · Prominent Human or AI Challenge -->
      <section class="section-block container">
        <div class="game-banner">
          <div style="flex:1;min-width:260px;">
            <span class="section-kicker">04 · ${isAr ? 'تجربة تفاعلية' : 'INTERACTIVE CHALLENGE'}</span>
            <h2 class="section-title" style="margin-bottom:10px;">${isAr ? 'تحدي: هل تفرق بين الكاميرا والذكاء الاصطناعي؟' : 'Challenge: Can You Tell Human Camera from AI?'}</h2>
            <p style="color:var(--muted);margin-bottom:18px;max-width:540px;">
              ${isAr ? '10 جولات سريعة من صور الكاميرا ولوحات الإنسان والآلة. اختبر عينك وسجّل نتيجتك في لوحة الصدارة العالمية.' : '10 rapid rounds mixing raw camera photographs and AI plates. Test your eye and save your score on the global leaderboard.'}
            </p>
            <a href="${BASE}/game" data-nav="${BASE}/game" class="pill-btn active">${isAr ? 'ابدأ التحدي الآن' : 'Start 10-Round Challenge'}</a>
          </div>
          <div style="display:flex;gap:12px;">
            ${camSample ? `<img src="${escHtml(getWorkImg(camSample, '480'))}" alt="" style="width:120px;height:150px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" loading="lazy" />` : ''}
            ${aiSample ? `<img src="${escHtml(getWorkImg(aiSample, '480'))}" alt="" style="width:120px;height:150px;object-fit:cover;border-radius:12px;border:1px solid var(--border);" loading="lazy" />` : ''}
          </div>
        </div>
      </section>
    `}

    ${renderContactSection()}
  `;
}

function renderMindPage() {
  const isAr = state.lang === 'ar';
  const stages = [
    { img: 'Artelligence_01_Point.svg', ar: '01 · النقطة', en: '01 · Point', descAr: 'الأصل والفكرة قبل أي أداة.', descEn: 'Origin and focus before any tool.' },
    { img: 'Artelligence_02_Stroke.svg', ar: '02 · الضربة 56.9°', en: '02 · Stroke 56.9°', descAr: 'الحركة والنية البشرية الموجهة.', descEn: 'Human direction and intention.' },
    { img: 'Artelligence_03_Form.svg', ar: '03 · الشكل', en: '03 · Form', descAr: 'هندسة الإبداع على شبكة 48px.', descEn: 'Creativity structured on a 48px grid.' },
    { img: 'Artelligence_04_Symbol.svg', ar: '04 · الرمز', en: '04 · Symbol', descAr: 'تناغم الفن مع الذكاء الاصطناعي.', descEn: 'Harmony between Art and AI.' }
  ];

  return `
    <section class="container" style="padding:36px 24px 64px;">
      <div style="margin-bottom:20px;">
        <a href="${BASE}/" data-nav="${BASE}/" class="pill-btn">${t('backHome')}</a>
      </div>
      <span class="section-kicker">${isAr ? 'الوثيقة المرجعية الحية' : 'DIGITAL DNA & MINDSET'}</span>
      <h1 class="hero-title">${isAr ? 'داخل عقلي ومنظومة Artelligence' : 'Inside My Mind & Artelligence OS'}</h1>
      <p class="hero-sub">${isAr ? 'كل مبادئ الشغل، قصتي الحقيقية، هندسة التصميم، وتركيزي الحالي محدثة مباشرة من قاعدة البيانات.' : 'Verified operating principles, personal story, design geometry, and live focus synced directly from Supabase.'}</p>

      <div class="mind-grid" style="margin-bottom:36px;">
        ${state.mindNotes.map(n => `
          <article class="mind-card">
            <div class="collection-meta">${escHtml(n.category.toUpperCase())}</div>
            <h2 style="font-size:1.1rem;font-weight:700;">${escHtml(isAr ? n.title_ar : n.title_en)}</h2>
            <p style="font-size:0.9rem;color:var(--muted);">${escHtml(isAr ? n.body_ar : n.body_en)}</p>
          </article>
        `).join('')}
      </div>

      <h2 class="section-title" style="margin-bottom:12px;">${isAr ? 'مراحل الشعار والهندسة البصرية' : '4-Stage Logo & Visual Geometry'}</h2>
      <div class="geometry-grid" style="margin-bottom:36px;">
        ${stages.map(s => `
          <div class="geometry-card">
            <img src="${BASE}/brand/${s.img}" alt="" />
            <strong>${isAr ? s.ar : s.en}</strong>
            <span style="font-size:0.82rem;color:var(--muted);">${isAr ? s.descAr : s.descEn}</span>
          </div>
        `).join('')}
      </div>

      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:10px;">${isAr ? 'الستاك التقني والشهادات الموثقة' : 'Verified Tech Stack & Credentials'}</h2>
        <p style="color:var(--muted);font-size:0.9rem;margin-bottom:10px;">
          <strong>UI/UX:</strong> Figma, Stitch, Anima · <strong>Frontend:</strong> HTML, CSS, Tailwind CSS, JavaScript, TypeScript, React, Next.js · <strong>Backend & Automation:</strong> Node.js, Python, SQLite, Supabase PostgreSQL, n8n, Make.com, WhatsApp Business API.
        </p>
        <p style="color:var(--muted);font-size:0.86rem;">
          ${isAr ? 'التعليم: ليسانس الحقوق - جامعة الزقازيق (2022) · شهادات ALX: AI Career Essentials (AiCE) و Project Management Crash Course.' : 'Education: LL.B., Zagazig University (2022) · Earned ALX Certificates: AI Career Essentials (AiCE) & Project Management Crash Course.'}
        </p>
      </div>
    </section>
    ${renderContactSection()}
  `;
}

function renderCasesPage() {
  const isAr = state.lang === 'ar';
  return `
    <section class="container" style="padding:36px 24px 64px;">
      <div style="margin-bottom:20px;">
        <a href="${BASE}/" data-nav="${BASE}/" class="pill-btn">${t('backHome')}</a>
      </div>
      <span class="section-kicker">${isAr ? 'شغل حقيقي بأدلة موثقة' : 'CLIENT CASE STUDIES'}</span>
      <h1 class="hero-title">${isAr ? 'دراسات الحالة: المشكلة، الحل، والنتيجة' : 'Case Studies: Problem, Solution, Outcome'}</h1>
      <div class="case-grid" style="margin-top:24px;">
        ${state.caseStudies.map(renderCaseCard).join('')}
      </div>
    </section>
    ${renderContactSection()}
  `;
}

function renderCollection(slug) {
  const isAr = state.lang === 'ar';
  const col = state.collections.find(c => c.slug === slug);
  if (!col) return `<div class="container" style="padding:60px 24px"><a href="${BASE}/" data-nav="${BASE}/" class="pill-btn">${t('backHome')}</a></div>`;

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
        <a href="${BASE}/" data-nav="${BASE}/" class="pill-btn">${t('backHome')}</a>
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
  const eco = [
    { label: 'WASL Network', url: 'https://wasl-network.com' },
    { label: 'Artelligence OS', url: 'https://ahmedissamramadan.github.io/Artelligence-OS/' },
    { label: 'AI Business Transformation', url: 'https://ahmedissamramadan.github.io/ai-business-transformation/' },
    { label: 'AI Pyramid', url: 'https://ahmedissamramadan.github.io/ai-pyramid/' },
    { label: 'AIR Calculator', url: 'https://ahmedissamramadan.github.io/air/' }
  ];
  return `
    <footer class="site-footer">
      <div class="container">
        <div style="font-weight:700;margin-bottom:10px;color:var(--text);">ARTELLIGENCE ECOSYSTEM</div>
        <div class="eco-links">
          ${eco.map(e => `<a href="${e.url}" target="_blank" rel="noopener" class="pill-btn" style="font-size:0.78rem;padding:5px 12px;">${e.label} ↗</a>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <span>${isAr ? '© 2026 أحمد عصام رمضان · Artelligence' : '© 2026 Ahmed Issam Ramadan · Artelligence'}</span>
          <a href="${BASE}/admin" data-nav="${BASE}/admin" style="color:var(--muted);">${isAr ? 'لوحة الإدارة' : 'Admin Studio'}</a>
        </div>
      </div>
    </footer>
  `;
}

function render() {
  const app = document.getElementById('app');
  let mainHtml = '';
  if (state.route.page === 'collection') mainHtml = renderCollection(state.route.slug);
  else if (state.route.page === 'mind') mainHtml = renderMindPage();
  else if (state.route.page === 'cases') mainHtml = renderCasesPage();
  else if (state.route.page === 'game') mainHtml = '<div id="game-root"></div>';
  else if (state.route.page === 'admin') mainHtml = '<div id="admin-root"></div>';
  else mainHtml = renderHome();

  app.innerHTML = `${renderHeader()}<main>${mainHtml}</main>${renderFooter()}${renderLightbox()}`;

  if (state.route.page === 'admin') renderAdminPage(document.getElementById('admin-root'), state, loadData);
  if (state.route.page === 'game') renderGamePage(document.getElementById('game-root'), state, navigate);

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(a.dataset.nav);
    });
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    state.lang = state.lang === 'en' ? 'ar' : 'en';
    localStorage.setItem('ahmed_visuals_lang', state.lang);
    applyThemeAndLang();
    render();
  });

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ahmed_visuals_theme', state.theme);
    applyThemeAndLang();
    render();
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
    state.inquiryStatus = error
      ? error.message
      : (state.lang === 'ar' ? 'تم استلام رسالتك بنجاح! سأتواصل معك قريباً.' : 'Brief received! I will reach out shortly.');
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
    render();
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
  window.addEventListener('load', () => navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {}));
}

applyThemeAndLang();
ensureAuthSession().then(() => {
  loadData();
  subscribeRealtime();
});
