import './styles/main.css';
import { supabase, ensureAuthSession, getSavedProfile, saveVisitorProfile } from './lib/supabase.js';
import { renderAdminPage } from './admin.js';
import { renderGamePage, startNewGame } from './game.js';

const PHOTO_CHAPTERS = [
  { key: 'all', ar: 'كل الفصول', en: 'All Chapters' },
  { key: 'river', ar: 'نهرٌ وسماء', en: 'River & Sky' },
  { key: 'table', ar: 'طاولةٌ وقهوة', en: 'Table & Cup' },
  { key: 'night', ar: 'ليلٌ وحركة', en: 'Night & Motion' },
  { key: 'small', ar: 'أشياءُ صغيرة', en: 'Small Things' }
];

const REACTION_TYPES = [
  { key: 'heart', labelEn: '❤️ Love', labelAr: '❤️ إعجاب' },
  { key: 'wahashni', labelEn: '🌙 Nostalgic', labelAr: '🌙 وحشني' },
  { key: 'coffee', labelEn: '☕ Warm', labelAr: '☕ ريحتها قهوة' },
  { key: 'me', labelEn: '🪞 This is me', labelAr: '🪞 ده أنا' },
  { key: 'deep', labelEn: '✨ Deep', labelAr: '✨ مش فاهم بس حلو' }
];

const state = {
  lang: localStorage.getItem('ahmed_visuals_lang') || 'ar',
  origin: 'all',
  chapter: 'all',
  searchQuery: '',
  onlineCount: 1,
  collections: [],
  works: [],
  reactions: new Map(), // `${work_id}:${type}` -> count
  userReactions: new Set(), // `${work_id}:${type}`
  profile: getSavedProfile(),
  activeWork: null,
  activeComments: [],
  route: parseRoute()
};

const T = {
  en: {
    brand: 'Ahmed Ramadan',
    home: 'Collections',
    about: 'About',
    heroEyebrow: 'Central Visual Home',
    heroTitle: 'Light, Machine & Form',
    heroSub: 'A curated visual archive of camera photography, AI-generated plates, brand identities, and design systems.',
    all: 'All',
    camera: '📷 Camera',
    ai: '✨ AI',
    design: '🎨 Design',
    featuredTitle: 'Curated Spotlight',
    collectionsTitle: 'Collections',
    worksCount: (n) => `${n} works`,
    backToCollections: '← All Collections',
    openExternal: 'View on Behance ↗',
    copyLink: 'Share Link',
    exportStory: 'Story Card (1080×1920)',
    copied: 'Copied!',
    comments: 'Comments',
    commentPlaceholder: 'Write a thought...',
    send: 'Send',
    signInPrompt: 'Enter your name to react & comment',
    yourName: 'Your name',
    saveProfile: 'Continue',
    aboutTitle: 'About Ahmed Ramadan',
    aboutBio: 'Multidisciplinary builder, visual storyteller, and AI-native creator from Egypt. This space brings together my camera rolls, AI-generated visual essays, brand identities, and digital experiments in one home.',
    footer: '© 2026 Ahmed Ramadan - Central Visual Home',
    noWorks: 'No works match this filter yet.'
  },
  ar: {
    brand: 'أحمد رمضان',
    home: 'المجموعات',
    about: 'عنّي',
    heroEyebrow: 'البيت البصري المركزي',
    heroTitle: 'الضوء، الآلة، والشكل',
    heroSub: 'أرشيف بصري مُنتقى يجمع صور الكاميرا، اللوحات المولّدة بالذكاء الاصطناعي، الهويات البصرية، والأنظمة التصميمية.',
    all: 'الكل',
    camera: '📷 كاميرا',
    ai: '✨ ذكاء اصطناعي',
    design: '🎨 تصميم',
    featuredTitle: 'مختارات المحرر',
    collectionsTitle: 'المجموعات',
    worksCount: (n) => `${n} عمل`,
    backToCollections: '→ كل المجموعات',
    openExternal: 'عرض على بيهانس ↗',
    copyLink: 'نسخ الرابط',
    exportStory: 'بطاقة ستوري (1080×1920)',
    copied: 'تم النسخ!',
    comments: 'التعليقات',
    commentPlaceholder: 'اكتب تعليقاً...',
    send: 'إرسال',
    signInPrompt: 'أدخل اسمك للتفاعل والتعليق',
    yourName: 'اسمك',
    saveProfile: 'متابعة',
    aboutTitle: 'عن أحمد رمضان',
    aboutBio: 'صانع منتجات رقمية، ومصمم تجارب بصرية من مصر. يجمع هذا الموقع بين صوري الفوتوغرافية، ولوحات الذكاء الاصطناعي، والهويات التجارية، والتجارب البصرية في مكان واحد.',
    footer: '© 2026 أحمد رمضان - البيت البصري المركزي',
    noWorks: 'لا توجد أعمال مطابقة لهذا الفلتر حالياً.'
  }
};

