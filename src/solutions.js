import { supabase, notifyLeadAlert } from './lib/supabase.js';

const ABTI_PHASES = [
  { num: '01', en: 'Discover & Diagnose', ar: 'التشخيص وخط الأساس', descAr: 'فحص رحلة العميل الحالية ورصد أين تضيع الاستفسارات والوقت يومياً.', descEn: 'Audit current buyer journey and pinpoint daily inquiry and time leaks.' },
  { num: '02', en: 'Identify & Prioritize', ar: 'مصفوفة الفرص والأولويات', descAr: 'ترتيب حلول الأتمتة حسب العائد التجاري المباشر وسهولة التطبيق.', descEn: 'Rank automation opportunities by direct commercial impact vs. effort.' },
  { num: '03', en: 'Architect & Design', ar: 'هندسة الهوية والنظام', descAr: 'ضبط الرسالة التجارية، هيكلة الكتالوج، وتصميم مسار المساعد الذكي.', descEn: 'Structure positioning, catalog specs, and AI assistant conversation flows.' },
  { num: '04', en: 'Build & Implement', ar: 'البناء والربط والاختبار', descAr: 'تطوير المساعد الذكي وربطه بالواتساب واختباره على 20 سيناريو حقيقي.', descEn: 'Deploy catalog-trained WhatsApp assistant tested across 20 real scenarios.' },
  { num: '05', en: 'Enable & Adopt', ar: 'تمكين الفريق وتسليم SOPs', descAr: 'ضبط التحويل الفوري للفريق البشري وتسليم أدلة التشغيل المبسطة.', descEn: 'Configure instant human handoff triggers and deliver clear team SOPs.' },
  { num: '06', en: 'Measure & Optimize', ar: 'قياس خط الأساس والتوسع', descAr: 'مقارنة أرقام ما بعد 30 يوماً بخط الأساس قبل أي التزام شهري مستمر.', descEn: 'Verify 30-day baseline improvements before unlocking monthly scale.' }
];

const CAMPAIGN_MATRIX = [
  { stage: 'TOFU', channel: 'Instagram + LinkedIn Reels', ar: 'تشريح حقيقي في 45 ثانية: لماذا يخسر المصنع أو شركة التشطيب عميل الجملة في أول 10 ثوانٍ؟', en: '45s Real Teardown: Why factories and finishing firms lose B2B buyers in the first 10 seconds.' },
  { stage: 'MOFU', channel: 'LinkedIn Carousels (10-Slide Loop)', ar: 'حكايات موثقة من أنظمة بنيناها فعلياً: جدولة 92 ريل من قاعدة بيانات واحدة وتسليم هوية 32 صفحة في 7 أيام.', en: 'Verified system stories: 92 infinite-loop reels from one SQLite DB & a 32-page brand system in 7 days.' },
  { stage: 'BOFU', channel: 'Direct Teardown + WhatsApp 15m', ar: 'فيديو تشريح خاص (دقيقتين) مسجل باسم الشركة + مكالمة قرار مدتها 15 دقيقة لتأسيس Growth OS.', en: 'Private 2-minute screen teardown recorded for the prospect + focused 15-minute Growth OS decision call.' }
];

