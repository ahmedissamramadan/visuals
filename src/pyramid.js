const PYRAMID_QUESTIONS = [
  {
    ar: '1. هل تنطلق من مكتبة سياق وملف هوية واحد موثق قبل أي بناء أو نشر؟',
    en: '1. Do you start from a documented context library and single DNA file before building?'
  },
  {
    ar: '2. هل تفوّض مهام ومشاريع متكاملة لوكلاء ذكاء اصطناعي بدلاً من الأسئلة المنفصلة؟',
    en: '2. Do you delegate multi-step workflows to AI agents rather than isolated prompts?'
  },
  {
    ar: '3. هل لديك بوابة مراجعة جودة صارمة تمنع تأليف الأرقام وتضبط النبرة قبل النشر؟',
    en: '3. Do you enforce a QA gate verifying real numbers and tone before publishing?'
  },
  {
    ar: '4. هل تربط قنوات التواصل وقواعد البيانات عبر أتمتة حية (Supabase / n8n / MCP)؟',
    en: '4. Are your channels and databases connected via live automation (Supabase / n8n / MCP)?'
  },
  {
    ar: '5. هل تقيس أثر الذكاء الاصطناعي بوقت موفَّر واستفسارات عملاء مخدومة فعلياً؟',
    en: '5. Do you measure AI impact by real hours saved and rescued customer inquiries?'
  }
];

const PYRAMID_TIERS = [
  { tier: 5, width: '60%', ar: 'المستوى 5 · مهندس المنظومات السيادية', en: 'TIER 5 · Sovereign Systems Architect' },
  { tier: 4, width: '70%', ar: 'المستوى 4 · مفوِّض الوكلاء والأتمتة الحية', en: 'TIER 4 · Agent & Automation Orchestrator' },
  { tier: 3, width: '80%', ar: 'المستوى 3 · باني هندسة السياق والمعرفة', en: 'TIER 3 · Context & Knowledge Engineer' },
  { tier: 2, width: '90%', ar: 'المستوى 2 · منظم الأوامر وأدلة التشغيل SOPs', en: 'TIER 2 · Prompt Library & SOP Builder' },
  { tier: 1, width: '100%', ar: 'المستوى 1 · الاستهلاك العشوائي للأدوات', en: 'TIER 1 · Ad-hoc Tool Consumer' }
];

let pyramidVals = [4, 4, 4, 4, 4];
let iconsCatalogCache = null;
let iconSearch = '';
let iconCategory = 'ALL';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function ensureIconsCatalog() {
  if (iconsCatalogCache) return iconsCatalogCache;
  try {
    const res = await fetch('/dna/icons-catalog.json');
    if (res.ok) iconsCatalogCache = await res.json();
  } catch {
    iconsCatalogCache = { icons: [] };
  }
  return iconsCatalogCache || { icons: [] };
}

