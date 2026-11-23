import { supabase } from './lib/supabase.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

let curationFilter = 'all';

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
  } catch {}
}

export async function renderAdminPage(container, state, onRefresh) {
  const admin = await checkIsAdmin();
  const isAr = state.lang === 'ar';

  if (!admin) {
    container.innerHTML = `
      <section class="container" style="max-width:440px;margin:64px auto;">
        <div class="about-card">
          <h1 class="section-title" style="margin-bottom:16px;">${isAr ? 'دخول الإدارة' : 'Admin Studio'}</h1>
          <form id="admin-login-form" style="display:flex;flex-direction:column;gap:12px;">
            <input id="adm-user" class="input" type="text" placeholder="${isAr ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email'}" required />
            <input id="adm-pass" class="input" type="password" placeholder="${isAr ? 'كلمة المرور' : 'Password'}" required />
            <div id="adm-err" style="color:var(--danger);font-size:0.85rem;"></div>
            <button class="pill-btn active" type="submit" style="justify-content:center;padding:10px;">${isAr ? 'تسجيل الدخول' : 'Sign In'}</button>
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

  const [{ data: allWorks }, { data: allComments }, { data: allInquiries }, { data: allNotes }] = await Promise.all([
    supabase.from('works').select('*').order('created_at', { ascending: false }).limit(200),
    supabase.from('comments').select('id, body, is_hidden, created_at, profiles(display_name), works(title_en, title_ar)').order('created_at', { ascending: false }).limit(30),
    supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(30),
    supabase.from('mind_notes').select('*').order('sort_order')
  ]);

  const worksList = allWorks || [];
  const filteredWorks = worksList.filter(w => {
    if (curationFilter === 'published') return w.is_published !== false;
    if (curationFilter === 'archived') return w.is_published === false;
    if (curationFilter === 'featured') return w.is_featured === true;
    return true;
  });

  container.innerHTML = `
    <section class="container" style="padding:36px 24px 80px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <h1 class="section-title">Artelligence Control Studio (${admin.display_name})</h1>
        <button id="adm-logout" class="pill-btn" type="button">${isAr ? 'تسجيل الخروج' : 'Sign Out'}</button>
      </div>

      <!-- Inquiries & Live Mind -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:28px;">
        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? `الرسائل الواردة (${(allInquiries || []).length})` : `Client Inquiries (${(allInquiries || []).length})`}</h2>
          <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;">
            ${(allInquiries || []).length ? (allInquiries || []).map(inq => `
              <div class="comment-item" style="opacity:${inq.is_resolved ? 0.55 : 1};">
                <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;">
                  <strong>${inq.sender_name} (${inq.sender_contact})</strong>
                  <button class="pill-btn resolve-inq-btn" data-id="${inq.id}" data-res="${inq.is_resolved}" style="padding:2px 8px;font-size:0.72rem;" type="button">
                    ${inq.is_resolved ? 'Resolved' : 'Mark Done'}
                  </button>
                </div>
                <div style="color:var(--muted);">${inq.message}</div>
              </div>
            `).join('') : `<div style="color:var(--muted);font-size:0.86rem;">No inquiries yet.</div>`}
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">${isAr ? 'نشر تحديث في عقلي (Live Mind)' : 'Publish Live Mind Note'}</h2>
          <form id="mind-note-form" style="display:flex;flex-direction:column;gap:10px;">
            <select id="mn-cat" class="input">
              <option value="now">Live Focus (التركيز الحالي)</option>
              <option value="principle">Principle (مبدأ)</option>
              <option value="essay">Essay (فكرة)</option>
              <option value="system">System (نظام)</option>
            </select>
            <input id="mn-ar" class="input" type="text" placeholder="العنوان بالعربي" required />
            <input id="mn-en" class="input" type="text" placeholder="Title (EN)" required />
            <textarea id="mn-body-ar" class="input" rows="2" placeholder="النص بالعربي" required></textarea>
            <textarea id="mn-body-en" class="input" rows="2" placeholder="Body (EN)" required></textarea>
            <button class="pill-btn active" type="submit">${isAr ? 'نشر في عقلي' : 'Publish Note'}</button>
            <div id="mn-status" style="font-size:0.84rem;color:var(--muted);"></div>
          </form>
        </div>
      </div>

      <!-- Upload & New Collection -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:28px;">
        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">Upload Works (Drag & Drop)</h2>
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
            <label id="drop-zone" style="border:2px dashed var(--border);border-radius:12px;padding:24px;text-align:center;cursor:pointer;color:var(--muted);">
              Drop images here or click to select
              <input id="up-files" type="file" accept="image/*" multiple style="display:none;" />
            </label>
            <div id="up-status" style="font-size:0.85rem;"></div>
          </div>
        </div>

        <div class="about-card">
          <h2 style="font-size:1.15rem;margin-bottom:12px;">New Collection</h2>
          <form id="new-col-form" style="display:flex;flex-direction:column;gap:10px;">
            <input id="col-slug" class="input" type="text" placeholder="Slug (e.g. street-cairo)" required />
            <select id="col-cat" class="input">
              <option value="client">Client Work</option>
              <option value="personal">Personal & AI</option>
              <option value="educational">Educational</option>
            </select>
            <input id="col-en" class="input" type="text" placeholder="Title (EN)" required />
            <input id="col-ar" class="input" type="text" placeholder="Title (AR)" required />
            <button class="pill-btn active" type="submit">Create Collection</button>
            <div id="col-status" style="font-size:0.85rem;"></div>
          </form>
        </div>
      </div>

      <!-- Visual Curation Grid -->
      <div class="about-card" style="margin-bottom:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
          <h2 style="font-size:1.15rem;">Visual Curation (${filteredWorks.length})</h2>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${['all', 'published', 'archived', 'featured'].map(f => `
              <button class="pill-btn cur-filter-btn ${curationFilter === f ? 'active' : ''}" data-filter="${f}" type="button">${f.toUpperCase()}</button>
            `).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;max-height:480px;overflow-y:auto;">
          ${filteredWorks.slice(0, 60).map(w => {
            const thumb = (w.image_urls || {})['480'] || (w.image_urls || {})['1200'] || '';
            return `
              <div style="display:flex;gap:10px;align-items:center;background:var(--surface-2);padding:10px;border-radius:12px;border:1px solid var(--border);opacity:${w.is_published === false ? 0.55 : 1};">
                <img src="${thumb}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;" loading="lazy" />
                <div style="flex:1;min-width:0;">
                  <div style="font-size:0.84rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.title_ar || w.title_en}</div>
                  <div style="font-size:0.72rem;color:var(--muted);">${w.width || 1200}x${w.height || 1200} · ${w.quality_score || 85}%</div>
                  <div style="display:flex;gap:6px;margin-top:6px;">
                    <button class="pill-btn toggle-pub-btn" data-id="${w.id}" data-slug="${w.slug}" data-pub="${w.is_published !== false}" style="padding:3px 9px;font-size:0.72rem;" type="button">
                      ${w.is_published !== false ? 'Archive' : 'Publish'}
                    </button>
                    <button class="pill-btn toggle-feat-btn ${w.is_featured ? 'active' : ''}" data-id="${w.id}" data-slug="${w.slug}" data-feat="${w.is_featured}" style="padding:3px 9px;font-size:0.72rem;" type="button">★</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Comments -->
      <div class="about-card">
        <h2 style="font-size:1.15rem;margin-bottom:12px;">Comment Moderation (${(allComments || []).length})</h2>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${(allComments || []).map(c => `
            <div class="comment-item" style="display:flex;justify-content:space-between;align-items:center;gap:12px;opacity:${c.is_hidden ? 0.5 : 1};">
              <div>
                <div class="comment-author">${c.profiles?.display_name || 'Visitor'} · ${c.works?.title_en || ''}</div>
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

  container.querySelectorAll('.resolve-inq-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const nextRes = btn.dataset.res !== 'true';
      await supabase.from('inquiries').update({ is_resolved: nextRes }).eq('id', id);
      await logAudit(admin, 'resolve_inquiry', 'inquiry', id);
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelector('#mind-note-form').onsubmit = async (e) => {
    e.preventDefault();
    const slug = `note-${Date.now()}`;
    const { error } = await supabase.from('mind_notes').insert({
      slug,
      category: container.querySelector('#mn-cat').value,
      title_ar: container.querySelector('#mn-ar').value.trim(),
      title_en: container.querySelector('#mn-en').value.trim(),
      body_ar: container.querySelector('#mn-body-ar').value.trim(),
      body_en: container.querySelector('#mn-body-en').value.trim(),
      sort_order: (allNotes || []).length + 1
    });
    if (!error) {
      await logAudit(admin, 'publish_mind_note', 'mind_note', slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    } else {
      container.querySelector('#mn-status').textContent = error.message;
    }
  };

  container.querySelectorAll('.cur-filter-btn').forEach(btn => {
    btn.onclick = () => { curationFilter = btn.dataset.filter; renderAdminPage(container, state, onRefresh); };
  });

  container.querySelectorAll('.toggle-pub-btn').forEach(btn => {
    btn.onclick = async () => {
      const nextPub = btn.dataset.pub !== 'true';
      await supabase.from('works').update({ is_published: nextPub }).eq('id', btn.dataset.id);
      await logAudit(admin, nextPub ? 'publish_work' : 'archive_work', 'work', btn.dataset.slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    };
  });

  container.querySelectorAll('.toggle-feat-btn').forEach(btn => {
    btn.onclick = async () => {
      const nextFeat = btn.dataset.feat !== 'true';
      await supabase.from('works').update({ is_featured: nextFeat }).eq('id', btn.dataset.id);
      await logAudit(admin, nextFeat ? 'feature_work' : 'unfeature_work', 'work', btn.dataset.slug);
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
      await logAudit(admin, 'upload_work', 'work', slug);
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
    const slug = container.querySelector('#col-slug').value.trim();
    const { error } = await supabase.from('collections').insert({
      slug,
      category: container.querySelector('#col-cat').value,
      title_en: container.querySelector('#col-en').value.trim(),
      title_ar: container.querySelector('#col-ar').value.trim(),
      year: 2026,
      sort_order: state.collections.length + 1,
      is_published: true
    });
    container.querySelector('#col-status').textContent = error ? error.message : 'Collection created!';
    if (!error) {
      await logAudit(admin, 'create_collection', 'collection', slug);
      await onRefresh();
      renderAdminPage(container, state, onRefresh);
    }
  };

  container.querySelectorAll('.toggle-hide-btn').forEach(btn => {
    btn.onclick = async () => {
      const nextHidden = btn.dataset.hidden !== 'true';
      await supabase.from('comments').update({ is_hidden: nextHidden }).eq('id', btn.dataset.id);
      await logAudit(admin, nextHidden ? 'hide_comment' : 'unhide_comment', 'comment', btn.dataset.id);
      renderAdminPage(container, state, onRefresh);
    };
  });
}