let currencyMode = 'egp';
let calcMissedWeekly = 12;
let calcOrderVal = 15000;
let calcRecoveryPct = 25;
let funnelStageFilter = 'ALL';
let teardownFeedback = '';

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderSolutionsPage(state) {
  const isAr = state.lang === 'ar';
  const offers = state.servicesOffers || [];
  const monthlyRecoveredDeals = Math.max(1, Math.round((calcMissedWeekly * 4 * calcRecoveryPct) / 100));
  const monthlyRecoveredValue = monthlyRecoveredDeals * calcOrderVal;

  const filteredMatrix = funnelStageFilter === 'ALL'
    ? CAMPAIGN_MATRIX
    : CAMPAIGN_MATRIX.filter(item => item.stage === funnelStageFilter);

  return `
    <section class="container" style="padding:40px 24px 72px;">
      <div class="section-head" style="margin-bottom:28px;">
        <div>
          <span class="section-kicker">02 · ${isAr ? 'تحوّل الأعمال ومنظومة Growth OS' : 'ABTI & GROWTH OS ENGINE'}</span>
          <h1 class="hero-title" style="margin-bottom:12px;">${isAr ? 'اللي بياخد وقتك كل يوم، يشتغل لوحده.' : 'What Eats Your Time Every Day, Runs on Its Own.'}</h1>
          <p class="hero-sub" style="margin-bottom:0;">
            ${isAr
              ? '73% من مشاريع الذكاء الاصطناعي تفشل لأنها تبدأ بالأداة لا بالمشكلة التجارية. بنينا سُلّماً واحداً واضحاً للشركات المتوسطة والمصانع وشركات التشطيبات في مصر والخليج.'
              : '73% of AI initiatives fail because they start with tools instead of commercial bottlenecks. One clear 4-step ladder built for factories, finishing firms, and SMEs in Egypt & GCC.'}
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="pill-btn ${currencyMode === 'egp' ? 'active' : ''}" data-currency="egp" type="button">${isAr ? 'مصر (ج.م)' : 'Egypt (EGP)'}</button>
          <button class="pill-btn ${currencyMode === 'usd' ? 'active' : ''}" data-currency="usd" type="button">${isAr ? 'الخليج والتصدير (USD)' : 'GCC & Export (USD)'}</button>
        </div>
      </div>

      <!-- Unified 4-Step Service Ladder -->
      <div class="offers-grid" style="margin-bottom:44px;">
        ${offers.map((off, idx) => {
          const price = currencyMode === 'egp' ? off.price_egp_label : off.price_usd_label;
          const delivs = isAr ? (off.deliverables_ar || []) : (off.deliverables_en || []);
          const featured = idx === 0 || idx === 2;
          return `
            <article class="offer-card ${featured ? 'offer-featured' : ''}">
              <div class="collection-meta">${esc(isAr ? off.badge_ar : off.badge_en)}</div>
              <h2 style="font-size:1.2rem;font-weight:700;margin:6px 0;">${esc(isAr ? off.title_ar : off.title_en)}</h2>
              <div class="offer-price">${esc(price)}</div>
              <p style="font-size:0.88rem;color:var(--muted);margin-bottom:14px;">${esc(isAr ? off.subtitle_ar : off.subtitle_en)}</p>
              <ul class="offer-list">
                ${delivs.map(d => `<li><span>•</span><span>${esc(d)}</span></li>`).join('')}
              </ul>
              <div style="margin-top:auto;padding-top:16px;display:flex;flex-direction:column;gap:8px;">
                <a href="${idx === 0 ? (isAr ? 'https://wa.me/201501656010?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B%20%D8%A3%D8%AD%D9%85%D8%AF%D8%8C%20%D8%B9%D8%A7%D9%8A%D8%B2%20Teardown%20%D9%85%D8%AC%D8%A7%D9%86%D9%8A%20%D9%84%D8%AD%D8%B3%D8%A7%D8%A8%D9%8A%2F%D9%85%D9%88%D9%82%D8%B9%D9%8A%3A%20' : 'https://wa.me/201501656010?text=Hi%20Ahmed%2C%20I%27d%20like%20a%20free%202-min%20teardown%20for%3A%20') : '#teardown-box'}" ${idx === 0 ? 'target="_blank" rel="noopener"' : ''} class="pill-btn ${featured ? 'active' : ''}" style="width:100%;justify-content:center;">
                  ${esc(isAr ? off.cta_ar : off.cta_en)}
                </a>
                ${idx === 2 ? `<a href="/${state.lang}/proof/" data-nav="/${state.lang}/proof/" class="pill-btn" style="width:100%;justify-content:center;">${isAr ? 'شوفه شغال على الهوا ←' : 'See it running live ->'}</a>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <!-- 6-Phase ABTI Execution Framework -->
      <div style="margin-bottom:44px;">
        <span class="section-kicker">${isAr ? 'المنهجية الهندسية (6 مراحل)' : '6-PHASE EXECUTION METHODOLOGY'}</span>
        <h2 class="section-title" style="margin-bottom:18px;">${isAr ? 'منهجية ABTI لتحوّل الأعمال بدون فوضى' : 'ABTI Business Transformation Framework'}</h2>
        <div class="abti-grid">
          ${ABTI_PHASES.map(p => `
            <div class="about-card" style="padding:18px;">
              <div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--muted);margin-bottom:4px;">PHASE ${p.num}</div>
              <div style="font-weight:700;font-size:1rem;margin-bottom:6px;">${isAr ? p.ar : p.en}</div>
              <p style="font-size:0.85rem;color:var(--muted);">${isAr ? p.descAr : p.descEn}</p>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Interactive Lost-Lead Calculator + Free 2-Min Teardown Form -->
      <div id="teardown-box" class="contact-grid" style="margin-bottom:44px;align-items:stretch;">
        <div class="about-card" style="display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <span class="section-kicker">${isAr ? 'حاسبة شفافة بدون أرقام مختلقة' : 'TRANSPARENT REVENUE-LEAK CALCULATOR'}</span>
            <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">
              ${isAr ? 'احسب تكلفة الاستفسارات التي يتأخر الرد عليها' : 'Calculate the Cost of Delayed Inquiry Replies'}
            </h2>
            <p style="font-size:0.86rem;color:var(--muted);margin-bottom:18px;">
              ${isAr
                ? 'من أين جاءت الأرقام؟ تحسب هذه المعادلة مباشرة من أرقام شركتك الفعلية: الاستفسارات الليلية أو المتأخرة أسبوعياً × نسبة الاسترداد عند الرد في ثوانٍ × متوسط قيمة الطلب.'
                : 'Where do these numbers come from? Computed strictly from your own inputs: weekly delayed/after-hours inquiries x instant-reply recovery rate x average order value.'}
            </p>

            <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
              <label style="font-size:0.85rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span>${isAr ? 'استفسارات أسبوعية يتأخر الرد عليها (ليلاً / جمعة / ضغط):' : 'Weekly delayed or after-hours inquiries:'}</span>
                  <strong style="font-family:var(--font-mono);">${calcMissedWeekly}</strong>
                </div>
                <input id="calc-missed" type="range" min="2" max="80" value="${calcMissedWeekly}" style="width:100%;" />
              </label>

              <label style="font-size:0.85rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span>${isAr ? `متوسط قيمة الطلب أو التعاقد (${currencyMode === 'egp' ? 'ج.م' : 'USD'}):` : `Average order / contract value (${currencyMode.toUpperCase()}):`}</span>
                  <strong style="font-family:var(--font-mono);">${calcOrderVal.toLocaleString()}</strong>
                </div>
                <input id="calc-val" type="number" min="100" step="500" value="${calcOrderVal}" class="input" />
              </label>

              <label style="font-size:0.85rem;">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                  <span>${isAr ? 'نسبة الطلبات المستردة بالرد الفوري المنظم:' : 'Conservative conversion rate on rescued leads:'}</span>
                  <strong style="font-family:var(--font-mono);">${calcRecoveryPct}%</strong>
                </div>
                <input id="calc-pct" type="range" min="5" max="60" value="${calcRecoveryPct}" style="width:100%;" />
              </label>
            </div>
          </div>

          <div class="calc-result-box">
            <div style="font-size:0.8rem;color:var(--muted);">${isAr ? 'فرص شهرية قابلة للاسترداد قبل نهاية الشهر الأول:' : 'Estimated monthly recoverable revenue:'}</div>
            <div style="font-size:1.85rem;font-weight:700;font-family:var(--font-mono);margin:4px 0;">
              ${monthlyRecoveredValue.toLocaleString()} ${currencyMode === 'egp' ? (isAr ? 'ج.م / شهرياً' : 'EGP / mo') : 'USD / mo'}
            </div>
            <div style="font-size:0.8rem;color:var(--muted);">
              ${isAr ? `يعادل تقريباً ${monthlyRecoveredDeals} طلبات شهرية كانت تضيع بسبب تأخر الرد أو غياب الكتالوج الواضح.` : `Approx. ${monthlyRecoveredDeals} monthly orders rescued via instant 24/7 catalog qualification.`}
            </div>
          </div>
        </div>

        <!-- 2-Minute Teardown Request Engine -->
        <div class="about-card">
          <span class="section-kicker">${isAr ? 'ماكينة التشريح المجاني · خلال 24 ساعة' : 'FREE 2-MINUTE TEARDOWN ENGINE'}</span>
          <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:8px;">
            ${isAr ? 'اطلب فيديو تشريح خاص (دقيقتين) لحسابك أو موقعك' : 'Request a Private 2-Minute Video Teardown'}
          </h2>
          <p style="font-size:0.86rem;color:var(--muted);margin-bottom:16px;">
            ${isAr
              ? 'أسجّل لك شاشة حسابك أو موقعك بصوتي لمدة دقيقتين: 3 أماكن يضيع فيها العميل، وتعديل واحد تطبقه اليوم بنفسك بدون أي التزام.'
              : 'I personally record a 2-minute screen audit of your account or website showing 3 buyer leak points and 1 fix you can apply today.'}
          </p>
          <form id="teardown-request-form" style="display:flex;flex-direction:column;gap:10px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <input id="td-name" class="input" type="text" placeholder="${isAr ? 'اسمك الكريم' : 'Your Name'}" required />
              <input id="td-company" class="input" type="text" placeholder="${isAr ? 'اسم الشركة أو المصنع' : 'Company / Factory Name'}" required />
            </div>
            <input id="td-url" class="input" type="text" placeholder="${isAr ? '1. رابط الحساب (إنستجرام / لينكدإن) أو الموقع' : '1. Account or Website URL'}" required />
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <select id="td-model" class="input">
                <option value="b2b_wholesale">${isAr ? '2. نبيع جملة / للشركات (B2B)' : '2. Wholesale / B2B'}</option>
                <option value="finishing_services">${isAr ? '2. تشطيبات / مقاولات / خدمات' : '2. Finishing / Contracting / Services'}</option>
                <option value="b2c_brand">${isAr ? '2. بيع مباشر للأفراد (B2C)' : '2. Direct to Consumer (B2C)'}</option>
                <option value="export_gcc">${isAr ? '2. تصدير وخليج' : '2. Export & GCC'}</option>
              </select>
              <select id="td-channel" class="input">
                <option value="whatsapp">${isAr ? '3. التواصل الأكثر: واتساب' : '3. Main Channel: WhatsApp'}</option>
                <option value="instagram_fb">${isAr ? '3. رسائل إنستجرام / فيسبوك' : '3. Instagram / Facebook DMs'}</option>
                <option value="phone">${isAr ? '3. مكالمات تليفون' : '3. Phone Calls'}</option>
                <option value="website">${isAr ? '3. الموقع الإلكتروني' : '3. Website Forms'}</option>
              </select>
            </div>
            <input id="td-contact" class="input" type="text" placeholder="${isAr ? 'رقم الواتساب أو البريد لاستلام الفيديو خلال 24 ساعة' : 'WhatsApp Number or Email to receive the 2-min video'}" required />
            <button class="pill-btn active" type="submit" style="justify-content:center;padding:12px;">
              ${isAr ? 'أرسل طلب التشريح المجاني الآن' : 'Send Free 2-Min Teardown Request'}
            </button>
            ${teardownFeedback ? `<div style="font-size:0.86rem;color:#10B981;font-weight:600;margin-top:4px;">${esc(teardownFeedback)}</div>` : ''}
          </form>
        </div>
      </div>

      <!-- Omnichannel Campaign Architecture (Absorbed from Site 03) -->
      <div class="about-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <div>
            <span class="section-kicker">${isAr ? 'معمارية المحتوى والاستحواذ' : 'OMNICHANNEL CONTENT ARCHITECTURE'}</span>
            <h2 style="font-size:1.2rem;font-weight:700;">${isAr ? 'كيف يعمل محرك المحتوى والبيع معاً (TOFU / MOFU / BOFU)' : 'How the Content & Conversion Engine Operates'}</h2>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${['ALL', 'TOFU', 'MOFU', 'BOFU'].map(st => `
              <button class="pill-btn ${funnelStageFilter === st ? 'active' : ''}" data-funnel-stage="${st}" type="button">${st}</button>
            `).join('')}
          </div>
        </div>
        <div class="abti-grid">
          ${filteredMatrix.map(item => `
            <div style="padding:16px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);">
              <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:0.75rem;margin-bottom:8px;">
                <span style="font-weight:700;">${item.stage}</span>
                <span style="color:var(--muted);">${item.channel}</span>
              </div>
              <p style="font-size:0.88rem;">${isAr ? item.ar : item.en}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

export function bindSolutionsEvents(state, rerender) {
  document.querySelectorAll('[data-currency]').forEach(btn => {
    btn.addEventListener('click', () => {
      currencyMode = btn.dataset.currency;
      calcOrderVal = currencyMode === 'egp' ? 15000 : 1200;
      rerender();
    });
  });

  document.querySelectorAll('[data-funnel-stage]').forEach(btn => {
    btn.addEventListener('click', () => {
      funnelStageFilter = btn.dataset.funnelStage;
      rerender();
    });
  });

  document.getElementById('calc-missed')?.addEventListener('input', (e) => {
    calcMissedWeekly = Number(e.target.value) || 2;
    rerender();
  });

  document.getElementById('calc-val')?.addEventListener('change', (e) => {
    calcOrderVal = Math.max(100, Number(e.target.value) || 1000);
    rerender();
  });

  document.getElementById('calc-pct')?.addEventListener('input', (e) => {
    calcRecoveryPct = Number(e.target.value) || 10;
    rerender();
  });

  document.getElementById('teardown-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      sender_name: document.getElementById('td-name').value.trim(),
      company_name: document.getElementById('td-company').value.trim(),
      account_or_site_url: document.getElementById('td-url').value.trim(),
      sales_model: document.getElementById('td-model').value,
      primary_channel: document.getElementById('td-channel').value,
      contact_info: document.getElementById('td-contact').value.trim()
    };
    if (!payload.sender_name || !payload.account_or_site_url || !payload.contact_info) return;

    const { error } = await supabase.from('teardown_requests').insert(payload);
    if (error) {
      teardownFeedback = error.message;
    } else {
      notifyLeadAlert('teardown_request', payload);
      teardownFeedback = state.lang === 'ar'
        ? 'تم استلام طلب التشريح بنجاح! سأسجل لك الفيديو المخصص (دقيقتين) وأرسله خلال 24 ساعة.'
        : 'Teardown request received! Your custom 2-minute video audit will be sent within 24 hours.';
    }
    rerender();
  });
}
