import { supabase } from './lib/supabase.js';

let activeLabTab = 'game'; // 'game' | 'readiness'

const gameState = {
  rounds: [],
  index: 0,
  score: 0,
  answered: null,
  savedScore: false,
  leaderboard: []
};

const READINESS_QS = [
  { ar: '1. هل يتم الرد على رسائل العملاء بعد الساعة 9 مساءً ويوم الجمعة خلال أقل من دقيقة؟', en: '1. Are customer inquiries after 9 PM and on weekends answered in under 60 seconds?' },
  { ar: '2. هل يجد العميل الكتالوج والحد الأدنى للطلب والمواصفات في أول 10 ثوانٍ على حسابكم؟', en: '2. Can buyers see your catalog, specs, and MOQ within 10 seconds on your profile?' },
  { ar: '3. هل لديكم نظام يسجّل كل استفسار ويتابع تلقائياً في اليوم الثالث واليوم السابع؟', en: '3. Is every lead logged with structured Day-3 and Day-7 follow-ups?' },
  { ar: '4. هل يتسلم فريق المبيعات العميل جاهزاً بعد تأهيل طلبه بدلاً من الإجابة على نفس الأسئلة يومياً؟', en: '4. Does your sales team receive pre-qualified buyers instead of repeating basic FAQs all day?' },
  { ar: '5. هل نظام المحتوى لديكم يعمل بجدول واضح مرتبط بأهداف المبيعات وليس النشر العشوائي؟', en: '5. Does your content run on a structured system tied directly to sales conversion?' },
  { ar: '6. هل تعرفون بدقة عدد الصفقات الموقعة شهرياً من كل قناة بدون أرقام تقديرية؟', en: '6. Do you track exact signed contracts per channel without guesswork?' }
];

let readinessAnswers = [false, false, false, false, false, false];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function startNewGame(works) {
  const pool = works.filter(w => w.origin === 'camera' || w.origin === 'ai');
  const cameras = shuffle(pool.filter(w => w.origin === 'camera')).slice(0, 5);
  const ais = shuffle(pool.filter(w => w.origin === 'ai')).slice(0, 5);
  gameState.rounds = shuffle([...cameras, ...ais]);
  gameState.index = 0;
  gameState.score = 0;
  gameState.answered = null;
  gameState.savedScore = false;
}

async function fetchLeaderboard() {
  const { data } = await supabase
    .from('game_scores')
    .select('player_name, score, total_rounds, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);
  gameState.leaderboard = data || [];
}

function renderLabTabs(isAr) {
  return `
    <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:28px;">
      <button class="pill-btn ${activeLabTab === 'game' ? 'active' : ''}" data-lab-tab="game" type="button">
        ${isAr ? '👁️ تحدي: إنسان أم آلة؟ (10 جولات)' : '👁️ Human or AI? Challenge (10 Rounds)'}
      </button>
      <button class="pill-btn ${activeLabTab === 'readiness' ? 'active' : ''}" data-lab-tab="readiness" type="button">
        ${isAr ? '⚡ فحص جاهزية شركتك للأتمتة (دقيقتان)' : '⚡ 2-Min Business Automation Check'}
      </button>
    </div>
  `;
}

function renderReadinessCheck(container, state, navigate) {
  const isAr = state.lang === 'ar';
  const yesCount = readinessAnswers.filter(Boolean).length;
  let recAr = 'شركتك تفقد استفسارات يومية بسبب غياب الرد الليلي والكتالوج المهيكل. البداية المثالية لك هي الدرجة 0: فيديو تشريح مجاني (دقيقتين) + مكالمة 15 دقيقة.';
  let recEn = 'Your business is leaking daily inquiries due to after-hours delays and unstructured catalog flow. Start with Step 0: Free 2-Minute Video Teardown + 15-Min Call.';
  if (yesCount >= 5) {
    recAr = 'أساسكم التشغيلي ممتاز! أنتم جاهزون مباشرة للدرجة 3: التوسع والأتمتة المتقدمة عبر Growth OS لأسواق التصدير والخليج.';
    recEn = 'Strong operational foundation! You are ready for Step 3: Growth OS scale & GCC export automation.';
  } else if (yesCount >= 3) {
    recAr = 'لديكم نواة جيدة لكن هناك حلقات يدوية تستنزف وقتكم يومياً. الخطوة الأنسب هي الدرجة 2: تأسيس Growth OS (عرض العميل المؤسس - 30 يوماً).';
    recEn = 'Solid base with manual bottlenecks draining daily hours. Best fit: Step 2 Growth OS Founding Setup (30 days).';
  }

  container.innerHTML = `
    <section class="container" style="max-width:780px;margin:36px auto 72px;">
      ${renderLabTabs(isAr)}
      <div class="about-card">
        <span class="section-kicker">${isAr ? 'تشخيص سريع لأصحاب الشركات والمصانع' : 'SME & FACTORY DIAGNOSTIC'}</span>
        <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">
          ${isAr ? 'اختبر جاهزية نظام المبيعات والمتابعة في شركتك' : 'Audit Your Sales & Operations Readiness'}
        </h1>
        <p style="font-size:0.88rem;color:var(--muted);margin-bottom:20px;">
          ${isAr ? 'فعّل البنود المتحققة فعلياً في شركتك اليوم لمعرفة درجتك المناسبة في سُلّم ABTI × Growth OS:' : 'Toggle the items currently active in your company to see your recommended ABTI x Growth OS step:'}
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:22px;">
          ${READINESS_QS.map((q, idx) => `
            <label style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);cursor:pointer;">
              <input type="checkbox" data-rdy-idx="${idx}" ${readinessAnswers[idx] ? 'checked' : ''} style="width:18px;height:18px;" />
              <span style="font-size:0.9rem;">${isAr ? q.ar : q.en}</span>
            </label>
          `).join('')}
        </div>

        <div class="calc-result-box" style="margin-bottom:18px;">
          <div style="font-family:var(--font-mono);font-size:0.82rem;color:var(--muted);">${isAr ? 'النتيجة التشغيلية الحالية' : 'CURRENT READINESS SCORE'}: ${yesCount} / 6</div>
          <p style="font-size:0.95rem;font-weight:600;margin-top:6px;">${isAr ? recAr : recEn}</p>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="go-solutions-cta" class="pill-btn active" type="button">
            ${isAr ? 'اطلب فيديو التشريح المجاني الآن' : 'Request Free 2-Min Teardown Now'}
          </button>
        </div>
      </div>
    </section>
  `;

  container.querySelectorAll('[data-lab-tab]').forEach(btn => {
    btn.onclick = () => {
      activeLabTab = btn.dataset.labTab;
      renderGamePage(container, state, navigate);
    };
  });

  container.querySelectorAll('[data-rdy-idx]').forEach(chk => {
    chk.onchange = () => {
      const idx = Number(chk.dataset.rdyIdx);
      readinessAnswers[idx] = chk.checked;
      renderReadinessCheck(container, state, navigate);
    };
  });

  container.querySelector('#go-solutions-cta')?.addEventListener('click', () => navigate('/solutions'));
}