function t(key, ...args) {
  const val = T[state.lang][key];
  return typeof val === 'function' ? val(...args) : val;
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'collection' && parts[1]) return { page: 'collection', slug: parts[1] };
  if (parts[0] === 'work' && parts[1]) return { page: 'work', slug: parts[1] };
  if (parts[0] === 'about') return { page: 'about' };
  if (parts[0] === 'game') return { page: 'game' };
  if (parts[0] === 'admin') return { page: 'admin' };
  return { page: 'home' };
}

function setLang(lang) {
  state.lang = lang;
  localStorage.setItem('ahmed_visuals_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  render();
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

  // Background
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = 'rgba(200, 164, 110, 0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 984, 1824);

  // Load image
  const imgUrl = getWorkImg(work, '1200');
  const res = await fetch(imgUrl);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);

  const maxW = 900;
  const maxH = 1280;
  const scale = Math.min(maxW / bmp.width, maxH / bmp.height);
  const drawW = Math.round(bmp.width * scale);
  const drawH = Math.round(bmp.height * scale);
  const drawX = Math.round((1080 - drawW) / 2);
  const drawY = Math.round(180 + (maxH - drawH) / 2);
  ctx.drawImage(bmp, drawX, drawY, drawW, drawH);

  // Typography
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f3efe6';
  ctx.font = '600 44px Cairo, Georgia, serif';
  const title = state.lang === 'ar' ? (work.title_ar || work.title_en) : (work.title_en || work.title_ar);
  ctx.fillText(title.slice(0, 42), 540, 1580);

  ctx.fillStyle = '#c8a46e';
  ctx.font = '500 28px Inter, Cairo, sans-serif';
  ctx.fillText('AHMED RAMADAN - VISUALS', 540, 1660);

  ctx.fillStyle = '#9a958c';
  ctx.font = '400 22px Inter, sans-serif';
  ctx.fillText('ahmedissamramadan.github.io/visuals', 540, 1715);

  const outBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(outBlob);
  a.download = `${work.slug}-story-1080x1920.png`;
  a.click();
}

async function loadData() {
  const [{ data: cols }, { data: works }, { data: reacts }] = await Promise.all([
    supabase.from('collections').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('works').select('*').eq('is_published', true).order('sort_order'),
    supabase.from('reactions').select('work_id, profile_id, reaction_type')
  ]);

  state.collections = cols || [];
  state.works = works || [];
  state.reactions = new Map();
  state.userReactions = new Set();

  for (const r of reacts || []) {
    const type = r.reaction_type || 'heart';
    const key = `${r.work_id}:${type}`;
    state.reactions.set(key, (state.reactions.get(key) || 0) + 1);
    if (state.profile && r.profile_id === state.profile.id) {
      state.userReactions.add(key);
    }
  }

  if (state.route.page === 'work') {
    const found = state.works.find(w => w.slug === state.route.slug);
    if (found) await openWork(found, false);
  }

  render();
}

function subscribeRealtime() {
  supabase
    .channel('visuals-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, () => {
      loadData();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
      if (state.activeWork && payload.new.work_id === state.activeWork.id && !payload.new.is_hidden) {
        const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', payload.new.profile_id).single();
        state.activeComments.push({ ...payload.new, profiles: prof });
        render();
      }
    })
    .subscribe();

  // Realtime Presence for live viewer count
  const presenceKey = `visitor-${Math.random().toString(36).slice(2, 10)}`;
  const presenceCh = supabase.channel('visuals-presence', { config: { presence: { key: presenceKey } } });
  presenceCh
    .on('presence', { event: 'sync' }, () => {
      const count = Object.keys(presenceCh.presenceState()).length;
      state.onlineCount = Math.max(1, count);
      const badge = document.getElementById('presence-badge');
      if (badge) badge.textContent = state.lang === 'ar' ? `🟢 ${state.onlineCount} يشاهد الآن` : `🟢 ${state.onlineCount} viewing`;
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceCh.track({ online_at: new Date().toISOString() });
      }
    });
}

