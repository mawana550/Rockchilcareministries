/* Rock ChildCare CMS: loads saved content, applies it to the page, and
   provides the click-to-edit mode (open the site with ?edit=1). */
(function () {
  'use strict';
  var cfg = window.CMS_CONFIG || {};
  var isAdminPage = !!window.CMS_ADMIN;
  var enabled = !!(cfg.url && cfg.anonKey && window.supabase && window.supabase.createClient);
  var sb = enabled ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
  var CMS = window.CMS = {
    enabled: enabled, sb: sb, data: null, texts: {}, images: {},
    editing: enabled && !isAdminPage && /[?&]edit=1/.test(location.search)
  };

  function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function imgKey(src) { return (src || '').split('?')[0].replace(/^.*\//, '').replace(/\.\w+$/, '').toLowerCase(); }
  function isRemote(src) { return /^(https?:|data:|blob:)/i.test(src || ''); }
  CMS.norm = norm;

  /* ---------- loading ---------- */
  CMS.load = function () {
    return Promise.all([
      sb.from('kv').select('key,value'),
      sb.from('children').select('*').order('position'),
      sb.from('gallery').select('*').order('position'),
      sb.from('before_after').select('*').order('position')
    ]).then(function (r) {
      for (var i = 0; i < r.length; i++) if (r[i].error) throw r[i].error;
      var kv = {};
      r[0].data.forEach(function (x) { kv[x.key] = x.value; });
      return { kv: kv, children: r[1].data, gallery: r[2].data, ba: r[3].data };
    });
  };

  /* ---------- picture upload (shrinks big phone photos first) ---------- */
  CMS.upload = function (file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 1600 / Math.max(im.width, im.height));
        var c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!b) return reject(new Error('Could not read that picture.'));
          var path = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
          sb.storage.from('media').upload(path, b, { contentType: 'image/jpeg', cacheControl: '31536000' })
            .then(function (res) {
              if (res.error) return reject(res.error);
              resolve(sb.storage.from('media').getPublicUrl(path).data.publicUrl);
            });
        }, 'image/jpeg', 0.85);
      };
      im.onerror = function () { reject(new Error('That file is not a picture I can open. Please use a JPG or PNG.')); };
      im.src = url;
    });
  };

  /* ---------- visitors sending their details ---------- */
  CMS.submit = function (kind, name, data) {
    if (!enabled) return;
    try { sb.from('submissions').insert({ kind: kind, name: name || '', data: data || {} }).then(function () {}, function () {}); } catch (e) {}
  };

  if (isAdminPage) { CMS.ready = Promise.resolve(); return; }
  if (!enabled) { CMS.ready = Promise.resolve(); return; }

  /* ---------- apply saved words and pictures ---------- */
  function setNodeText(node, val) {
    var v = node.nodeValue, lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    node.nodeValue = lead + val + trail;
  }
  function skipNode(node) {
    var p = node.parentElement;
    if (!p) return true;
    if (/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.tagName)) return true;
    return !!p.closest('#cmsUI, [data-cms-lock], .wd');
  }
  function applyTextNode(node) {
    if (skipNode(node)) return;
    if (!node._cmsKey) { var k = norm(node.nodeValue); if (!k) return; node._cmsKey = k; }
    var want = Object.prototype.hasOwnProperty.call(CMS.texts, node._cmsKey) ? CMS.texts[node._cmsKey] : node._cmsKey;
    if (norm(node.nodeValue) !== want) setNodeText(node, want);
  }
  function applyTexts(root) {
    if (root.nodeType === 3) return applyTextNode(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(applyTextNode);
  }
  function applyImageEl(el) {
    if (el.closest && el.closest('#cmsUI')) return;
    if (el.tagName === 'IMG') {
      var s = el.getAttribute('src') || '';
      if (!el.dataset.cmsOrig) { if (!s || isRemote(s)) return; el.dataset.cmsOrig = s; }
      var u = CMS.images[imgKey(el.dataset.cmsOrig)];
      el.src = u || el.dataset.cmsOrig;
    } else if (el.classList.contains('hero-slide')) {
      if (!el.dataset.cmsOrig) {
        var m = (el.style.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
        if (!m) return; el.dataset.cmsOrig = m[1];
      }
      var u2 = CMS.images[imgKey(el.dataset.cmsOrig)];
      el.style.backgroundImage = "url('" + (u2 || el.dataset.cmsOrig) + "')";
    }
  }
  function applyImages(root) {
    if (root.nodeType !== 1) return;
    applyImageEl(root);
    root.querySelectorAll('img, .hero-slide').forEach(applyImageEl);
  }
  function applyCampaign() {
    var c = CMS.data && CMS.data.campaign;
    if (!c) return;
    var raised = Number(c.raised) || 0, goal = Number(c.goal) || 0;
    var pct = goal > 0 ? Math.min(100, Math.round(raised / goal * 1000) / 10) : 0;
    var set = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
    set('cmpRaised', '$' + raised.toLocaleString());
    set('cmpGoal', '$' + goal.toLocaleString());
    set('cmpPct', pct + '% of campaign goal reached');
    set('newsGoal', '$' + (goal >= 1000 && goal % 1000 === 0 ? goal / 1000 + 'K' : goal.toLocaleString()));
    var bar = document.getElementById('cmpBar'); if (bar) bar.style.width = pct + '%';
  }
  function applyAll() {
    applyTexts(document.body);
    applyImages(document.body);
    applyCampaign();
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType === 3) applyTextNode(n);
          else if (n.nodeType === 1 && !(n.closest && n.closest('#cmsUI'))) { applyTexts(n); applyImages(n); }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  var loadP = CMS.load().then(function (d) {
    CMS.data = { children: d.children, gallery: d.gallery, ba: d.ba, campaign: d.kv.campaign || null };
    CMS.texts = d.kv.texts || {};
    CMS.images = d.kv.images || {};
    return new Promise(function (res) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', res); else res();
    }).then(applyAll);
  });
  CMS.ready = Promise.race([loadP, new Promise(function (r) { setTimeout(r, 6000); })]).catch(function () {});

  /* ---------- click-to-edit mode (?edit=1) ---------- */
  if (!CMS.editing) return;

  var dirty = 0, mode = 'edit', ui, editorCtx = null, fileInput;

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '#cmsUI,#cmsUI *{font-family:Poppins,Arial,sans-serif;box-sizing:border-box}' +
      '#cmsBar{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99990;background:#171717;color:#fff;padding:10px 14px;border-radius:18px;box-shadow:0 10px 35px rgba(0,0,0,.45);display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;width:min(96vw,760px);font-size:.85rem}' +
      '#cmsBar button,#cmsBar select,#cmsBar a{border:0;border-radius:50px;padding:9px 14px;font-weight:600;font-size:.82rem;cursor:pointer;text-decoration:none;background:#2c2c2c;color:#fff}' +
      '#cmsBar .on{background:#ff6b00}#cmsBar .pub{background:#159447}#cmsBar .pub[disabled]{opacity:.45;cursor:default}' +
      '#cmsBar select{padding:9px 10px}' +
      '#cmsEd,#cmsLogin{position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '#cmsEd .box,#cmsLogin .box{background:#fff;color:#171717;border-radius:18px;padding:22px;width:min(94vw,520px);max-height:92vh;overflow:auto}' +
      '#cmsUI h3{color:#ff6b00;margin-bottom:6px}#cmsUI p.sm{font-size:.82rem;color:#666;margin-bottom:10px}' +
      '#cmsUI textarea,#cmsUI input{width:100%;padding:11px;border:1px solid #ddd;border-radius:10px;font-size:.95rem;margin-bottom:10px}' +
      '#cmsUI textarea{min-height:120px;resize:vertical}' +
      '#cmsUI .row{display:flex;gap:8px;flex-wrap:wrap}' +
      '#cmsUI .row button{border:0;border-radius:50px;padding:10px 18px;font-weight:700;cursor:pointer;background:#eee;color:#222}' +
      '#cmsUI .row .go{background:#ff6b00;color:#fff}' +
      '#cmsUI .err{color:#c0392b;font-size:.85rem;margin-bottom:8px}' +
      'body.cms-editing .impact-float-btn,body.cms-editing .toast-container,body.cms-editing #cursorGlow,body.cms-editing .float-heart{display:none!important}' +
      'body.cms-editing{padding-bottom:90px}' +
      '.cms-hover{outline:2px dashed #ff6b00!important;outline-offset:2px;cursor:pointer!important}';
    document.head.appendChild(s);
  }

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function mount() {
    ui = document.createElement('div'); ui.id = 'cmsUI'; document.body.appendChild(ui);
    fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = 'image/*';
    fileInput.style.display = 'none'; ui.appendChild(fileInput);
  }

  function showLogin(msg) {
    var box = el('<div id="cmsLogin"><div class="box"><h3>Admin sign in</h3>' +
      '<p class="sm">Sign in to edit the website words and pictures.</p>' +
      '<input id="cmsEm" type="email" placeholder="Email" autocomplete="username">' +
      '<input id="cmsPw" type="password" placeholder="Password" autocomplete="current-password">' +
      '<p class="err" id="cmsLErr"></p><div class="row"><button class="go" id="cmsGo">Sign in</button>' +
      '<button id="cmsNo">Cancel</button></div></div></div>');
    ui.appendChild(box);
    if (msg) box.querySelector('#cmsLErr').textContent = msg;
    box.querySelector('#cmsNo').onclick = function () { location.href = location.pathname; };
    box.querySelector('#cmsGo').onclick = function () {
      var b = this; b.textContent = 'Signing in...';
      sb.auth.signInWithPassword({ email: box.querySelector('#cmsEm').value.trim(), password: box.querySelector('#cmsPw').value })
        .then(function (r) {
          if (r.error) { b.textContent = 'Sign in'; box.querySelector('#cmsLErr').textContent = 'Wrong email or password.'; return; }
          box.remove(); start();
        });
    };
  }

  function bar() {
    var b = el('<div id="cmsBar">' +
      '<button id="cmsMode" class="on">Editing: tap any word or picture</button>' +
      '<select id="cmsPage"><option value="home">Home</option><option value="about">About</option><option value="campaign">Campaign</option>' +
      '<option value="impact">Our Impact</option><option value="gallery">Gallery</option><option value="contact">Contact</option></select>' +
      '<button id="cmsPub" class="pub" disabled>Publish changes</button>' +
      '<a href="admin.html">Dashboard</a><button id="cmsOut">Exit</button></div>');
    ui.appendChild(b);
    b.querySelector('#cmsMode').onclick = function () {
      mode = mode === 'edit' ? 'browse' : 'edit';
      this.className = mode === 'edit' ? 'on' : '';
      this.textContent = mode === 'edit' ? 'Editing: tap any word or picture' : 'Browsing: tap to open pop-ups and menus';
      document.body.classList.toggle('cms-editing', true);
    };
    b.querySelector('#cmsPage').onchange = function () { if (window.showTab) window.showTab(this.value); };
    b.querySelector('#cmsPub').onclick = publish;
    b.querySelector('#cmsOut').onclick = function () {
      if (dirty && !confirm('You have unpublished changes. Leave without publishing?')) return;
      location.href = location.pathname;
    };
  }
  function markDirty() {
    dirty++;
    var p = document.getElementById('cmsPub'); p.disabled = false; p.textContent = 'Publish changes (' + dirty + ')';
  }
  function publish() {
    var p = document.getElementById('cmsPub'); p.textContent = 'Publishing...'; p.disabled = true;
    var now = new Date().toISOString();
    sb.from('kv').upsert([{ key: 'texts', value: CMS.texts, updated_at: now }, { key: 'images', value: CMS.images, updated_at: now }])
      .then(function (r) {
        if (r.error) { p.disabled = false; p.textContent = 'Publish changes (' + dirty + ')'; alert('Could not publish: ' + r.error.message); return; }
        dirty = 0; p.textContent = 'Published \u2713';
      });
  }

  function closeEd() { var e = document.getElementById('cmsEd'); if (e) e.remove(); editorCtx = null; }

  function textNodeAt(e) {
    var node = null, t = e.target;
    if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) node = r.startContainer; }
    else if (document.caretPositionFromPoint) { var p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) node = p.offsetNode; }
    if (node && node.nodeType === 3 && norm(node.nodeValue) && t.contains(node) && !skipNode(node)) return node;
    var w = document.createTreeWalker(t, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (norm(n.nodeValue) && !skipNode(n)) return n;
    return null;
  }

  function openTextEditor(node) {
    if (!node._cmsKey) node._cmsKey = norm(node.nodeValue);
    var key = node._cmsKey;
    closeEd();
    var d = el('<div id="cmsEd"><div class="box"><h3>Edit these words</h3>' +
      '<p class="sm">If the same words appear in other places on the website, they change together.</p>' +
      '<textarea id="cmsTx"></textarea><div class="row"><button class="go" id="cmsSv">Save</button>' +
      '<button id="cmsRs">Put back the original</button><button id="cmsCn">Cancel</button></div></div></div>');
    ui.appendChild(d);
    var ta = d.querySelector('#cmsTx'); ta.value = norm(node.nodeValue); ta.focus();
    function applyKey(val) {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) if (n._cmsKey === key) setNodeText(n, val);
    }
    d.querySelector('#cmsSv').onclick = function () {
      var v = norm(ta.value);
      if (!v) { alert('Please type something, or press "Put back the original".'); return; }
      if (v === key) delete CMS.texts[key]; else CMS.texts[key] = v;
      applyKey(v); markDirty(); closeEd();
    };
    d.querySelector('#cmsRs').onclick = function () { delete CMS.texts[key]; applyKey(key); markDirty(); closeEd(); };
    d.querySelector('#cmsCn').onclick = closeEd;
  }

  function openImageEditor(target) {
    var orig = target.dataset.cmsOrig;
    if (!orig) return;
    closeEd();
    var d = el('<div id="cmsEd"><div class="box"><h3>Change this picture</h3>' +
      '<p class="sm">Choose a new picture from your phone or computer. It is shrunk automatically.</p>' +
      '<p class="err" id="cmsIErr"></p><div class="row"><button class="go" id="cmsPick">Choose picture</button>' +
      '<button id="cmsRs">Put back the original</button><button id="cmsCn">Cancel</button></div></div></div>');
    ui.appendChild(d);
    var k = imgKey(orig);
    d.querySelector('#cmsPick').onclick = function () { fileInput.value = ''; fileInput.click(); };
    fileInput.onchange = function () {
      var f = fileInput.files[0]; if (!f) return;
      var btn = d.querySelector('#cmsPick'); btn.textContent = 'Uploading...';
      CMS.upload(f).then(function (url) {
        CMS.images[k] = url; applyImages(document.body); markDirty(); closeEd();
      }).catch(function (err) { btn.textContent = 'Choose picture'; d.querySelector('#cmsIErr').textContent = err.message || 'Upload failed.'; });
    };
    d.querySelector('#cmsRs').onclick = function () { delete CMS.images[k]; applyImages(document.body); markDirty(); closeEd(); };
    d.querySelector('#cmsCn').onclick = closeEd;
  }

  function onClick(e) {
    if (mode !== 'edit' || e.target.closest('#cmsUI')) return;
    e.preventDefault(); e.stopPropagation();
    var t = e.target;
    if (t.tagName === 'IMG' && t.dataset.cmsOrig) return openImageEditor(t);
    var node = textNodeAt(e);
    if (node) return openTextEditor(node);
    var slide = t.closest('.hero') && document.querySelector('.hero-slide.on');
    if (slide) return openImageEditor(slide);
    if (t.tagName === 'IMG') alert('This picture is managed from the Dashboard (Children, Gallery or Before & After).');
  }

  var hov = null;
  function onOver(e) {
    if (hov) hov.classList.remove('cms-hover');
    hov = null;
    if (mode !== 'edit' || e.target.closest('#cmsUI')) return;
    hov = e.target; hov.classList.add('cms-hover');
  }

  function start() {
    document.body.classList.add('cms-editing');
    bar();
    document.addEventListener('click', onClick, true);
    document.addEventListener('mouseover', onOver, true);
    window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  CMS.ready.then(function () {
    mount(); css();
    sb.auth.getSession().then(function (r) { if (r.data && r.data.session) start(); else showLogin(); });
  });
})();
