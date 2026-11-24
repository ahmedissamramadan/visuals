import { supabase, SUPABASE_URL } from './lib/supabase.js';

let activeStudioTab = 'crm'; // 'crm' | 'mind' | 'proof' | 'content' | 'archive'
let curationFilter = 'all';
let selectedAdminCollectionId = null;

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function resizeToWebP(file, maxWidth, quality = 0.82) {
  const img = await createImageBitmap(file);
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
  return { blob, width: img.width, height: img.height };
}

async function makeBlurDataUrl(file) {
  const { blob } = await resizeToWebP(file, 24, 0.4);
  return await new Promise((res) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result);
    r.readAsDataURL(blob);
  });
}

export async function checkIsAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return null;
  const { data } = await supabase.from('profiles').select('id, display_name, role').eq('id', user.id).single();
  return data?.role === 'artist' ? data : null;
}

async function logAudit(admin, action, targetType, targetId, details = {}) {
  try {
    await supabase.from('admin_audit_logs').insert({
      admin_id: admin.id,
      admin_name: admin.display_name,
      action,
      target_type: targetType,
      target_id: String(targetId),
      details
    });
  } catch {
    // Non-blocking audit log
  }
}

function runDnaComplianceCheck(text) {
  const issues = [];
  if (/\u2014/.test(text)) issues.push('يحتوي على الشرطة الطويلة المحظورة (Em Dash)');
  if (/AI Ambassador|14 مدير|Sovereign Digital Enterprise/i.test(text)) issues.push('يحتوي على مسميات قديمة ملغاة');
  if (/ahmedissam\.personal@gmail\.com/i.test(text)) issues.push('يحتوي على البريد الشخصي بدلاً من ahmedissam.work@gmail.com');
  return issues;
}

function buildOutreachMessage(type, company, person) {
  const name = person || 'أهلاً بك';
  const comp = company || 'شركتكم';
  if (type === 'day3') {
    return `${name}، لحقت تشوف الفيديو؟ النقطة التالتة (وقت الرد على الاستفسارات) هي اللي غالباً بتفرق أكتر في الجملة والتعاقدات.`;
  }
  if (type === 'day7') {
    return `مش هزنّ عليك تاني، لو الموضوع بقى أولوية بعدين الفيديو عندك، وأنا موجود على الواتساب +20 150 165 6010. أحمد · Artelligence`;
  }
  return `أهلاً ${name}، عملت تشريح سريع (دقيقتين) لحساب ${comp}، وطلّعت فيه 3 أماكن ممكن يكون بيضيع فيها عميل، وحاجة تقدروا تعدّلوها النهارده من غير أي حد. مش عرض بيع، لو لقيته مفيد يسعدني أوريك الباقي في 15 دقيقة. أحمد · Artelligence`;
}