async function openWork(work, pushHash = true) {
  state.activeWork = work;
  if (pushHash) {
    window.location.hash = `#/work/${work.slug}`;
  }
  document.title = `${state.lang === 'ar' ? work.title_ar : work.title_en} - ${t('brand')}`;
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
  document.title = `${t('brand')} - Visuals`;
  if (state.route.page === 'work') {
    window.location.hash = '#/';
  }
  render();
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
  const { error } = await supabase.from('comments').insert({
    work_id: workId,
    profile_id: state.profile.id,
    body: trimmed
  });
  if (error) console.error(error);
}

let pendingProfileCallback = null;
function showProfileModal(cb = null) {
  pendingProfileCallback = cb;
  const existing = document.getElementById('profile-modal');
  if (existing) existing.remove();

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
  return `
    <header class="site-header">
      <div class="container header-inner">
        <a href="#/" class="brand">
          <span class="brand-dot"></span>
          <span>${t('brand')}</span>
        </a>
        <nav class="nav-links">
          <a href="#/" class="nav-link ${state.route.page === 'home' || state.route.page === 'collection' ? 'active' : ''}">${t('home')}</a>
          <a href="#/game" class="nav-link ${state.route.page === 'game' ? 'active' : ''}">${state.lang === 'ar' ? 'إنسان أم آلة؟' : 'Human or AI?'}</a>
          <a href="#/about" class="nav-link ${state.route.page === 'about' ? 'active' : ''}">${t('about')}</a>
        </nav>
        <div class="header-actions">
          <span id="presence-badge" class="pill-btn" style="font-size:0.76rem;cursor:default;">${state.lang === 'ar' ? `🟢 ${state.onlineCount} يشاهد الآن` : `🟢 ${state.onlineCount} viewing`}</span>
          <button id="lang-toggle" class="pill-btn" type="button">${state.lang === 'en' ? 'عربي' : 'EN'}</button>
          <button id="profile-btn" class="pill-btn" type="button">
            <img src="./icons/user.svg" class="icon" alt="" />
            <span>${escHtml(state.profile?.display_name || (state.lang === 'ar' ? 'زائر' : 'Guest'))}</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderOriginFilter() {
  const origins = ['all', 'camera', 'ai', 'design'];
  return `
    <div class="filter-bar">
      ${origins.map(o => `
        <button class="pill-btn ${state.origin === o ? 'active' : ''}" data-origin="${o}" type="button">
          ${t(o)}
        </button>
      `).join('')}
    </div>
  `;
}

function renderWorkCard(w) {
  const title = state.lang === 'ar' ? (w.title_ar || w.title_en) : (w.title_en || w.title_ar);
  const imgUrl = getWorkImg(w, '480');
  const srcset = getWorkSrcset(w);
  const blurBg = w.blur_data_url ? `background-image:url('${w.blur_data_url}')` : '';
  const originLabel = t(w.origin);
  return `
    <article class="work-card" data-work-slug="${escHtml(w.slug)}">
      <div class="work-thumb" style="${blurBg}">
        <img
          src="${escHtml(imgUrl)}"
          ${srcset ? `srcset="${escHtml(srcset)}" sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"` : ''}
          alt="${escHtml(title)}"
          loading="lazy"
          decoding="async"
          width="${w.width || 480}"
          height="${w.height || 480}"
        />
      </div>
      <div class="work-caption">
        <span class="work-title">${escHtml(title)}</span>
        <span class="work-badge">${originLabel}</span>
      </div>
    </article>
  `;
}

function renderHome() {
  const featured = state.works.filter(w => w.is_featured).slice(0, 8);
  const q = state.searchQuery.trim().toLowerCase();
  const filteredWorks = q
    ? state.works.filter(w =>
        (state.origin === 'all' || w.origin === state.origin) &&
        (`${w.title_ar} ${w.title_en} ${(w.themes || []).join(' ')}`.toLowerCase().includes(q))
      )
    : state.origin === 'all'
      ? []
      : state.works.filter(w => w.origin === state.origin);

  return `
    <section class="hero container">
      <span class="hero-eyebrow">${t('heroEyebrow')}</span>
      <h1 class="hero-title">${t('heroTitle')}</h1>
      <p class="hero-sub">${t('heroSub')}</p>
      <div style="max-width:460px;margin:0 auto 20px;">
        <input id="global-search" class="input" style="width:100%;text-align:center;" type="search" placeholder="${state.lang === 'ar' ? 'ابحث في 505 عملاً...' : 'Search 505 works...'}" value="${escHtml(state.searchQuery)}" />
      </div>
      ${renderOriginFilter()}
    </section>

    <section class="container">
      ${state.origin === 'all' && !q ? `
        ${featured.length ? `
          <div class="section-head">
            <h2 class="section-title">${t('featuredTitle')}</h2>
          </div>
          <div class="masonry-grid" style="margin-bottom:52px;">
            ${featured.map(renderWorkCard).join('')}
          </div>
        ` : ''}
        <div class="section-head">
          <h2 class="section-title">${t('collectionsTitle')}</h2>
        </div>
        <div class="collections-grid">
          ${state.collections.map(c => {
            const name = state.lang === 'ar' ? c.title_ar : c.title_en;
            const desc = state.lang === 'ar' ? c.description_ar : c.description_en;
            const colWorks = state.works.filter(w => w.collection_id === c.id);
            const cover = c.cover || (colWorks[0] ? getWorkImg(colWorks[0], '480') : '');
            return `
              <a href="#/collection/${escHtml(c.slug)}" class="collection-card">
                <div class="collection-cover">
                  ${cover ? `<img src="${escHtml(cover)}" alt="${escHtml(name)}" loading="lazy" />` : ''}
                </div>
                <div class="collection-body">
                  <div class="collection-meta">
                    <span>${c.year || 2026}</span>
                    <span>${t('worksCount', colWorks.length)}</span>
                  </div>
                  <div class="collection-name">${escHtml(name)}</div>
                  <p class="collection-desc">${escHtml(desc)}</p>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="masonry-grid">
          ${filteredWorks.length ? filteredWorks.map(renderWorkCard).join('') : `<p style="color:var(--muted)">${t('noWorks')}</p>`}
        </div>
      `}
    </section>
  `;
}

function renderCollection(slug) {
  const col = state.collections.find(c => c.slug === slug);
  if (!col) return `<div class="container" style="padding:60px 24px"><a href="#/" class="pill-btn">${t('backToCollections')}</a></div>`;

  let works = state.works.filter(w => w.collection_id === col.id);
  if (state.origin !== 'all') {
    works = works.filter(w => w.origin === state.origin);
  }
  if (slug === 'photography' && state.chapter !== 'all') {
    works = works.filter(w => (w.themes || []).includes(state.chapter));
  }

  const name = state.lang === 'ar' ? col.title_ar : col.title_en;
  const desc = state.lang === 'ar' ? col.description_ar : col.description_en;

  return `
    <section class="container" style="padding-top:36px;">
      <div style="margin-bottom:20px;">
        <a href="#/" class="pill-btn">${t('backToCollections')}</a>
      </div>
      <div class="section-head" style="flex-direction:column;gap:8px;margin-bottom:28px;">
        <h1 class="hero-title" style="font-size:clamp(2rem,4vw,3rem);margin:0;">${escHtml(name)}</h1>
        <p style="color:var(--muted);max-width:680px;">${escHtml(desc)}</p>
      </div>
      ${slug === 'photography' ? `
        <div class="filter-bar" style="margin-bottom:20px;">
          ${PHOTO_CHAPTERS.map(ch => `
            <button class="pill-btn ${state.chapter === ch.key ? 'active' : ''}" data-chapter="${ch.key}" type="button">
              ${state.lang === 'ar' ? ch.ar : ch.en}
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

function renderAbout() {
  return `
    <section class="container">
      <div class="about-card">
        <h1 class="section-title" style="margin-bottom:14px;">${t('aboutTitle')}</h1>
        <p style="color:var(--muted);font-size:1.02rem;line-height:1.8;">${t('aboutBio')}</p>
        <div class="about-links">
          <a href="https://www.behance.net/ahmedissam_personal" target="_blank" rel="noopener" class="pill-btn">Behance ↗</a>
          <a href="https://www.facebook.com/ahmedissam.personal" target="_blank" rel="noopener" class="pill-btn">Facebook ↗</a>
          <a href="https://www.instagram.com/ahmdesam96" target="_blank" rel="noopener" class="pill-btn">Instagram @ahmdesam96 ↗</a>
          <a href="https://www.linkedin.com/in/ahmedissamramadan" target="_blank" rel="noopener" class="pill-btn">LinkedIn ↗</a>
          <a href="https://linkie.bio/ahmedissam" target="_blank" rel="noopener" class="pill-btn">linkie.bio ↗</a>
        </div>
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
              <h2 style="font-size:1.25rem;font-weight:600;">${escHtml(title)}</h2>
              <span class="work-badge">${t(w.origin)}</span>
            </div>
            <button id="lb-close" class="pill-btn" type="button">
              <img src="./icons/close.svg" class="icon" alt="Close" />
            </button>
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
                  ${cnt > 0 ? `<span style="font-weight:600">${cnt}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div class="lightbox-actions">
            <button id="lb-share" class="pill-btn" type="button">
              <img src="./icons/share.svg" class="icon" alt="" />
              <span>${t('copyLink')}</span>
            </button>
            <button id="lb-story" class="pill-btn" type="button">
              <img src="./icons/download.svg" class="icon" alt="" />
              <span>${t('exportStory')}</span>
            </button>
            ${w.external_url ? `
              <a href="${escHtml(w.external_url)}" target="_blank" rel="noopener" class="pill-btn active">${t('openExternal')}</a>
            ` : ''}
          </div>

          <div style="font-size:0.85rem;color:var(--muted);margin-top:6px;">${t('comments')} (${state.activeComments.length})</div>
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

function render() {
  const app = document.getElementById('app');
  let mainHtml = '';
  if (state.route.page === 'collection') {
    mainHtml = renderCollection(state.route.slug);
  } else if (state.route.page === 'about') {
    mainHtml = renderAbout();
  } else if (state.route.page === 'game') {
    mainHtml = '<div id="game-root"></div>';
  } else if (state.route.page === 'admin') {
    mainHtml = '<div id="admin-root"></div>';
  } else {
    mainHtml = renderHome();
  }

  app.innerHTML = `
    ${renderHeader()}
    <main>${mainHtml}</main>
    <footer class="site-footer">
      <div class="container">${t('footer')}</div>
    </footer>
    ${renderLightbox()}
  `;

  if (state.route.page === 'admin') {
    renderAdminPage(document.getElementById('admin-root'), state, loadData);
  }
  if (state.route.page === 'game') {
    renderGamePage(document.getElementById('game-root'), state);
  }

  document.getElementById('global-search')?.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    render();
    const inp = document.getElementById('global-search');
    if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  });

  document.querySelectorAll('[data-chapter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.chapter = btn.dataset.chapter;
      render();
    });
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => setLang(state.lang === 'en' ? 'ar' : 'en'));
  document.getElementById('profile-btn')?.addEventListener('click', () => showProfileModal());

  document.querySelectorAll('[data-origin]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.origin = btn.dataset.origin;
      render();
    });
  });

  document.querySelectorAll('[data-work-slug]').forEach(card => {
    card.addEventListener('click', () => {
      const work = state.works.find(w => w.slug === card.dataset.workSlug);
      if (work) openWork(work);
    });
  });

  document.getElementById('lb-close')?.addEventListener('click', closeWork);
  document.getElementById('lightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeWork();
  });
  document.querySelectorAll('.lb-react-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleReaction(state.activeWork.id, btn.dataset.rtype));
  });
  document.getElementById('lb-share')?.addEventListener('click', (e) => {
    navigator.clipboard?.writeText(window.location.href);
    e.currentTarget.querySelector('span').textContent = t('copied');
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

window.addEventListener('hashchange', () => {
  state.route = parseRoute();
  if (state.route.page === 'work') {
    const found = state.works.find(w => w.slug === state.route.slug);
    if (found) openWork(found, false);
  } else {
    state.activeWork = null;
    render();
  }
});

document.documentElement.lang = state.lang;
document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
ensureAuthSession().then(() => {
  loadData();
  subscribeRealtime();
});