export async function renderGamePage(container, state, navigate) {
  const isAr = state.lang === 'ar';

  if (activeLabTab === 'readiness') {
    renderReadinessCheck(container, state, navigate);
    return;
  }

  if (!gameState.rounds.length && state.works.length) {
    startNewGame(state.works);
  }

  if (!gameState.rounds.length) {
    container.innerHTML = `<section class="container" style="padding:60px 24px;text-align:center;">${isAr ? 'جاري تجهيز المختبر التفاعلي...' : 'Loading Interactive Lab...'}</section>`;
    return;
  }

  if (gameState.index >= gameState.rounds.length) {
    await fetchLeaderboard();
    const total = gameState.rounds.length;
    const msg = gameState.score >= 8
      ? (isAr ? 'عين فنان حقيقية! تميز بين الضوء الطبيعي والذكاء الاصطناعي ببراعة.' : 'True artist eye! You spot the difference between camera light and AI effortlessly.')
      : gameState.score >= 5
        ? (isAr ? 'أداء رائع! الخط الفاصل بين الإنسان والآلة أصبح رفيعاً جداً.' : 'Great score! The line between human and machine is getting thinner.')
        : (isAr ? 'الآلة خدعتك هذه المرة! جرّب جولة جديدة.' : 'The machine fooled you this time! Try another round.');

    container.innerHTML = `
      <section class="container" style="max-width:640px;margin:36px auto 72px;">
        ${renderLabTabs(isAr)}
        <div class="about-card" style="margin:0 0 24px 0;text-align:center;">
          <span class="section-kicker">${isAr ? 'النتيجة النهائية' : 'Final Score'}</span>
          <h1 class="hero-title" style="font-size:3.5rem;margin:12px 0;">${gameState.score} / ${total}</h1>
          <p style="color:var(--muted);margin-bottom:20px;">${msg}</p>

          ${!gameState.savedScore ? `
            <form id="save-score-form" style="display:flex;gap:8px;max-width:360px;margin:0 auto 20px;">
              <input id="lb-player-name" class="input" type="text" placeholder="${isAr ? 'اكتب اسمك للوحة الصدارة' : 'Your name for leaderboard'}" value="${state.profile?.display_name || ''}" maxlength="32" required />
              <button class="pill-btn active" type="submit">${isAr ? 'حفظ' : 'Save'}</button>
            </form>
          ` : `<div style="font-size:0.9rem;margin-bottom:16px;">✓ ${isAr ? 'تم تسجيل نتيجتك في لوحة الصدارة!' : 'Score saved to leaderboard!'}</div>`}

          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <button id="game-replay" class="pill-btn active" type="button">${isAr ? 'العب مرة أخرى' : 'Play Again'}</button>
            <button id="game-home" class="pill-btn" type="button">${isAr ? 'العودة للرئيسية' : 'Back Home'}</button>
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:14px;">🏆 ${isAr ? 'لوحة الصدارة العالمية (أعلى 10)' : 'Global Leaderboard (Top 10)'}</h2>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${gameState.leaderboard.length ? gameState.leaderboard.map((row, idx) => `
              <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;">
                <span><strong>#${idx + 1}</strong> ${row.player_name}</span>
                <span style="font-weight:700;font-family:var(--font-mono);">${row.score} / ${row.total_rounds}</span>
              </div>
            `).join('') : `<div style="color:var(--muted);font-size:0.9rem;">${isAr ? 'كن أول من يسجل نتيجته!' : 'Be the first on the leaderboard!'}</div>`}
          </div>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-lab-tab]').forEach(btn => {
      btn.onclick = () => {
        activeLabTab = btn.dataset.labTab;
        renderGamePage(container, state, navigate);
      };
    });

    container.querySelector('#save-score-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = container.querySelector('#lb-player-name').value.trim();
      if (!name) return;
      await supabase.from('game_scores').insert({
        profile_id: state.profile?.id || null,
        player_name: name,
        score: gameState.score,
        total_rounds: total
      });
      gameState.savedScore = true;
      renderGamePage(container, state, navigate);
    });

    container.querySelector('#game-replay').onclick = () => {
      startNewGame(state.works);
      renderGamePage(container, state, navigate);
    };
    container.querySelector('#game-home').onclick = () => navigate('/');
    return;
  }

  const work = gameState.rounds[gameState.index];
  const imgUrl = (work.image_urls || {})['1200'] || (work.image_urls || {})['480'] || '';
  const title = isAr ? (work.title_ar || work.title_en) : (work.title_en || work.title_ar);
  const ans = gameState.answered;

  container.innerHTML = `
    <section class="container" style="max-width:740px;margin:36px auto 72px;">
      ${renderLabTabs(isAr)}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div>
          <span class="section-kicker" style="margin:0;">07 · ${isAr ? 'المختبر التفاعلي: إنسان أم آلة؟' : 'INTERACTIVE LAB: HUMAN OR AI?'}</span>
          <div style="font-size:0.9rem;color:var(--muted);">${isAr ? `الجولة ${gameState.index + 1} من ${gameState.rounds.length}` : `Round ${gameState.index + 1} of ${gameState.rounds.length}`}</div>
        </div>
        <div class="pill-btn active">${isAr ? `النتيجة: ${gameState.score}` : `Score: ${gameState.score}`}</div>
      </div>

      <div class="about-card" style="padding:20px;text-align:center;">
        <div style="background:#050507;border-radius:12px;overflow:hidden;margin-bottom:20px;max-height:520px;display:flex;align-items:center;justify-content:center;">
          <img src="${imgUrl}" alt="" style="max-height:520px;width:auto;object-fit:contain;" />
        </div>

        ${!ans ? `
          <div style="display:flex;justify-content:center;gap:14px;flex-wrap:wrap;">
            <button id="guess-camera" class="pill-btn" style="padding:12px 24px;font-size:1rem;" type="button">📷 ${isAr ? 'كاميرا (إنسان)' : 'Camera (Human)'}</button>
            <button id="guess-ai" class="pill-btn" style="padding:12px 24px;font-size:1rem;" type="button">✨ ${isAr ? 'ذكاء اصطناعي (آلة)' : 'AI (Machine)'}</button>
          </div>
        ` : `
          <div style="margin-bottom:16px;">
            <div style="font-size:1.15rem;font-weight:700;color:${ans.correct ? '#22C55E' : 'var(--danger)'};margin-bottom:6px;">
              ${ans.correct ? (isAr ? 'إجابة صحيحة! ✓' : 'Correct! ✓') : (isAr ? 'إجابة خاطئة ✕' : 'Not quite ✕')}
            </div>
            <div style="color:var(--muted);font-size:0.92rem;">
              ${title} · ${work.origin === 'camera' ? (isAr ? '📷 تصوير كاميرا' : '📷 Camera Photo') : (isAr ? '✨ ذكاء اصطناعي' : '✨ AI Plate')}
            </div>
          </div>
          <button id="game-next" class="pill-btn active" style="padding:10px 26px;" type="button">
            ${gameState.index + 1 < gameState.rounds.length ? (isAr ? 'التالي' : 'Next') : (isAr ? 'عرض النتيجة' : 'See Results')}
          </button>
        `}
      </div>
    </section>
  `;

  container.querySelectorAll('[data-lab-tab]').forEach(btn => {
    btn.onclick = () => {
      activeLabTab = btn.dataset.labTab;
      renderGamePage(container, state, navigate);
    };
  });

  if (!ans) {
    const handleGuess = (guess) => {
      const correct = guess === work.origin;
      if (correct) gameState.score++;
      gameState.answered = { guess, correct };
      renderGamePage(container, state, navigate);
    };
    container.querySelector('#guess-camera').onclick = () => handleGuess('camera');
    container.querySelector('#guess-ai').onclick = () => handleGuess('ai');
  } else {
    container.querySelector('#game-next').onclick = () => {
      gameState.index++;
      gameState.answered = null;
      renderGamePage(container, state, navigate);
    };
  }
}