export function renderPyramidSection(isAr) {
  const total = pyramidVals.reduce((a, b) => a + b, 0);
  let activeTier = 1;
  if (total >= 22) activeTier = 5;
  else if (total >= 17) activeTier = 4;
  else if (total >= 12) activeTier = 3;
  else if (total >= 8) activeTier = 2;

  const currentTierObj = PYRAMID_TIERS.find(t => t.tier === activeTier);

  return `
    <div id="ai-pyramid-section" class="about-card" style="margin-bottom:36px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
        <div>
          <span class="section-kicker">${isAr ? 'هرم النضج والانعكاس الذاتي' : 'THE AI MATURITY PYRAMID'}</span>
          <h2 style="font-size:1.3rem;font-weight:700;">${isAr ? 'أين تقف الآن في هرم الذكاء الاصطناعي؟' : 'Where Do You Stand on the AI Maturity Pyramid?'}</h2>
        </div>
        <span class="pill-btn active" style="font-family:var(--font-mono);">${total} / 25</span>
      </div>

      <div class="contact-grid" style="align-items:center;">
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
          ${PYRAMID_TIERS.map(t => `
            <div style="width:${t.width};padding:11px 14px;border-radius:12px;text-align:center;font-size:0.82rem;font-weight:${t.tier === activeTier ? '700' : '500'};background:${t.tier === activeTier ? 'var(--accent)' : 'var(--surface-2)'};color:${t.tier === activeTier ? 'var(--accent-ink)' : 'var(--text)'};border:1px solid var(--border);transition:all 0.2s;">
              ${isAr ? t.ar : t.en}
            </div>
          `).join('')}
          <div style="font-size:0.76rem;color:var(--muted);margin-top:6px;text-align:center;">
            ${isAr ? 'مقياس تشخيصي ذاتي مبني على هندسة النظم وتطبيقات الإنتاج الفعلية.' : 'Self-diagnostic scale grounded in real production systems engineering.'}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${PYRAMID_QUESTIONS.map((q, idx) => `
            <div style="padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;gap:8px;font-size:0.82rem;margin-bottom:4px;">
                <span>${isAr ? q.ar : q.en}</span>
                <strong style="font-family:var(--font-mono);">${pyramidVals[idx]}/5</strong>
              </div>
              <input type="range" min="1" max="5" value="${pyramidVals[idx]}" data-pyr-idx="${idx}" style="width:100%;" />
            </div>
          `).join('')}
          <div style="padding:12px 14px;border-radius:12px;border:1px solid var(--border);font-weight:700;font-size:0.9rem;">
            ${isAr ? `تشخيصك الحالي: ${currentTierObj.ar}` : `Current Tier: ${currentTierObj.en}`}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindPyramidEvents(rerender) {
  document.querySelectorAll('[data-pyr-idx]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = Number(inp.dataset.pyrIdx);
      pyramidVals[idx] = Number(e.target.value) || 1;
      rerender();
    });
  });
}

export function renderIconSystemLab(isAr) {
  const catalog = iconsCatalogCache || { icons: [] };
  const allIcons = catalog.icons || [];
  const categories = ['ALL', ...Array.from(new Set(allIcons.map(i => i.category).filter(Boolean)))];
  const q = iconSearch.trim().toLowerCase();

  const filtered = allIcons.filter(ic => {
    const matchCat = iconCategory === 'ALL' || ic.category === iconCategory;
    const matchQ = !q || `${ic.id} ${ic.name_ar} ${ic.name_en} ${ic.slug}`.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return `
    <div class="about-card" style="margin-top:36px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        <div>
          <span class="section-kicker">${isAr ? 'مختبر الهوية الهندسية · 216 أيقونة' : 'GEOMETRIC ICON SYSTEM v2.0 · 216 ICONS'}</span>
          <h2 style="font-size:1.3rem;font-weight:700;">${isAr ? 'نظام أيقونات Artelligence القياسي (شبكة 48px · زاوية 56.9°)' : 'Artelligence 216 Vector Icon System (48px Grid · 56.9°)'}</h2>
          <p style="font-size:0.85rem;color:var(--muted);margin-top:4px;">
            ${isAr ? 'كل أيقونة مبنية بسُمك خط 2.4px وتحتوي على نقطة أصل منفردة تجذب العين.' : 'Every icon is built with a 2.4px stroke and contains a single isolated origin dot.'}
          </p>
        </div>
        <input id="icon-lab-search" class="input" style="max-width:260px;" type="search" placeholder="${isAr ? 'ابحث في 216 أيقونة...' : 'Search 216 icons...'}" value="${esc(iconSearch)}" />
      </div>

      <div class="filter-bar" style="margin-bottom:18px;">
        ${categories.slice(0, 10).map(cat => `
          <button class="pill-btn ${iconCategory === cat ? 'active' : ''}" data-icon-cat="${esc(cat)}" type="button">
            ${cat === 'ALL' ? (isAr ? `الكل (${allIcons.length})` : `All (${allIcons.length})`) : esc(cat)}
          </button>
        `).join('')}
      </div>

      <div class="icons-showcase-grid">
        ${filtered.slice(0, 48).map(ic => `
          <div class="icon-tile" title="${esc(ic.name_en)}">
            <div class="icon-svg-wrap">
              <img src="${esc(ic.file)}" alt="${esc(isAr ? ic.name_ar : ic.name_en)}" loading="lazy" />
            </div>
            <div style="font-size:0.74rem;font-weight:600;text-align:center;line-height:1.25;">${esc(isAr ? ic.name_ar : ic.name_en)}</div>
            <div style="font-family:var(--font-mono);font-size:0.66rem;color:var(--muted);">#${esc(ic.id)}</div>
          </div>
        `).join('')}
      </div>
      ${filtered.length > 48 ? `<div style="font-size:0.8rem;color:var(--muted);margin-top:12px;text-align:center;">${isAr ? `يعرض أول 48 من أصل ${filtered.length} أيقونة مطابقة. استخدم البحث لاستعراض أي أيقونة بالاسم أو الرقم.` : `Showing 48 of ${filtered.length} matching icons. Use search to filter any icon by name or ID.`}</div>` : ''}
    </div>
  `;
}

export function bindIconLabEvents(rerender) {
  document.getElementById('icon-lab-search')?.addEventListener('input', (e) => {
    iconSearch = e.target.value;
    rerender();
    const el = document.getElementById('icon-lab-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });
  document.querySelectorAll('[data-icon-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      iconCategory = btn.dataset.iconCat;
      rerender();
    });
  });
}

export function renderAcademyPage(state) {
  const isAr = state.lang === 'ar';
  const products = state.digitalProducts || [];
  const apkUrl = 'https://github.com/ahmedissamramadan/visuals-android/releases/latest/download/Artelligence.apk';
  const macRepoUrl = 'https://github.com/ahmedissamramadan/Artelligence-OS';

  return `
    <section class="container" style="padding:40px 24px 72px;">
      <span class="section-kicker">06 · ${isAr ? 'التطبيقات الرسمية والأكاديمية والأنظمة' : 'OFFICIAL APPS, ACADEMY & SYSTEMS'}</span>
      <h1 class="hero-title">${isAr ? 'منظومة تطبيقات ومناهج Artelligence' : 'Artelligence Native Apps, Academy & Systems'}</h1>
      <p class="hero-sub">
        ${isAr
          ? 'حمّل التطبيق الرسمي على هاتفك أو حاسوبك، واستكشف المناهج التعليمية وأدوات الوكلاء المبنية بنفس المعايير الهندسية.'
          : 'Download the native Android and macOS applications, and explore interactive curricula and autonomous agent suites.'}
      </p>

      <!-- Official Multi-Platform Apps Hub -->
      <div class="contact-grid" style="margin-bottom:40px;">
        <div class="about-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
          <div>
            <span class="section-kicker">ANDROID SUPER-APP · SIGNED APK</span>
            <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:6px;">
              ${isAr ? 'تطبيق Artelligence الأصلي للأندرويد (v2.0)' : 'Artelligence Native Android App (v2.0)'}
            </h2>
            <p style="font-size:0.88rem;color:var(--muted);">
              ${isAr
                ? 'مبني بالكامل بـ Kotlin و Jetpack Compose: يجمع سُلّم الحلول، خزينة الأدلة، داخل عقلي، المتحف البصري، التحدي التفاعلي، واستوديو القيادة والـ Mini-CRM مع تحديث مباشر بدون حذف.'
                : 'Built natively with Kotlin & Jetpack Compose: full bilingual public experience plus Executive Admin Studio, Mini-CRM, and seamless in-place updates.'}
            </p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${apkUrl}" class="pill-btn active">${isAr ? 'تحميل Artelligence.apk مباشرة ↓' : 'Download Artelligence.apk ↓'}</a>
            <a href="https://github.com/ahmedissamramadan/visuals-android/releases/latest" target="_blank" rel="noopener" class="pill-btn">${isAr ? 'صفحة الإصدارات ↗' : 'Release Notes ↗'}</a>
          </div>
        </div>

        <div class="about-card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
          <div>
            <span class="section-kicker">MACOS APPLE SILICON · DESKTOP OS</span>
            <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:6px;">
              ${isAr ? 'تطبيق سطح المكتب Artelligence OS (macOS)' : 'Artelligence OS Desktop Orchestrator (macOS)'}
            </h2>
            <p style="font-size:0.88rem;color:var(--muted);">
              ${isAr
                ? 'مركز قيادة مكتبي مستقل لمعالجات M1/M2/M3 في شريط القوائم العلوي لتنسيق الوكلاء ومزامنة الـ Mini-CRM وطلبات التشريح لحظياً مع السحابة.'
                : 'Native menu-bar & desktop command center for Apple Silicon syncing live CRM deals, teardown requests, and mind notes with Supabase.'}
            </p>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${macRepoUrl}" target="_blank" rel="noopener" class="pill-btn active">${isAr ? 'مستودع وتحميل macOS ↗' : 'Open Artelligence OS Repo ↗'}</a>
          </div>
        </div>
      </div>

      <!-- Academy & Systems Showcase Grid -->
      <div class="section-head">
        <div>
          <span class="section-kicker">${isAr ? 'مكتبة المناهج والأنظمة المفتوحة' : 'CURRICULA, GUIDES & AGENT SUITES'}</span>
          <h2 class="section-title">${isAr ? 'برامج معرفية وأنظمة مرجعية حية' : 'Reference Portals & Engineering Suites'}</h2>
        </div>
      </div>

      <div class="case-grid" style="margin-bottom:36px;">
        ${products.map(prod => {
          const isInternal = (prod.live_url || '').startsWith('/');
          return `
            <article class="case-card">
              <div class="case-body">
                <div class="collection-meta">${esc(isAr ? prod.stats_badge_ar : prod.stats_badge_en)}</div>
                <h3 style="font-size:1.15rem;font-weight:700;">${esc(isAr ? prod.title_ar : prod.title_en)}</h3>
                <p style="font-size:0.88rem;color:var(--muted);flex:1;">${esc(isAr ? prod.description_ar : prod.description_en)}</p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;">
                  ${prod.live_url ? (
                    isInternal
                      ? `<a href="${esc(prod.live_url)}" data-nav="${esc(prod.live_url)}" class="pill-btn active">${isAr ? 'استعرض داخل التطبيق' : 'Explore In-App'}</a>`
                      : `<a href="${esc(prod.live_url)}" target="_blank" rel="noopener" class="pill-btn active">${isAr ? 'افتح البوابة التفاعلية ↗' : 'Open Live Portal ↗'}</a>`
                  ) : ''}
                </div>
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <!-- Single Commercial Focus Banner -->
      <div class="game-banner">
        <div style="flex:1;min-width:260px;">
          <span class="section-kicker">${isAr ? 'تركيز الأعمال الحالي' : 'PRIMARY COMMERCIAL TRACK'}</span>
          <h2 style="font-size:1.35rem;font-weight:700;margin-bottom:8px;">
            ${isAr ? 'هل تدير مصنعاً أو شركة تشطيبات أو شركة متوسطة؟' : 'Running a Factory, Finishing Firm, or Growing SME?'}
          </h2>
          <p style="color:var(--muted);font-size:0.9rem;">
            ${isAr
              ? 'جميع الأدلة والمناهج أعلاه متاحة لبناء الوعي والثقة، بينما يتركز العمل الاستشاري والتنفيذي المباشر على تأسيس نظام Growth OS لشركتك.'
              : 'All portals above are open reference proof, while direct implementation focuses exclusively on deploying Growth OS for your business.'}
          </p>
        </div>
        <a href="/solutions" data-nav="/solutions" class="pill-btn active">${isAr ? 'اطلب فيديو التشريح المجاني (دقيقتين)' : 'Request Free 2-Min Teardown'}</a>
      </div>
    </section>
  `;
}
