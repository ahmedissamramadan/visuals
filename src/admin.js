import { supabase } from './lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

let curationFilter = 'all'; // 'all' | 'published' | 'archived' | 'featured'

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
            <input id="adm-user" class="input" type="text" placeholder="Username or Email" required />
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

  const [{ data: allWorks }, { data: allComments }] = await Promise.all([
    supabase.from('works').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('comments').select('id, body, is_hidden, created_at, profiles(display_name), works(title_en, title_ar)').order('created_at', { ascending: false }).limit(40)
  ]);

  const worksList = allWorks || [];
  const pubCount = worksList.filter(w => w.is_published !== false).length;
  const archCount = worksList.filter(w => w.is_published === false).length;
  const featCount = worksList.filter(w => w.is_featured).length;

  const filteredWorks = worksList.filter(w => {
    if (curationFilter === 'published') return w.is_published !== false;
    if (curationFilter === 'archived') return w.is_published === false;
    if (curationFilter === 'featured') return w.is_featured === true;
    return true;
  });

  container.innerHTML = `
    <section class="container" style="padding:36px 24px 80px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h1 class="section-title">Visuals Control & Curation Engine - ${admin.display_name}</h1>
        <button id="adm-logout" class="pill-btn" type="button">Sign Out</button>
      </div>

      <!-- Engine Overview Cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
        <div class="about-card" style="margin:0;padding:18px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">${state.collections.length}</div>
          <div style="font-size:0.82rem;color:var(--muted);">Active Collections</div>
        </div>
        <div class="about-card" style="margin:0;padding:18px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">${pubCount}</div>
          <div style="font-size:0.82rem;color:var(--muted);">Published Works (recent)</div>
        </div>
        <div class="about-card" style="margin:0;padding:18px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:var(--danger);">${archCount}</div>
          <div style="font-size:0.82rem;color:var(--muted);">Archived / Filtered</div>
        </div>
        <div class="about-card" style="margin:0;padding:18px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:var(--accent);">${featCount}</div>
          <div style="font-size:0.82rem;color:var(--muted);">Featured Spotlight</div>
        </div>
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
            <input id="up-title-en" class="input" type="text" placeholder="Title (EN) - optional" />
            <input id="up-title-ar" class="input" type="text" placeholder="Title (AR) - optional" />
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

      <!-- Visual Curation Engine -->
      <div class="about-card" style="margin:0 0 36px 0;max-width:100%;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
          <h2 style="font-size:1.2rem;">Visual Curation & Quality Filter (${filteredWorks.length})</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${['all', 'published', 'archived', 'featured'].map(f => `
              <button class="pill-btn cur-filter-btn ${curationFilter === f ? 'active' : ''}" data-filter="${f}" type="button">
                ${f.toUpperCase()}
              </button>
            `).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;max-height:540px;overflow-y:auto;">
          ${filteredWorks.slice(0, 60).map(w => {
            const thumb = (w.image_urls || {})['480'] || (w.image_urls || {})['1200'] || '';
            return `
              <div style="display:flex;gap:12px;align-items:center;background:var(--surface-2);padding:10px;border-radius:12px;border:1px solid var(--border);opacity:${w.is_published === false ? 0.55 : 1};">
                <img src="${thumb}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;" loading="lazy" />
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.title_ar || w.title_en}</div>
                  <div style="font-size:0.74rem;color:var(--muted);">${w.width || 1200}×${w.height || 1200} • Score ${w.quality_score || 85}%</div>
                  <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="pill-btn toggle-pub-btn" data-id="${w.id}" data-pub="${w.is_published !== false}" style="padding:3px 9px;font-size:0.74rem;" type="button">
                      ${w.is_published !== false ? 'Archive' : 'Publish'}
                    </button>
                    <button class="pill-btn toggle-feat-btn ${w.is_featured ? 'active' : ''}" data-id="${w.id}" data-feat="${w.is_featured}" style="padding:3px 9px;font-size:0.74rem;" type="button">
                      ★
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
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
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-feat-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextFeat = btn.dataset.feat !== 'true';
      await supabase.from('works').update({ is_featured: nextFeat }).eq('id', id);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

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
    renderAdminPage(container, state, onRefresh);
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
