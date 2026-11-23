import { supabase } from './lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

export async function renderAdminPage(container, state, onRefresh) {
  const admin = await checkIsAdmin();

  if (!admin) {
    container.innerHTML = `
      <section class="container" style="max-width:440px;margin:64px auto;">
        <div class="about-card" style="margin:0;">
          <h1 class="section-title" style="margin-bottom:16px;">Admin Login</h1>
          <form id="admin-login-form" style="display:flex;flex-direction:column;gap:12px;">
            <input id="adm-user" class="input" type="text" placeholder="Username (boda890) or Email" required />
            <input id="adm-pass" class="input" type="password" placeholder="Password" required />
            <div id="adm-err" style="color:var(--danger);font-size:0.85rem;"></div>
            <button class="pill-btn active" type="submit" style="justify-content:center;padding:10px;">Sign In</button>
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

  const { data: allComments } = await supabase
    .from('comments')
    .select('id, body, is_hidden, created_at, profiles(display_name), works(title_en, title_ar)')
    .order('created_at', { ascending: false })
    .limit(40);

  container.innerHTML = `
    <section class="container" style="padding:36px 24px 80px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;flex-wrap:wrap;gap:12px;">
        <h1 class="section-title">Admin Dashboard — ${admin.display_name}</h1>
        <button id="adm-logout" class="pill-btn" type="button">Sign Out</button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px;margin-bottom:36px;">
        <!-- Upload Works -->
        <div class="about-card" style="margin:0;">
          <h2 style="font-size:1.2rem;margin-bottom:14px;">Upload Works (Drag & Drop)</h2>
          <div style="display:flex;flex-direction:column;gap:10px;">
            <select id="up-col" class="input">
              ${state.collections.map(c => `<option value="${c.id}">${c.title_en} (${c.title_ar})</option>`).join('')}
            </select>
            <select id="up-origin" class="input">
              <option value="camera">📷 Camera</option>
              <option value="ai">✨ AI</option>
              <option value="design">🎨 Design</option>
            </select>
            <input id="up-title-en" class="input" type="text" placeholder="Title (EN) — optional" />
            <input id="up-title-ar" class="input" type="text" placeholder="Title (AR) — optional" />
            <label id="drop-zone" style="border:2px dashed var(--border);border-radius:12px;padding:28px;text-align:center;cursor:pointer;color:var(--muted);">
              Drop images here or click to select
              <input id="up-files" type="file" accept="image/*" multiple style="display:none;" />
            </label>
            <div id="up-status" style="font-size:0.85rem;color:var(--accent);"></div>
          </div>
        </div>

        <!-- Create Collection -->
        <div class="about-card" style="margin:0;">
          <h2 style="font-size:1.2rem;margin-bottom:14px;">New Collection</h2>
          <form id="new-col-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="col-slug" class="input" type="text" placeholder="Slug (e.g. street-cairo)" required />
            <input id="col-en" class="input" type="text" placeholder="Title (EN)" required />
            <input id="col-ar" class="input" type="text" placeholder="Title (AR)" required />
            <input id="col-year" class="input" type="number" value="2026" />
            <button class="pill-btn active" type="submit">Create Collection</button>
            <div id="col-status" style="font-size:0.85rem;color:var(--accent);"></div>
          </form>
        </div>
      </div>

      <!-- Comment Moderation -->
      <div class="about-card" style="margin:0;max-width:100%;">
        <h2 style="font-size:1.2rem;margin-bottom:14px;">Comment Moderation (${(allComments || []).length})</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${(allComments || []).map(c => `
            <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;gap:12px;opacity:${c.is_hidden ? 0.5 : 1};">
              <div>
                <div class="comment-author">${c.profiles?.display_name || 'Visitor'} • <span style="color:var(--muted)">${c.works?.title_en || ''}</span></div>
                <div>${c.body}</div>
              </div>
              <button class="pill-btn toggle-hide-btn" data-id="${c.id}" data-hidden="${c.is_hidden}" type="button">
                ${c.is_hidden ? 'Unhide' : 'Hide'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;

  container.querySelector('#adm-logout').onclick = async () => {
    await supabase.auth.signOut();
    renderAdminPage(container, state, onRefresh);
  };

  const handleFiles = async (files) => {
    const colId = container.querySelector('#up-col').value;
    const origin = container.querySelector('#up-origin').value;
    const titleEn = container.querySelector('#up-title-en').value.trim();
    const titleAr = container.querySelector('#up-title-ar').value.trim();
    const status = container.querySelector('#up-status');

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      status.textContent = `Uploading ${i + 1}/${files.length}: ${f.name}...`;
      const slug = `work-${Date.now()}-${i + 1}`;
      const blurDataUrl = await makeBlurDataUrl(f);
      const imageUrls = {};
      let origW = 1200, origH = 1200;

      for (const w of [480, 1200, 2400]) {
        const { blob, width, height } = await resizeToWebP(f, w, 0.82);
        origW = width; origH = height;
        const path = `works/${slug}/${w}.webp`;
        const { error } = await supabase.storage.from('visuals').upload(path, blob, { contentType: 'image/webp', upsert: true });
        if (error) { status.textContent = error.message; return; }
        imageUrls[String(w)] = `${SUPABASE_URL}/storage/v1/object/public/visuals/${path}`;
      }

      const fallbackTitle = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      const { error: insErr } = await supabase.from('works').insert({
        slug,
        collection_id: colId,
        origin,
        media_type: 'image',
        title_en: titleEn || fallbackTitle,
        title_ar: titleAr || titleEn || fallbackTitle,
        image_urls: imageUrls,
        blur_data_url: blurDataUrl,
        width: origW,
        height: origH
      });
      if (insErr) { status.textContent = insErr.message; return; }
    }
    status.textContent = `Uploaded ${files.length} work(s) successfully!`;
    await onRefresh();
  };

  const dropZone = container.querySelector('#drop-zone');
  const fileInput = container.querySelector('#up-files');
  fileInput.onchange = (e) => e.target.files.length && handleFiles(e.target.files);
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; };
  dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--border)'; };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  container.querySelector('#new-col-form').onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('collections').insert({
      slug: container.querySelector('#col-slug').value.trim(),
      title_en: container.querySelector('#col-en').value.trim(),
      title_ar: container.querySelector('#col-ar').value.trim(),
      year: Number(container.querySelector('#col-year').value) || 2026,
      sort_order: state.collections.length + 1,
      is_published: true
    });
    container.querySelector('#col-status').textContent = error ? error.message : 'Collection created!';
    if (!error) { await onRefresh(); renderAdminPage(container, state, onRefresh); }
  };

  container.querySelectorAll('.toggle-hide-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextHidden = btn.dataset.hidden !== 'true';
      await supabase.from('comments').update({ is_hidden: nextHidden }).eq('id', id);
      renderAdminPage(container, state, onRefresh);
    };
  });
}
