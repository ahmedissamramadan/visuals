import { supabase } from './lib/supabase.js';

// "Human or Machine?" 10-Round Guessing Game + Global Leaderboard
const gameState = {
  rounds: [],
  index: 0,
  score: 0,
  answered: null, // { guess, correct }
  savedScore: false,
  leaderboard: []
};

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

export async function renderGamePage(container, state) {
  const isAr = state.lang === 'ar';
  if (!gameState.rounds.length && state.works.length) {
    startNewGame(state.works);
  }

  if (!gameState.rounds.length) {
    container.innerHTML = `<section class="container" style="padding:60px 24px;text-align:center;">${isAr ? 'جاري تحميل اللوحات...' : 'Loading works...'}</section>`;
    return;
  }

  // Game Over + Global Leaderboard
  if (gameState.index >= gameState.rounds.length) {
    await fetchLeaderboard();
    const total = gameState.rounds.length;
    const msg = gameState.score >= 8
      ? (isAr ? 'عين فنان حقيقية! تميز بين الضوء الطبيعي والذكاء الاصطناعي ببراعة.' : 'True artist eye! You spot the difference between camera light and AI effortlessly.')
      : gameState.score >= 5
        ? (isAr ? 'أداء رائع! الخط الفاصل بين الإنسان والآلة أصبح رفيعاً جداً.' : 'Great score! The line between human and machine is getting thinner.')
        : (isAr ? 'الآلة خدعتك هذه المرة! جرّب جولة جديدة.' : 'The machine fooled you this time! Try another round.');

    container.innerHTML = `
      <section class="container" style="max-width:600px;margin:48px auto 72px;">
        <div class="about-card" style="margin:0 0 24px 0;text-align:center;">
          <span class="hero-eyebrow">${isAr ? 'النتيجة النهائية' : 'Final Score'}</span>
          <h1 class="hero-title" style="font-size:3.5rem;margin:12px 0;">${gameState.score} / ${total}</h1>
          <p style="color:var(--muted);margin-bottom:20px;">${msg}</p>

          ${!gameState.savedScore ? `
            <form id="save-score-form" style="display:flex;gap:8px;max-width:360px;margin:0 auto 20px;">
              <input id="lb-player-name" class="input" type="text" placeholder="${isAr ? 'اكتب اسمك للوحة الصدارة' : 'Your name for leaderboard'}" value="${state.profile?.display_name || ''}" maxlength="32" required />
              <button class="pill-btn active" type="submit">${isAr ? 'حفظ' : 'Save'}</button>
            </form>
          ` : `<div style="color:var(--accent);font-size:0.9rem;margin-bottom:16px;">✓ ${isAr ? 'تم تسجيل نتيجتك في لوحة الصدارة!' : 'Score saved to leaderboard!'}</div>`}

          <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
            <button id="game-replay" class="pill-btn active" type="button">${isAr ? 'العب مرة أخرى' : 'Play Again'}</button>
            <a href="#/" class="pill-btn">${isAr ? 'العودة للمجموعات' : 'Back to Collections'}</a>
          </div>
        </div>

        <div class="about-card" style="margin:0;">
          <h2 style="font-size:1.15rem;margin-bottom:14px;">🏆 ${isAr ? 'لوحة الصدارة (أعلى 10)' : 'Global Leaderboard (Top 10)'}</h2>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${gameState.leaderboard.length ? gameState.leaderboard.map((row, idx) => `
              <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;">
                <span><strong>#${idx + 1}</strong> ${row.player_name}</span>
                <span style="color:var(--accent);font-weight:700;">${row.score} / ${row.total_rounds}</span>
              </div>
            `).join('') : `<div style="color:var(--muted);font-size:0.9rem;">${isAr ? 'كن أول من يسجل نتيجته!' : 'Be the first on the leaderboard!'}</div>`}
          </div>
        </div>
      </section>
    `;

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
      renderGamePage(container, state);
    });

    container.querySelector('#game-replay').onclick = () => {
      startNewGame(state.works);
      renderGamePage(container, state);
    };
    return;
  }

  const work = gameState.rounds[gameState.index];
  const imgUrl = (work.image_urls || {})['1200'] || (work.image_urls || {})['480'] || '';
  const title = isAr ? (work.title_ar || work.title_en) : (work.title_en || work.title_ar);
  const ans = gameState.answered;

  container.innerHTML = `
    <section class="container" style="max-width:740px;margin:36px auto 72px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div>
          <span class="hero-eyebrow" style="margin:0;">${isAr ? 'لعبة إنسان أم آلة؟' : 'Human or Machine?'}</span>
          <div style="font-size:0.9rem;color:var(--muted);">${isAr ? `الجولة ${gameState.index + 1} من ${gameState.rounds.length}` : `Round ${gameState.index + 1} of ${gameState.rounds.length}`}</div>
        </div>
        <div class="pill-btn active">${isAr ? `النتيجة: ${gameState.score}` : `Score: ${gameState.score}`}</div>
      </div>

      <div class="about-card" style="margin:0;padding:20px;text-align:center;">
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
            <div style="font-size:1.15rem;font-weight:700;color:${ans.correct ? 'var(--accent)' : 'var(--danger)'};margin-bottom:6px;">
              ${ans.correct ? (isAr ? 'إجابة صحيحة! ✓' : 'Correct! ✓') : (isAr ? 'إجابة خاطئة ✕' : 'Not quite ✕')}
            </div>
            <div style="color:var(--muted);font-size:0.92rem;">
              ${title} - ${work.origin === 'camera' ? (isAr ? '📷 تصوير كاميرا' : '📷 Camera Photo') : (isAr ? '✨ ذكاء اصطناعي' : '✨ AI Plate')}
            </div>
          </div>
          <button id="game-next" class="pill-btn active" style="padding:10px 26px;" type="button">
            ${gameState.index + 1 < gameState.rounds.length ? (isAr ? 'التالي ←' : 'Next →') : (isAr ? 'عرض النتيجة' : 'See Results')}
          </button>
        `}
      </div>
    </section>
  `;

  if (!ans) {
    const handleGuess = (guess) => {
      const correct = guess === work.origin;
      if (correct) gameState.score++;
      gameState.answered = { guess, correct };
      renderGamePage(container, state);
    };
    container.querySelector('#guess-camera').onclick = () => handleGuess('camera');
    container.querySelector('#guess-ai').onclick = () => handleGuess('ai');
  } else {
    container.querySelector('#game-next').onclick = () => {
      gameState.index++;
      gameState.answered = null;
      renderGamePage(container, state);
    };
  }
}
