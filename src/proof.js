/**
 * Artelligence Proof Vault (/ar/proof & /en/proof)
 * Strictly separates Live Systems & Client Work, Studio Explorations, and Illustrative Teardowns.
 * Zero fabricated numbers, zero "Verified" badges, zero client name leaks, 100% language purity.
 */

function bdi(text) {
  return `<bdi dir="ltr">${text}</bdi>`;
}

export function renderProofVaultPage(state, pUrl) {
  const isAr = state.lang === 'ar';

  const badges = {
    live: isAr ? 'منشور · متاح للعامة' : 'Live · Public',
    clientAnon: isAr ? 'عمل لعميل · بدون ذكر الاسم' : 'Client Work · Anonymized',
    studio: isAr ? 'تجربة من الاستوديو' : 'Studio Exploration',
    illustrative: isAr ? 'سيناريو توضيحي' : 'Illustrative'
  };

  const labels = {
    problem: isAr ? 'التحدي:' : 'Problem:',
    built: isAr ? 'ما بنيناه:' : 'What we built:',
    outcome: isAr ? 'النتيجة:' : 'Outcome:',
    demonstrates: isAr ? 'ما يوضحه:' : 'What it demonstrates:',
    tech: isAr ? 'التقنيات المستخدمة' : 'Tech stack'
  };

  const khemWorks = (state.works || []).filter(w => {
    const col = (state.collections || []).find(c => c.id === w.collection_id);
    return col?.slug === 'khem';
  }).slice(0, 3);

  const nafeesWorks = (state.works || []).filter(w => {
    const col = (state.collections || []).find(c => c.id === w.collection_id);
    return col?.slug === 'nafees';
  }).slice(0, 3);

  return `
    <section class="container proof-vault-root" style="padding:40px 24px 64px;">
      <!-- 1. Hero (Always before cards in DOM) -->
      <header class="proof-hero" style="margin-bottom:40px;">
        <h1 class="hero-title" style="margin-bottom:12px;">
          ${isAr
            ? 'أعمالنا وأنظمتنا: التحدي، ما بنيناه، والدليل'
            : 'Case Studies: Problem, What We Built &amp; Evidence'}
        </h1>
        <p class="hero-sub" style="margin-bottom:0;">
          ${isAr
            ? 'نفصل بوضوح بين الأنظمة المنشورة وأعمال العملاء الفعلية، وبين تجارب الاستوديو الذاتية والسيناريوهات التوضيحية.'
            : 'Clear separation between live production systems, anonymized client work, self-initiated studio explorations, and illustrative teardowns.'}
        </p>
      </header>

      <!-- 2. Live Systems & Client Work -->
      <section aria-labelledby="sec-live-work" style="margin-bottom:48px;">
        <h2 id="sec-live-work" class="section-title" style="margin-bottom:20px;">
          ${isAr ? 'أنظمة منشورة وأعمال عملاء' : 'Live Systems &amp; Client Work'}
        </h2>

        <div class="case-grid">
          <!-- 3.1 Autonomous Publishing Engine (Astro Cosmic) -->
          <article class="case-card">
            <div class="case-body">
              <div class="proof-card-top">
                <span class="proof-badge proof-badge-live">${badges.live}</span>
                <span class="collection-meta">${isAr ? 'أتمتة المحتوى والنشر' : 'Publishing Automation'}</span>
              </div>
              <h3 class="proof-card-title">
                ${isAr ? `محرك النشر التلقائي (${bdi('Astro Cosmic')})` : 'Autonomous Publishing Engine (Astro Cosmic)'}
              </h3>
              <div class="case-pso">
                <div><strong>${labels.problem}</strong> ${isAr ? 'تعديل الفيديوهات يومياً، وتصميم الأغلفة، وجدولة النشر على كل منصة بشكل يدوي مرهق.' : 'Manual daily video editing, cover design, and per-platform scheduling.'}</div>
                <div><strong>${labels.built}</strong> ${isAr ? `محرك نشر محلي يدير 92 مقطع فيديو بأغلفة ونصوص متناسقة، وينشر تلقائياً على ${bdi('Facebook')} و${bdi('Instagram')}.` : 'A local publishing engine that manages 92 reels with matched covers and captions, and publishes automatically to Facebook and Instagram.'}</div>
                <div><strong>${labels.outcome}</strong> ${isAr ? `92 يوماً من النشر المستمر بدون تدخل يدوي. نفس المحرك يشغّل حالياً المحتوى المستمر لصفحتي ${bdi('Artelligence')} و${bdi('WASL Network')}.` : '92 days of publishing with no manual work. The same engine now runs ongoing content for Artelligence and WASL Network.'}</div>
              </div>
              <ul class="offer-list">
                <li><span>•</span><span>${isAr ? `نشر فعلي تلقائي على ${bdi('Facebook')} و${bdi('Instagram')} من قاعدة بيانات واحدة.` : 'Automated live publishing to Facebook and Instagram from a single schedule.'}</span></li>
                <li><span>•</span><span>${isAr ? `توسّع المحرك ليشغّل محتوى ${bdi('Artelligence')} و${bdi('WASL Network')} من استخدام حقيقي.` : 'Expanded from real usage to power ongoing Artelligence and WASL Network content.'}</span></li>
                <li><span>•</span><span>${isAr ? 'فيديو يبدأ وينتهي بسلاسة لرفع مدة المشاهدة على المنصات.' : 'Seamless 10-second loop reels engineered for higher watch retention.'}</span></li>
              </ul>
              <div class="proof-visual-note">
                ${isAr ? '[قريباً: لقطة لشبكة حساب Instagram بعد النشر + لقطة إحصاءات Meta Business Suite]' : '[TODO: Instagram grid screenshot after publishing + Meta Business Suite insights]'}
              </div>
              <div class="proof-actions">
                <a href="https://youtu.be/vcAci7XK_Wk" target="_blank" rel="noopener" class="pill-btn active">${isAr ? bdi('YouTube ↗') : 'YouTube ↗'}</a>
                <span class="pill-btn" aria-disabled="true">${isAr ? `${bdi('Facebook')} (قريباً)` : 'Facebook [TODO]'}</span>
                <span class="pill-btn" aria-disabled="true">${isAr ? `${bdi('Instagram')} (قريباً)` : 'Instagram [TODO]'}</span>
              </div>
              <details class="proof-tech-details">
                <summary>${labels.tech}</summary>
                <p dir="ltr">SQLite scheduler, 1080x1920 10s seamless-loop reels, Meta Graph API v21.0, HMAC-SHA256 webhooks.</p>
              </details>
            </div>
          </article>

          <!-- 3.2 WASL Network -->
          <article class="case-card">
            <div class="case-cover">
              <img src="${pUrl('/assets/proof/wasl-cover.webp')}" alt="${isAr ? 'واجهة منصة WASL Network' : 'WASL Network platform banner'}" width="1200" height="669" loading="lazy" />
            </div>
            <div class="case-body">
              <div class="proof-card-top">
                <span class="proof-badge proof-badge-live">${badges.live}</span>
                <span class="collection-meta">${isAr ? 'مشروعنا الخاص' : 'Own venture'}</span>
              </div>
              <h3 class="proof-card-title">${isAr ? bdi('WASL Network') : 'WASL Network'}</h3>
              <div class="case-pso">
                <div><strong>${labels.problem}</strong> ${isAr ? 'ربط المؤسسين بالمستثمرين في المنطقة مشتت ويفتقر إلى فرز حقيقي يقلل الضوضاء.' : 'Co-founder and angel matchmaking in MENA is fragmented, with no vetting to filter noise.'}</div>
                <div><strong>${labels.built}</strong> ${isAr ? 'منصة مطابقة حية تفحص ملف كل شركة ناشئة ومستثمر بمساعدة الذكاء الاصطناعي.' : 'A live matchmaking platform with AI-assisted vetting of every startup and investor profile.'}</div>
                <div><strong>${labels.outcome}</strong> ${isAr ? '21 شركة ناشئة و141 جهة استثمارية مفحوصة ومتاحة على المنصة الآن.' : '21 vetted startups and 141 investor entities live on the platform.'}</div>
              </div>
              <ul class="offer-list">
                <li><span>•</span><span>${isAr ? `بالتعاون مع ${bdi('Prodstack')}.` : 'In collaboration with Prodstack.'}</span></li>
                <li><span>•</span><span>${isAr ? 'مراجعة تلقائية للطلبات قبل السماح بالتصفح والتواصل.' : 'Automated profile vetting before granting directory and matching access.'}</span></li>
              </ul>
              <div class="proof-actions">
                <a href="https://wasl-network.com" target="_blank" rel="noopener" class="pill-btn active">${isAr ? 'زيارة المنصة ↗' : 'Open Live ↗'}</a>
              </div>
              <details class="proof-tech-details">
                <summary>${labels.tech}</summary>
                <p dir="ltr">Next.js 16, React 19, Tailwind v4, Supabase PostgreSQL + RLS, 35+ custom vector icons.</p>
              </details>
            </div>
          </article>

          <!-- 3.3 Luxury Interior Finishing Firm (Anonymized) -->
          <article class="case-card">
            <div class="case-body">
              <div class="proof-card-top">
                <span class="proof-badge proof-badge-client">${badges.clientAnon}</span>
                <span class="collection-meta">${isAr ? 'التشطيبات والهندسة الداخلية' : 'Interior Finishing'}</span>
              </div>
              <h3 class="proof-card-title">
                ${isAr ? 'شركة تشطيبات وهندسة داخلية فاخرة' : 'Luxury Interior Finishing Firm'}
              </h3>
              <div class="case-pso">
                <div><strong>${labels.problem}</strong> ${isAr ? 'المعاينات والمقايسات لم تكن موحدة، ونفس اعتراضات العملاء تتكرر، وتسليم المشاريع كان مشتتاً.' : 'Site inspections and quotes (BOQs) were not standardized, the same client objections kept coming up, and project handoffs were fragmented.'}</div>
                <div><strong>${labels.built}</strong> ${isAr ? 'نظام تشغيل كامل في 8 حزم: معاينة ومقايسة شفافة، عقد بضمان 10 سنوات، خطة تسويق 90 يوماً، كتاب من 130 صفحة يجيب على 180 سؤالاً شائعاً، دليل توثيق هندسي بصري، أنظمة توظيف ومتابعة مشاريع، وملف تعريفي.' : 'A complete operating system in 8 packages: site inspection and transparent BOQ, a contract with a 10-year warranty, a 90-day marketing plan, a 130-page client handbook answering 180 common questions, a visual engineering documentation guide, hiring and project-tracking systems, and a company profile.'}</div>
                <div><strong>${labels.outcome}</strong> ${isAr ? 'تم تسليم النظام بالكامل.' : 'Full system delivered.'}</div>
              </div>
              <ul class="offer-list">
                <li><span>•</span><span>${isAr ? 'اسم العميل محجوب بناءً على طلبه.' : "Client name withheld at client's request."}</span></li>
                <li><span>•</span><span>${isAr ? 'يشمل 16 فصلاً للتوثيق الهندسي المصور في المواقع.' : 'Includes a 16-chapter visual engineering site documentation guide.'}</span></li>
              </ul>
              <div class="proof-visual-note">
                ${isAr ? '[قريباً: 3 لقطات مموهة للمقايسة وكتاب الأسئلة وغلاف العقد]' : '[TODO: 3 anonymized screenshots (BOQ, client handbook, contract cover)]'}
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- 3. Tools We Rely On (Placeholder Structure) -->
      <section aria-labelledby="sec-tools" style="margin-bottom:48px;">
        <h2 id="sec-tools" class="section-title" style="margin-bottom:16px;">
          ${isAr ? 'أدوات نعتمد عليها' : 'Tools We Rely On'}
        </h2>
        <div class="abti-grid">
          <div class="about-card" style="padding:18px;">
            <strong>[TODO: Tool 01]</strong>
            <p style="font-size:0.88rem;color:var(--muted);margin-top:6px;">
              ${isAr ? 'مستخدم في [المشروع] لـ [المهمة] ← [النتيجة]' : 'Used in [project] for [task] -> [result]'}
            </p>
          </div>
          <div class="about-card" style="padding:18px;">
            <strong>[TODO: Tool 02]</strong>
            <p style="font-size:0.88rem;color:var(--muted);margin-top:6px;">
              ${isAr ? 'مستخدم في [المشروع] لـ [المهمة] ← [النتيجة]' : 'Used in [project] for [task] -> [result]'}
            </p>
          </div>
          <div class="about-card" style="padding:18px;">
            <strong>[TODO: Tool 03]</strong>
            <p style="font-size:0.88rem;color:var(--muted);margin-top:6px;">
              ${isAr ? 'مستخدم في [المشروع] لـ [المهمة] ← [النتيجة]' : 'Used in [project] for [task] -> [result]'}
            </p>
          </div>
        </div>
      </section>

      <!-- 4. Studio Explorations -->
      <section aria-labelledby="sec-studio-exp" style="margin-bottom:48px;">
        <h2 id="sec-studio-exp" class="section-title" style="margin-bottom:8px;">
          ${isAr ? 'تجارب الاستوديو' : 'Studio Explorations'}
        </h2>
        <p style="color:var(--muted);margin-bottom:20px;max-width:720px;">
          ${isAr
            ? 'مشاريع ذاتية توضح طريقة تفكيرنا: من الفكرة إلى البحث إلى نظام متكامل، مبنية بمساعدة الذكاء الاصطناعي والبرمجة السريعة.'
            : 'Self-initiated projects that show how we think: from idea to research to a complete system, built with AI and vibe coding.'}
        </p>

        <div class="case-grid">
          <!-- 3.4 KHEM -->
          <article class="case-card">
            ${khemWorks[0] ? `<div class="case-cover"><img src="${khemWorks[0].image_urls?.['1200'] || khemWorks[0].image_urls?.['480'] || ''}" alt="${isAr ? `هوية ${bdi('KHEM')}` : 'KHEM visual identity'}" width="1200" height="675" loading="lazy" /></div>` : ''}
            <div class="case-body">
              <div class="proof-card-top">
                <span class="proof-badge proof-badge-studio">${badges.studio}</span>
                <span class="collection-meta">${isAr ? 'أزياء وهوية تراثية' : 'Heritage Apparel'}</span>
              </div>
              <h3 class="proof-card-title">${isAr ? bdi('KHEM') : 'KHEM'}</h3>
              <div class="case-pso">
                <div><strong>${labels.problem}</strong> ${isAr ? 'بناء علامة أزياء تراثية ذات جذور ثقافية من الصفر.' : 'Build a culturally rooted heritage apparel brand from zero.'}</div>
                <div><strong>${labels.built}</strong> ${isAr ? 'بحث سوق، وتقسيم شرائح، وشخصيات جمهور، وتحليل منافسين، وهوية بصرية، ودليل هوية من 32 صفحة، و5 وحدات حملات.' : 'Market research, STP segmentation, personas, competitor analysis, identity, 32-page brand guidelines, and 5 campaign modules.'}</div>
                <div><strong>${labels.demonstrates}</strong> ${isAr ? 'كيف نحوّل فكرة خام إلى نظام علامة تجارية جاهز للإطلاق باستخدام البحث والتصميم المدعوم بالذكاء الاصطناعي.' : 'How we take a raw idea to a complete, launch-ready brand system using AI-assisted research and design.'}</div>
              </div>
              <div class="proof-actions">
                <a href="${pUrl('/collection/khem')}" data-nav="/collection/khem" class="pill-btn active">${isAr ? 'معاينة الأصول ←' : 'View Assets ->'}</a>
              </div>
            </div>
          </article>

          <!-- 3.5 Nafees -->
          <article class="case-card">
            ${nafeesWorks[0] ? `<div class="case-cover"><img src="${nafeesWorks[0].image_urls?.['1200'] || nafeesWorks[0].image_urls?.['480'] || ''}" alt="${isAr ? `تغليف وهوية ${bdi('Nafees')}` : 'Nafees packaging and identity'}" width="1200" height="675" loading="lazy" /></div>` : ''}
            <div class="case-body">
              <div class="proof-card-top">
                <span class="proof-badge proof-badge-studio">${badges.studio}</span>
                <span class="collection-meta">${isAr ? 'أزياء رجالية فاخرة' : 'Quiet-Luxury Menswear'}</span>
              </div>
              <h3 class="proof-card-title">${isAr ? bdi('Nafees') : 'Nafees'}</h3>
              <div class="case-pso">
                <div><strong>${labels.problem}</strong> ${isAr ? 'تحويل علامة أزياء رجالية هادئة الفخامة إلى تجربة فتح عبوة ملموسة وحضور رقمي متطابق.' : 'Turn quiet-luxury menswear into a physical unboxing ritual and a matching digital presence.'}</div>
                <div><strong>${labels.built}</strong> ${isAr ? 'منظومة تغليف كاملة، وأكياس تسوق بمقاسات متعددة، ونظام تغليف هدايا، وبطاقة كبار الشخصيات، وكتالوج، وترويسات بريدية، وقوالب تواصل اجتماعي.' : 'Full packaging hierarchy, shopping bags in multiple sizes, gift-wrap system, VIP card, lookbook, catalog spreads, email headers, and social templates.'}</div>
                <div><strong>${labels.demonstrates}</strong> ${isAr ? 'تصميم نظام علامة تجارية فاخرة متكامل من المطبوعات إلى الواجهة الرقمية.' : 'End-to-end luxury brand system design.'}</div>
              </div>
              <ul class="offer-list">
                <li><span>•</span><span>${isAr ? 'علب منتجات مخصصة بمقاسات متعددة وهوية موحدة.' : 'Custom product boxes and multi-size shopping bags.'}</span></li>
                <li><span>•</span><span>${isAr ? 'نظام تغليف هدايا متكامل مع بطاقة كبار الشخصيات.' : 'Integrated gift-wrap system paired with a VIP membership card.'}</span></li>
                <li><span>•</span><span>${isAr ? 'كتالوج موسمي وقوالب نشر رقمي متوافقة.' : 'Seasonal lookbook spreads and aligned social templates.'}</span></li>
              </ul>
              <div class="proof-actions">
                <a href="${pUrl('/collection/nafees')}" data-nav="/collection/nafees" class="pill-btn active">${isAr ? 'معاينة الأصول ←' : 'View Assets ->'}</a>
              </div>
            </div>
          </article>
        </div>
      </section>

      <!-- 5. Illustrative Teardowns -->
      <section aria-labelledby="sec-illustrative">
        <h2 id="sec-illustrative" class="section-title" style="margin-bottom:20px;">
          ${isAr ? 'تحليلات توضيحية' : 'Illustrative Teardowns'}
        </h2>
        <article class="case-card">
          <div class="case-body">
            <div class="proof-card-top">
              <span class="proof-badge proof-badge-illustrative">${badges.illustrative}</span>
              <span class="collection-meta">${isAr ? 'التصنيع المحلي والأثاث' : 'Manufacturing &amp; Furniture'}</span>
            </div>
            <h3 class="proof-card-title">
              ${isAr ? 'تحليل ورشة النجارة والأثاث (الحلقة الأولى)' : 'Custom Carpentry &amp; Furniture Workshop (EP01)'}
            </h3>
            <div class="case-pso">
              <div><strong>${labels.problem}</strong> ${isAr ? 'عميل الجملة أو التشطيب يدخل حساب الورشة فلا يجد مواصفات أو حداً أدنى للطلب، ويرسل رسالة ليلاً فلا يصله رد حتى اليوم التالي.' : 'B2B and residential buyers visit the workshop page, find zero specs or minimum order clarity, message at 9 PM, and leave due to next-day reply delays.'}</div>
              <div><strong>${labels.built}</strong> ${isAr ? `الإصلاح الثلاثي الذي نطبقه: سطر تعريف واضح في النبذة، وحفظ الكتالوج بالمواصفات والحد الأدنى، ورد فوري على ${bdi('WhatsApp')} ليلاً.` : "The 3-part fix we'd apply: clear bio positioning, structured catalog highlight with specs/MOQ, and instant 24/7 WhatsApp qualification."}</div>
              <div><strong>${labels.demonstrates}</strong> ${isAr ? 'كيف يكشف تحليل دقيقتين أماكن تسرب العملاء قبل بناء أي أتمتة معقدة.' : 'Demonstrates how a 2-minute diagnostic teardown exposes immediate lead leaks before building automation.'}</div>
            </div>

            <!-- Before / After Mockup -->
            <div class="contact-grid" style="margin-top:12px;">
              <div style="padding:14px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);">
                <div style="font-size:0.78rem;font-weight:700;color:var(--muted);margin-bottom:6px;">
                  ${isAr ? 'قبل (سيناريو توضيحي)' : 'BEFORE (Illustrative)'}
                </div>
                <p style="font-size:0.86rem;color:var(--muted);">
                  ${isAr ? 'النبذة: "أجود أنواع الأثاث منذ 2010" · لا يوجد كتالوج · رسالة 9 مساءً بدون رد حتى الصباح.' : 'Bio: "Best furniture since 2010" · No catalog specs · 9 PM message unanswered until morning.'}
                </p>
              </div>
              <div style="padding:14px;border-radius:12px;border:1px solid var(--accent);background:var(--surface-2);">
                <div style="font-size:0.78rem;font-weight:700;margin-bottom:6px;">
                  ${isAr ? 'بعد (سيناريو توضيحي)' : 'AFTER (Illustrative)'}
                </div>
                <p style="font-size:0.86rem;">
                  ${isAr ? `النبذة: "تجهيز مطابخ وغرف للشركات والمعارض · الحد الأدنى 5 قطع" · رد ${bdi('WhatsApp')} في ثوانٍ وحجز معاينة.` : 'Bio: "B2B & showroom carpentry · MOQ 5 units" · Instant WhatsApp specs &amp; site visit booking.'}
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>
    </section>
  `;
}