export async function renderAdminPage(container, state, onRefresh) {
  const admin = await checkIsAdmin();
  const isAr = state.lang === 'ar';

  if (!admin) {
    container.innerHTML = `
      <section class="container" style="max-width:440px;margin:64px auto;">
        <div class="about-card">
          <span class="section-kicker">ARTELLIGENCE COMMAND STUDIO</span>
          <h1 class="section-title" style="margin-bottom:8px;">${isAr ? 'دخول مركز القيادة' : 'Executive Studio Sign-In'}</h1>
          <p style="font-size:0.84rem;color:var(--muted);margin-bottom:16px;">
            ${isAr ? 'مخصص لإدارة الـ Mini-CRM، طلبات التشريح، المحتوى، والمجموعات مع تسجيل كامل في سجل التدقيق.' : 'Restricted to authorized studio administrators. All actions are recorded in the audit log.'}
          </p>
          <form id="admin-login-form" style="display:flex;flex-direction:column;gap:12px;">
            <input id="adm-user" class="input" type="text" autocomplete="username" placeholder="${isAr ? 'البريد الإلكتروني أو المعرّف' : 'Email or Admin Handle'}" required />
            <input id="adm-pass" class="input" type="password" autocomplete="current-password" placeholder="${isAr ? 'كلمة المرور' : 'Password'}" required />
            <div id="adm-err" style="color:var(--danger);font-size:0.85rem;"></div>
            <button class="pill-btn active" type="submit" style="justify-content:center;padding:11px;">${isAr ? 'تسجيل الدخول الآمن' : 'Secure Sign In'}</button>
          </form>
        </div>
      </section>
    `;
    container.querySelector('#admin-login-form').onsubmit = async (e) => {
      e.preventDefault();
      const rawUser = container.querySelector('#adm-user').value.trim();
      const email = rawUser.toLowerCase() === 'boda890'
        ? 'bodykhaled5000@gmail.com'
        : rawUser.toLowerCase() === 'admin'
          ? 'ahmedissam.personal@gmail.com'
          : rawUser;
      const password = container.querySelector('#adm-pass').value;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        container.querySelector('#adm-err').textContent = error.message;
        return;
      }
      renderAdminPage(container, state, onRefresh);
    };
    return;
  }

  const [
    { data: allCols },
    { data: allWorks },
    { data: allComments },
    { data: allInquiries },
    { data: allNotes },
    { data: allCases },
    { data: crmDeals },
    { data: teardowns },
    { data: contentItems },
    { data: auditLogs }
  ] = await Promise.all([
    supabase.from('collections').select('*').order('sort_order'),
    supabase.from('works').select('*').order('created_at', { ascending: false }).limit(250),
    supabase.from('comments').select('id, body, is_hidden, created_at, profiles(display_name), works(title_en, title_ar)').order('created_at', { ascending: false }).limit(30),
    supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(40),
    supabase.from('mind_notes').select('*').order('sort_order'),
    supabase.from('case_studies').select('*').order('sort_order'),
    supabase.from('crm_deals').select('*').order('created_at', { ascending: false }),
    supabase.from('teardown_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('content_pipeline').select('*').order('created_at', { ascending: false }),
    supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(25)
  ]);

  const deals = crmDeals || [];
  const signedDeals = deals.filter(d => d.is_signed === true);
  const signedEgp = signedDeals.reduce((s, d) => s + Number(d.signed_amount_egp || 0), 0);
  const signedUsdMrr = signedDeals.reduce((s, d) => s + Number(d.signed_mrr_usd || 0), 0);
  const colsList = allCols || [];
  const worksList = allWorks || [];

  const studioTabs = [
    { id: 'crm', ar: `الـ Mini-CRM والتشريح (${(teardowns || []).filter(t => t.status === 'new').length} جديد)`, en: `Mini-CRM & Teardowns (${(teardowns || []).filter(t => t.status === 'new').length})` },
    { id: 'mind', ar: `الرسائل وعقلي (${(allInquiries || []).filter(i => !i.is_resolved).length})`, en: `Inquiries & Mind (${(allInquiries || []).filter(i => !i.is_resolved).length})` },
    { id: 'proof', ar: `دراسات الحالة والخصوصية (${(allCases || []).length})`, en: `Proof & Anonymization (${(allCases || []).length})` },
    { id: 'content', ar: `مصنع المحتوى 4 بوابات (${(contentItems || []).length})`, en: `4-Gate Content (${(contentItems || []).length})` },
    { id: 'archive', ar: `المجموعات وسجل التدقيق (${colsList.length})`, en: `Collections & Audit (${colsList.length})` }
  ];

  let tabBodyHtml = '';

  if (activeStudioTab === 'crm') {
    tabBodyHtml = `
      <!-- Honest Revenue Metrics (Signed Contracts Only!) -->
      <div class="abti-grid" style="margin-bottom:24px;">
        <div class="about-card" style="padding:18px;">
          <div class="collection-meta">${isAr ? 'العقود الموقّعة فعلياً (مصر)' : 'VERIFIED SIGNED CONTRACTS (EGP)'}</div>
          <div style="font-size:1.75rem;font-weight:700;font-family:var(--font-mono);margin-top:4px;">${signedEgp.toLocaleString()} EGP</div>
          <div style="font-size:0.76rem;color:var(--muted);">${isAr ? `${signedDeals.length} عقود موقعة (لا تُحتسب العروض غير الموقعة)` : `${signedDeals.length} signed deals (unsigned pipeline excluded)`}</div>
        </div>
        <div class="about-card" style="padding:18px;">
          <div class="collection-meta">${isAr ? 'إيراد شهري موقّع (الخليج والتصدير)' : 'SIGNED MONTHLY MRR (USD)'}</div>
          <div style="font-size:1.75rem;font-weight:700;font-family:var(--font-mono);margin-top:4px;">$${signedUsdMrr.toLocaleString()} / mo</div>
          <div style="font-size:0.76rem;color:var(--muted);">${isAr ? 'قاعدة الصدق المالي: العقود المفعلة فقط' : 'Strict honest accounting: active retainers only'}</div>
        </div>
        <div class="about-card" style="padding:18px;">
          <div class="collection-meta">${isAr ? 'فرص قيد المتابعة (خطة 21 يوماً)' : 'ACTIVE 21-DAY PIPELINE'}</div>
          <div style="font-size:1.75rem;font-weight:700;font-family:var(--font-mono);margin-top:4px;">${deals.length}</div>
          <div style="font-size:0.76rem;color:var(--muted);">${isAr ? `طلبات تشريح واردة من الموقع: ${(teardowns || []).length}` : `Inbound 2-min teardown requests: ${(teardowns || []).length}`}</div>
        </div>
      </div>

      <!-- Inbound 2-Min Teardown Requests -->
      <div class="about-card" style="margin-bottom:24px;">
        <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? `طلبات فيديو التشريح الواردة (${(teardowns || []).length})` : `Inbound 2-Minute Teardown Queue (${(teardowns || []).length})`}</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(teardowns || []).length ? (teardowns || []).map(td => `
            <div class="comment-item" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
              <div>
                <div style="font-weight:700;">${esc(td.sender_name)} · ${esc(td.company_name)} <span class="work-badge">${esc(td.sales_model)}</span></div>
                <div style="font-size:0.84rem;color:var(--muted);margin:3px 0;">
                  URL: <a href="${esc(td.account_or_site_url)}" target="_blank" rel="noopener" style="text-decoration:underline;">${esc(td.account_or_site_url)}</a>
                  · ${esc(td.primary_channel)} · <strong>${esc(td.contact_info)}</strong>
                </div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;">
                <select class="input td-status-sel" data-id="${td.id}" style="padding:5px 10px;font-size:0.78rem;width:auto;">
                  ${['new', 'recording', 'sent', 'booked_call', 'archived'].map(s => `<option value="${s}" ${td.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
                </select>
              </div>
            </div>
          `).join('') : `<div style="color:var(--muted);font-size:0.86rem;">${isAr ? 'لا توجد طلبات تشريح جديدة حتى الآن.' : 'No teardown requests yet.'}</div>`}
        </div>
      </div>

      <!-- Add Deal + Pipeline Table -->
      <div class="about-card" style="margin-bottom:24px;">
        <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'إضافة شركة لخط متابعة الـ 21 يوماً' : 'Add Prospect to 21-Day Pipeline'}</h2>
        <form id="add-crm-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
          <input id="crm-comp" class="input" placeholder="${isAr ? 'اسم الشركة أو المصنع' : 'Company Name'}" required />
          <input id="crm-person" class="input" placeholder="${isAr ? 'صاحب القرار' : 'Decision Maker'}" />
          <select id="crm-sector" class="input">
            <option value="factories">${isAr ? 'مصانع وأغذية' : 'Factories & F&B'}</option>
            <option value="finishing">${isAr ? 'تشطيبات وتطوير عقاري' : 'Finishing & Real Estate'}</option>
            <option value="gcc_export">${isAr ? 'تصدير وخليج' : 'GCC & Export'}</option>
            <option value="sme">${isAr ? 'شركات متوسطة SME' : 'General SME'}</option>
          </select>
          <input id="crm-egp" class="input" type="number" placeholder="${isAr ? 'قيمة العرض (ج.م)' : 'Proposed EGP'}" value="40000" />
          <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? '+ إضافة للـ CRM' : '+ Add Prospect'}</button>
        </form>
      </div>

      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:14px;">${isAr ? 'قائمة الصفقات والمتابعة وقوالب الرسائل الفورية' : 'Active Deals & 1-Click Outreach Templates'}</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${deals.map(d => `
            <div class="comment-item" style="display:flex;flex-direction:column;gap:8px;border-left:3px solid ${d.is_signed ? '#10B981' : 'var(--border)'};">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div>
                  <strong style="font-size:0.98rem;">${esc(d.company_name)}</strong>
                  <span style="color:var(--muted);font-size:0.84rem;"> · ${esc(d.decision_maker)} (${esc(d.sector)})</span>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
                  <select class="input crm-stage-sel" data-id="${d.id}" style="padding:4px 8px;font-size:0.76rem;width:auto;">
                    ${['queued', 'teardown_sent', 'followup_day3', 'followup_day7', 'call_15m_booked', 'proposal_sent', 'signed', 'paused'].map(st => `<option value="${st}" ${d.stage === st ? 'selected' : ''}>${st}</option>`).join('')}
                  </select>
                  <button class="pill-btn crm-sign-btn ${d.is_signed ? 'active' : ''}" data-id="${d.id}" data-signed="${d.is_signed}" data-prop="${d.proposed_egp || 40000}" style="padding:4px 10px;font-size:0.75rem;" type="button">
                    ${d.is_signed ? (isAr ? '✓ عقد موقّع' : '✓ Signed') : (isAr ? 'توثيق كعقد موقّع' : 'Mark Signed')}
                  </button>
                </div>
              </div>
              <div style="font-size:0.82rem;color:var(--muted);">${esc(d.next_action_ar || d.notes || '')}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="pill-btn copy-tpl-btn" data-tpl="first" data-comp="${esc(d.company_name)}" data-person="${esc(d.decision_maker)}" style="padding:3px 10px;font-size:0.74rem;" type="button">📋 ${isAr ? 'نسخ رسالة التشريح الأولى' : 'Copy First Msg'}</button>
                <button class="pill-btn copy-tpl-btn" data-tpl="day3" data-comp="${esc(d.company_name)}" data-person="${esc(d.decision_maker)}" style="padding:3px 10px;font-size:0.74rem;" type="button">📋 ${isAr ? 'متابعة يوم 3' : 'Day-3 Followup'}</button>
                <button class="pill-btn copy-tpl-btn" data-tpl="day7" data-comp="${esc(d.company_name)}" data-person="${esc(d.decision_maker)}" style="padding:3px 10px;font-size:0.74rem;" type="button">📋 ${isAr ? 'متابعة يوم 7 الأخيرة' : 'Day-7 Final'}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (activeStudioTab === 'mind') {
    tabBodyHtml = `
      <div class="contact-grid">
        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? `رسائل العملاء المباشرة (${(allInquiries || []).length})` : `Direct Client Inquiries (${(allInquiries || []).length})`}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto;">
            ${(allInquiries || []).length ? (allInquiries || []).map(inq => `
              <div class="comment-item" style="opacity:${inq.is_resolved ? 0.55 : 1};">
                <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
                  <strong>${esc(inq.sender_name)} (${esc(inq.sender_contact)})</strong>
                  <button class="pill-btn resolve-inq-btn" data-id="${inq.id}" data-res="${inq.is_resolved}" style="padding:2px 8px;font-size:0.72rem;" type="button">
                    ${inq.is_resolved ? (isAr ? 'مكتمل' : 'Resolved') : (isAr ? 'تمييز كمكتمل' : 'Mark Done')}
                  </button>
                </div>
                <div style="color:var(--muted);font-size:0.86rem;">${esc(inq.message)}</div>
              </div>
            `).join('') : `<div style="color:var(--muted);font-size:0.86rem;">${isAr ? 'لا توجد رسائل حالياً.' : 'No inquiries yet.'}</div>`}
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'نشر تدوينة حية في «داخل عقلي»' : 'Publish Live Mind Note'}</h2>
          <form id="mind-note-form" style="display:flex;flex-direction:column;gap:10px;">
            <select id="mn-cat" class="input">
              <option value="now">Live Focus (التركيز الحالي)</option>
              <option value="principle">Principle (مبدأ تشغيلي)</option>
              <option value="essay">Essay (فكرة وتأمل)</option>
              <option value="system">System (تفكيك نظام)</option>
            </select>
            <input id="mn-ar" class="input" type="text" placeholder="العنوان بالعربي" required />
            <input id="mn-en" class="input" type="text" placeholder="Title (EN)" required />
            <textarea id="mn-body-ar" class="input" rows="3" placeholder="النص بالعربي (بدون شرطة طويلة)" required></textarea>
            <textarea id="mn-body-en" class="input" rows="3" placeholder="Body (EN)" required></textarea>
            <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? 'نشر فوراً في عقلي' : 'Publish to Mind'}</button>
            <div id="mn-status" style="font-size:0.84rem;color:var(--muted);"></div>
          </form>
        </div>
      </div>
    `;
  } else if (activeStudioTab === 'proof') {
    tabBodyHtml = `
      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:6px;">${isAr ? 'حوكمة دراسات الحالة وخصوصية العملاء' : 'Case Studies & Client Permission Governance'}</h2>
        <p style="font-size:0.84rem;color:var(--muted);margin-bottom:16px;">
          ${isAr ? 'تحكّم بضغطة واحدة في عرض دراسة الحالة بالاسم التجاري الصريح أو بالوضع الموثق بدون اسم، أو إخفائها/نشرها.' : 'Toggle client name anonymization or publication visibility with full audit trail logging.'}
        </p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${(allCases || []).map(cs => `
            <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;opacity:${cs.is_published ? 1 : 0.55};">
              <div style="max-width:640px;">
                <div style="font-weight:700;">
                  ${esc(cs.is_anonymized && cs.anon_title_ar ? cs.anon_title_ar : cs.title_ar)}
                  ${cs.is_illustrative ? `<span class="work-badge">${isAr ? 'سيناريو توضيحي' : 'Illustrative'}</span>` : ''}
                </div>
                <div style="font-size:0.8rem;color:var(--muted);margin-top:3px;">
                  Slug: <code>${esc(cs.slug)}</code> · ${cs.is_anonymized ? (isAr ? '🔒 معروض بدون ذكر الاسم التجاري' : '🔒 Anonymized Mode Active') : (isAr ? '🌐 معروض بالاسم الصريح' : '🌐 Named Public Mode')}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="pill-btn toggle-cs-anon ${cs.is_anonymized ? 'active' : ''}" data-id="${cs.id}" data-slug="${esc(cs.slug)}" data-anon="${cs.is_anonymized}" type="button">
                  ${cs.is_anonymized ? (isAr ? 'تفعيل الاسم الصريح' : 'Switch to Named') : (isAr ? 'تفعيل إخفاء الاسم' : 'Anonymize Client')}
                </button>
                <button class="pill-btn toggle-cs-pub" data-id="${cs.id}" data-slug="${esc(cs.slug)}" data-pub="${cs.is_published}" type="button">
                  ${cs.is_published ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'نشر' : 'Publish')}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (activeStudioTab === 'content') {
    tabBodyHtml = `
      <div class="contact-grid" style="margin-bottom:24px;">
        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:8px;">${isAr ? 'إضافة كاروسيل / منشور (مهمة المحتوى - 4 بوابات)' : 'New 4-Gate Content Item'}</h2>
          <form id="new-content-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="cp-title" class="input" placeholder="${isAr ? 'عنوان الموضوع أو التجربة الموثقة' : 'Verified Story / Carousel Title'}" required />
            <input id="cp-hook" class="input" placeholder="${isAr ? 'خطّاف الشريحة الأولى (25 كلمة كحد أقصى)' : 'Slide 1 Hook (max 25 words)'}" required />
            <input id="cp-proof" class="input" placeholder="${isAr ? 'مصدر الدليل الموثق (مثال: astro_scheduler.sqlite)' : 'Verified Evidence Source'}" required />
            <textarea id="cp-caption" class="input" rows="3" placeholder="${isAr ? 'الكابشن والـ CTA الموحد (يفحصه مدقق الحمض النووي تلقائياً)' : 'Caption & unified CTA'}" required></textarea>
            <div id="cp-dna-msg" style="font-size:0.82rem;"></div>
            <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? 'فحص الـ 10 بنود وحفظ المسودة' : 'Run DNA Check & Save'}</button>
          </form>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:10px;">${isAr ? 'بوابات الاعتماد الأربع (وإنت اللي بتفتح البوابة)' : 'The 4 Approval Gates'}</h2>
          <div style="display:flex;flex-direction:column;gap:8px;font-size:0.86rem;color:var(--muted);">
            <div class="comment-item"><strong>Gate 1 · الجرد:</strong> تجربة حقيقية + أرقام موثقة بمصدر صريح فقط.</div>
            <div class="comment-item"><strong>Gate 2 · الاستراتيجية:</strong> ربط المنشور بمحور ثابت وفعل مطلوب واحد.</div>
            <div class="comment-item"><strong>Gate 3 · الإنتاج:</strong> 7-10 شرائح (بحد أقصى 25 كلمة للشريحة) تنتهي بالعودة لنقطة البداية.</div>
            <div class="comment-item"><strong>Gate 4 · الجدولة:</strong> لا يُنشر أي شيء إلا بعد تحويل حالته إلى Approved يدوياً من قبلك.</div>
          </div>
        </div>
      </div>

      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'خط إنتاج المنشورات والكاروسيلات' : 'Content Mission Queue'}</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(contentItems || []).map(item => `
            <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
              <div style="max-width:650px;">
                <div style="font-weight:700;">Gate ${item.current_gate}/4 · ${esc(item.title_ar)} <span class="work-badge">${esc(item.status)}</span></div>
                <div style="font-size:0.82rem;color:var(--muted);margin-top:3px;">Hook: ${esc(item.hook_ar)} · الدليل: ${esc(item.source_proof)}</div>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="pill-btn adv-gate-btn" data-id="${item.id}" data-gate="${item.current_gate}" type="button">
                  ${item.current_gate < 4 ? (isAr ? `ترقية للبوابة ${item.current_gate + 1}` : `Advance to Gate ${item.current_gate + 1}`) : '✓ Gate 4'}
                </button>
                <button class="pill-btn approve-cp-btn ${item.status === 'approved' ? 'active' : ''}" data-id="${item.id}" data-st="${item.status}" type="button">
                  ${item.status === 'approved' ? (isAr ? '✓ معتمد للنشر' : '✓ Approved') : (isAr ? 'اعتماد' : 'Approve')}
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    const selectedCol = colsList.find(c => c.id === selectedAdminCollectionId) || null;
    const filteredWorks = worksList.filter(w => {
      if (selectedCol && w.collection_id !== selectedCol.id) return false;
      if (curationFilter === 'published') return w.is_published !== false;
      if (curationFilter === 'archived') return w.is_published === false;
      if (curationFilter === 'featured') return w.is_featured === true;
      return true;
    });

    tabBodyHtml = `
      <!-- Collections Governance -->
      <div class="about-card" style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <h2 style="font-size:1.15rem;">${isAr ? `إدارة المجموعات (${colsList.length})` : `Collections Governance (${colsList.length})`}</h2>
          ${selectedCol ? `<button id="clear-col-sel" class="pill-btn" type="button">${isAr ? 'عرض كل الأعمال' : 'Show All Works'}</button>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px;">
          ${colsList.map(c => `
            <div class="comment-item" style="display:flex;flex-direction:column;gap:8px;border-color:${selectedAdminCollectionId === c.id ? 'var(--accent)' : 'var(--border)'};opacity:${c.is_published ? 1 : 0.55};">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="cursor:pointer;text-decoration:underline;" class="sel-col-btn" data-id="${c.id}">${esc(isAr ? c.title_ar : c.title_en)}</strong>
                <span class="work-badge">${esc(c.category || 'personal')}</span>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button class="pill-btn sel-col-btn" data-id="${c.id}" style="padding:3px 9px;font-size:0.74rem;" type="button">${isAr ? 'استعراض' : 'Inspect'}</button>
                <button class="pill-btn col-pub-btn ${c.is_published ? '' : 'active'}" data-id="${c.id}" data-slug="${esc(c.slug)}" data-pub="${c.is_published}" style="padding:3px 9px;font-size:0.74rem;" type="button">
                  ${c.is_published ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'نشر' : 'Publish')}
                </button>
                <button class="pill-btn col-del-btn" data-id="${c.id}" data-slug="${esc(c.slug)}" style="padding:3px 9px;font-size:0.74rem;color:var(--danger);" type="button">${isAr ? 'حذف' : 'Delete'}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Upload & Create Collection -->
      <div class="contact-grid" style="margin-bottom:24px;">
        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'رفع أعمال جديدة (تحويل تلقائي لـ WebP)' : 'Upload Works (Auto WebP)'}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <select id="up-col" class="input">
              ${colsList.map(c => `<option value="${c.id}">${esc(c.title_en)} (${esc(c.title_ar)})</option>`).join('')}
            </select>
            <select id="up-origin" class="input">
              <option value="camera">📷 Camera</option>
              <option value="ai">✨ AI</option>
              <option value="design">🎨 Design</option>
            </select>
            <input id="up-title-en" class="input" type="text" placeholder="Title (EN) - optional" />
            <input id="up-title-ar" class="input" type="text" placeholder="العنوان بالعربي - اختياري" />
            <label id="drop-zone" style="border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;color:var(--muted);">
              ${isAr ? 'اسحب الصور هنا أو اضغط للاختيار' : 'Drop images here or click to select'}
              <input id="up-files" type="file" accept="image/*" multiple style="display:none;" />
            </label>
            <div id="up-status" style="font-size:0.85rem;"></div>
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'إنشاء مجموعة جديدة' : 'Create New Collection'}</h2>
          <form id="new-col-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="col-slug" class="input" type="text" placeholder="Slug (e.g. brand-pack)" required />
            <select id="col-cat" class="input">
              <option value="client">Client Work</option>
              <option value="personal">Personal & AI</option>
              <option value="educational">Educational</option>
            </select>
            <input id="col-en" class="input" type="text" placeholder="Title (EN)" required />
            <input id="col-ar" class="input" type="text" placeholder="العنوان بالعربي" required />
            <button class="pill-btn active" type="submit" style="justify-content:center;">${isAr ? 'إنشاء المجموعة' : 'Create Collection'}</button>
            <div id="col-status" style="font-size:0.85rem;"></div>
          </form>
        </div>
      </div>

      <!-- Works Curation Grid -->
      <div class="about-card" style="margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <h2 style="font-size:1.15rem;">${selectedCol ? `${esc(selectedCol.title_ar)} (${filteredWorks.length})` : `Visual Works (${filteredWorks.length})`}</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${['all', 'published', 'archived', 'featured'].map(f => `
              <button class="pill-btn cur-filter-btn ${curationFilter === f ? 'active' : ''}" data-filter="${f}" type="button">${f.toUpperCase()}</button>
            `).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;max-height:440px;overflow-y:auto;">
          ${filteredWorks.slice(0, 60).map(w => {
            const thumb = (w.image_urls || {})['480'] || (w.image_urls || {})['1200'] || '';
            return `
              <div style="display:flex;gap:10px;align-items:center;background:var(--surface-2);padding:10px;border-radius:12px;border:1px solid var(--border);opacity:${w.is_published === false ? 0.55 : 1};">
                <img src="${esc(thumb)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;" loading="lazy" />
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(w.title_ar || w.title_en)}</div>
                  <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="pill-btn toggle-pub-btn" data-id="${w.id}" data-slug="${esc(w.slug)}" data-pub="${w.is_published !== false}" style="padding:3px 8px;font-size:0.72rem;" type="button">
                      ${w.is_published !== false ? (isAr ? 'إخفاء' : 'Hide') : (isAr ? 'نشر' : 'Publish')}
                    </button>
                    <button class="pill-btn toggle-feat-btn ${w.is_featured ? 'active' : ''}" data-id="${w.id}" data-slug="${esc(w.slug)}" data-feat="${w.is_featured}" style="padding:3px 8px;font-size:0.72rem;" type="button">★</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Admin Audit Trail & Comments -->
      <div class="contact-grid">
        <div class="about-card">
          <h2 style="font-size:1.12rem;margin-bottom:10px;">🛡️ ${isAr ? 'سجل التدقيق الإداري (Audit Trail)' : 'Admin Audit Logs'}</h2>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;font-size:0.8rem;">
            ${(auditLogs || []).map(l => `
              <div class="comment-item" style="padding:8px 10px;">
                <strong>${esc(l.admin_name)}</strong> · <code>${esc(l.action)}</code> -> ${esc(l.target_type)} (${esc(l.target_id)})
                <div style="color:var(--muted);font-size:0.72rem;">${new Date(l.created_at).toLocaleString()}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.12rem;margin-bottom:10px;">${isAr ? `إشراف التعليقات (${(allComments || []).length})` : `Comments (${(allComments || []).length})`}</h2>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;">
            ${(allComments || []).map(c => `
              <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px;opacity:${c.is_hidden ? 0.5 : 1};">
                <div style="font-size:0.82rem;">
                  <strong>${esc(c.profiles?.display_name || 'Visitor')}</strong>: ${esc(c.body)}
                </div>
                <button class="pill-btn toggle-hide-btn" data-id="${c.id}" data-hidden="${c.is_hidden}" style="padding:3px 8px;font-size:0.72rem;" type="button">
                  ${c.is_hidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <section class="container" style="padding:36px 24px 88px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="section-kicker">08 · EXECUTIVE COMMAND STUDIO</span>
          <h1 class="section-title">Artelligence Studio · ${esc(admin.display_name)}</h1>
        </div>
        <button id="adm-logout" class="pill-btn" type="button">${isAr ? 'تسجيل الخروج' : 'Sign Out'}</button>
      </div>

      <div class="filter-bar" style="margin-bottom:24px;">
        ${studioTabs.map(tb => `
          <button class="pill-btn ${activeStudioTab === tb.id ? 'active' : ''}" data-studio-tab="${tb.id}" type="button">
            ${isAr ? tb.ar : tb.en}
          </button>
        `).join('')}
      </div>

      ${tabBodyHtml}
    </section>
  `;

  // Shared Studio Listeners
  container.querySelector('#adm-logout').onclick = async () => {
    await supabase.auth.signOut();
    renderAdminPage(container, state, onRefresh);
  };

  container.querySelectorAll('[data-studio-tab]').forEach(btn => {
    btn.onclick = () => {
      activeStudioTab = btn.dataset.studioTab;
      renderAdminPage(container, state, onRefresh);
    };
  });

  // CRM Tab Listeners
  container.querySelectorAll('.td-status-sel').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.dataset.id;
      await supabase.from('teardown_requests').update({ status: sel.value }).eq('id', id);
      await logAudit(admin, 'update_teardown_status', 'teardown_request', id, { status: sel.value });
      renderAdminPage(container, state, onRefresh);
    };
  });

  const addCrmForm = container.querySelector('#add-crm-form');
  if (addCrmForm) {
    addCrmForm.onsubmit = async (e) => {
      e.preventDefault();
      const company_name = container.querySelector('#crm-comp').value.trim();
      const decision_maker = container.querySelector('#crm-person').value.trim();
      const sector = container.querySelector('#crm-sector').value;
      const proposed_egp = Number(container.querySelector('#crm-egp').value) || 0;
      await supabase.from('crm_deals').insert({ company_name, decision_maker, sector, proposed_egp, stage: 'queued' });
      await logAudit(admin, 'create_crm_deal', 'crm_deal', company_name);
      renderAdminPage(container, state, onRefresh);
    };
  }

  container.querySelectorAll('.crm-stage-sel').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.dataset.id;
      await supabase.from('crm_deals').update({ stage: sel.value, updated_at: new Date().toISOString() }).eq('id', id);
      await logAudit(admin, 'update_crm_stage', 'crm_deal', id, { stage: sel.value });
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.crm-sign-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextSigned = btn.dataset.signed !== 'true';
      const prop = Number(btn.dataset.prop) || 40000;
      await supabase.from('crm_deals').update({
        is_signed: nextSigned,
        stage: nextSigned ? 'signed' : 'proposal_sent',
        signed_amount_egp: nextSigned ? prop : 0
      }).eq('id', id);
      await logAudit(admin, nextSigned ? 'mark_deal_signed' : 'unmark_deal_signed', 'crm_deal', id);
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.copy-tpl-btn').forEach(btn => {
    btn.onclick = () => {
      const msg = buildOutreachMessage(btn.dataset.tpl, btn.dataset.comp, btn.dataset.person);
      navigator.clipboard?.writeText(msg);
      const orig = btn.textContent;
      btn.textContent = '✓ تم النسخ!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    };
  });

  // Mind & Inquiries Listeners
  container.querySelectorAll('.resolve-inq-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextRes = btn.dataset.res !== 'true';
      await supabase.from('inquiries').update({ is_resolved: nextRes }).eq('id', id);
      await logAudit(admin, 'resolve_inquiry', 'inquiry', id);
      renderAdminPage(container, state, onRefresh);
    };
  });

  const mnForm = container.querySelector('#mind-note-form');
  if (mnForm) {
    mnForm.onsubmit = async (e) => {
      e.preventDefault();
      const category = container.querySelector('#mn-cat').value;
      const title_ar = container.querySelector('#mn-ar').value.trim().replace(/\u2014/g, '-');
      const title_en = container.querySelector('#mn-en').value.trim().replace(/\u2014/g, '-');
      const body_ar = container.querySelector('#mn-body-ar').value.trim().replace(/\u2014/g, '-');
      const body_en = container.querySelector('#mn-body-en').value.trim().replace(/\u2014/g, '-');
      const slug = `mind-${Date.now()}`;
      const { error } = await supabase.from('mind_notes').insert({ slug, category, title_ar, title_en, body_ar, body_en, sort_order: 1 });
      if (!error) {
        await logAudit(admin, 'publish_mind_note', 'mind_note', slug);
        await onRefresh();
        renderAdminPage(container, state, onRefresh);
      } else {
        container.querySelector('#mn-status').textContent = error.message;
      }
    };
  }

  // Proof & Case Studies Governance Listeners
  container.querySelectorAll('.toggle-cs-anon').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextAnon = btn.dataset.anon !== 'true';
      await supabase.from('case_studies').update({ is_anonymized: nextAnon }).eq('id', id);
      await logAudit(admin, nextAnon ? 'anonymize_case_study' : 'reveal_case_study_name', 'case_study', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-cs-pub').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextPub = btn.dataset.pub !== 'true';
      await supabase.from('case_studies').update({ is_published: nextPub }).eq('id', id);
      await logAudit(admin, nextPub ? 'publish_case_study' : 'hide_case_study', 'case_study', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  // Content 4-Gate Studio Listeners
  const cpForm = container.querySelector('#new-content-form');
  if (cpForm) {
    cpForm.onsubmit = async (e) => {
      e.preventDefault();
      const title_ar = container.querySelector('#cp-title').value.trim();
      const hook_ar = container.querySelector('#cp-hook').value.trim();
      const source_proof = container.querySelector('#cp-proof').value.trim();
      const caption_ar = container.querySelector('#cp-caption').value.trim();
      const issues = runDnaComplianceCheck(`${title_ar} ${hook_ar} ${caption_ar}`);
      const msgEl = container.querySelector('#cp-dna-msg');
      if (issues.length) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = `تنبيه فحص الحمض النووي: ${issues.join(' · ')}`;
        return;
      }
      await supabase.from('content_pipeline').insert({
        title_ar,
        hook_ar,
        source_proof,
        caption_ar,
        current_gate: 1,
        dna_check_passed: true,
        status: 'draft'
      });
      await logAudit(admin, 'create_content_item', 'content_pipeline', title_ar);
      renderAdminPage(container, state, onRefresh);
    };
  }

  container.querySelectorAll('.adv-gate-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextGate = Math.min(4, Number(btn.dataset.gate) + 1);
      await supabase.from('content_pipeline').update({ current_gate: nextGate }).eq('id', id);
      await logAudit(admin, 'advance_content_gate', 'content_pipeline', id, { gate: nextGate });
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.approve-cp-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextSt = btn.dataset.st === 'approved' ? 'awaiting_approval' : 'approved';
      await supabase.from('content_pipeline').update({ status: nextSt }).eq('id', id);
      await logAudit(admin, 'toggle_content_approval', 'content_pipeline', id, { status: nextSt });
      renderAdminPage(container, state, onRefresh);
    };
  });

  // Archive & Collections Listeners
  container.querySelectorAll('.sel-col-btn').forEach(btn => {
    btn.onclick = () => {
      selectedAdminCollectionId = btn.dataset.id;
      renderAdminPage(container, state, onRefresh);
    };
  });
  const clearColBtn = container.querySelector('#clear-col-sel');
  if (clearColBtn) clearColBtn.onclick = () => { selectedAdminCollectionId = null; renderAdminPage(container, state, onRefresh); };

  container.querySelectorAll('.col-pub-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextPub = btn.dataset.pub !== 'true';
      await supabase.from('collections').update({ is_published: nextPub }).eq('id', id);
      await logAudit(admin, nextPub ? 'publish_collection' : 'hide_collection', 'collection', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.col-del-btn').forEach(btn => {
    btn.onclick = async () => {
      const slug = btn.dataset.slug;
      const ok = window.confirm(isAr ? `تأكيد حذف المجموعة (${slug}) نهائياً؟ سيتم توثيق الحذف في سجل التدقيق.` : `Permanently delete collection (${slug})?`);
      if (!ok) return;
      await supabase.from('collections').delete().eq('id', btn.dataset.id);
      await logAudit(admin, 'delete_collection', 'collection', slug);
      if (selectedAdminCollectionId === btn.dataset.id) selectedAdminCollectionId = null;
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  const newColForm = container.querySelector('#new-col-form');
  if (newColForm) {
    newColForm.onsubmit = async (e) => {
      e.preventDefault();
      const slug = container.querySelector('#col-slug').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const category = container.querySelector('#col-cat').value;
      const title_en = container.querySelector('#col-en').value.trim();
      const title_ar = container.querySelector('#col-ar').value.trim();
      const { error } = await supabase.from('collections').insert({ slug, category, title_en, title_ar, sort_order: colsList.length + 1 });
      if (!error) {
        await logAudit(admin, 'create_collection', 'collection', slug);
        await onRefresh();
        renderAdminPage(container, state, onRefresh);
      } else {
        container.querySelector('#col-status').textContent = error.message;
      }
    };
  }

  container.querySelectorAll('.cur-filter-btn').forEach(btn => {
    btn.onclick = () => {
      curationFilter = btn.dataset.filter;
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-pub-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextPub = btn.dataset.pub !== 'true';
      await supabase.from('works').update({ is_published: nextPub }).eq('id', id);
      await logAudit(admin, nextPub ? 'publish_work' : 'archive_work', 'work', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-feat-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextFeat = btn.dataset.feat !== 'true';
      await supabase.from('works').update({ is_featured: nextFeat }).eq('id', id);
      await logAudit(admin, nextFeat ? 'feature_work' : 'unfeature_work', 'work', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-hide-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextHidden = btn.dataset.hidden !== 'true';
      await supabase.from('comments').update({ is_hidden: nextHidden }).eq('id', id);
      await logAudit(admin, nextHidden ? 'hide_comment' : 'unhide_comment', 'comment', id);
      renderAdminPage(container, state, onRefresh);
    };
  });

  const fileInput = container.querySelector('#up-files');
  const dropZone = container.querySelector('#drop-zone');
  const upStatus = container.querySelector('#up-status');

  async function handleFiles(files) {
    const colId = container.querySelector('#up-col').value;
    const col = colsList.find(c => c.id === colId);
    const origin = container.querySelector('#up-origin').value;
    const baseEn = container.querySelector('#up-title-en').value.trim();
    const baseAr = container.querySelector('#up-title-ar').value.trim();

    let done = 0;
    for (const file of files) {
      upStatus.textContent = `Processing ${file.name} (${done + 1}/${files.length})...`;
      const slug = `${col.slug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const blurDataUrl = await makeBlurDataUrl(file);
      const sizes = [480, 1200, 2400];
      const imageUrls = {};
      let origW = 1200;
      let origH = 1200;

      for (const sz of sizes) {
        const { blob, width, height } = await resizeToWebP(file, sz);
        origW = width;
        origH = height;
        const storagePath = `works/${col.slug}/${slug}-${sz}.webp`;
        const { error: upErr } = await supabase.storage.from('visuals').upload(storagePath, blob, {
          contentType: 'image/webp',
          upsert: true
        });
        if (upErr) throw upErr;
        imageUrls[String(sz)] = `${SUPABASE_URL}/storage/v1/object/public/visuals/${storagePath}`;
      }

      const titleEn = baseEn || file.name.replace(/\.[^.]+$/, '');
      const titleAr = baseAr || titleEn;
      const { error: dbErr } = await supabase.from('works').insert({
        slug,
        collection_id: colId,
        origin,
        media_type: 'image',
        title_en: titleEn,
        title_ar: titleAr,
        image_urls: imageUrls,
        blur_data_url: blurDataUrl,
        width: origW,
        height: origH,
        sort_order: done + 1
      });
      if (dbErr) throw dbErr;
      await logAudit(admin, 'upload_work', 'work', slug);
      done++;
    }
    upStatus.textContent = `✓ Uploaded ${done} work(s) successfully!`;
    await onRefresh();
    renderAdminPage(container, state, onRefresh);
  }

  if (fileInput && dropZone) {
    fileInput.onchange = (e) => handleFiles(Array.from(e.target.files || [])).catch(err => { upStatus.textContent = err.message; });
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; };
    dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--border)'; };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--border)';
      handleFiles(Array.from(e.dataTransfer.files || [])).catch(err => { upStatus.textContent = err.message; });
    };
  }
}
