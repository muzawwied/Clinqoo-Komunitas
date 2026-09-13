// Komunitas Clincoo — logic aplikasi multi-halaman
(function () {
  'use strict';
  var API = (location.hostname.indexOf('github.io') !== -1) ? 'https://clincoo-be2.pages.dev/api' : '/api';
  var TOKEN_KEY = 'clincoo_auth_token', TOKEN_KEY2 = 'clincoo_token', ME_KEY = 'clincoo_community_me';
  var page = document.body.getAttribute('data-page') || '';

  function $(id) { return document.getElementById(id); }
  function token() { try { return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY2) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function initials(name) { return (String(name || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('') || '?').toUpperCase(); }
  function relTime(iso) {
    var d = new Date(iso); if (isNaN(d.getTime())) return '';
    var s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60) return 'baru saja';
    var m = Math.floor(s / 60); if (m < 60) return m + ' mnt lalu';
    var h = Math.floor(m / 60); if (h < 24) return h + ' jam lalu';
    var dd = Math.floor(h / 24); if (dd < 7) return dd + ' hari lalu';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  function linkify(text) {
    return esc(text).replace(/(^|\s)#([\p{L}0-9_]+)/gu, function (m, sp, t) { return sp + '<span class="tag">#' + t + '</span>'; });
  }
  function myName() {
    var me = null; try { me = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) {}
    return (me && me.name) || 'Saya';
  }
  function setMyName(name) {
    try { localStorage.setItem(ME_KEY, JSON.stringify({ name: name, ts: Date.now() })); } catch (e) {}
  }
  var toastTmr = null;
  function toast(msg) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTmr); toastTmr = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    var tk = token(); if (tk) opts.headers['Authorization'] = 'Bearer ' + tk;
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; });
    });
  }

  /* ===== Tema ===== */
  function applyTheme(dark) {
    document.body.classList.toggle('dark-mode', dark);
    try { localStorage.setItem('clincoo_community_theme', dark ? 'dark' : 'light'); } catch (e) {}
    var lbl = $('theme-label');
    if (lbl) lbl.textContent = dark ? 'Mode terang' : 'Mode gelap';
  }
  var savedTheme = null; try { savedTheme = localStorage.getItem('clincoo_community_theme'); } catch (e) {}
  applyTheme(savedTheme ? savedTheme === 'dark' : true);

  /* ===== Auth ===== */
  function doLogout() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ME_KEY); } catch (e) {}
    location.replace('login.html');
  }

  /* ===== Bottom nav (di-inject di semua halaman kecuali login) ===== */
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
    jelajah: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="m20 20-3.5-3.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/></svg>',
    profil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path stroke-linecap="round" d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>'
  };
  function buildNav() {
    var holder = $('bottom-nav'); if (!holder) return;
    var items = [
      { id: 'home', href: 'index.html', icon: ICONS.home, label: 'Beranda' },
      { id: 'jelajah', href: 'jelajah.html', icon: ICONS.jelajah, label: 'Jelajah' },
      { id: 'post', href: 'posting.html', icon: ICONS.plus, label: 'Tulis', plus: true },
      { id: 'profil', href: 'profil.html', icon: ICONS.profil, label: 'Profil', avatar: true }
    ];
    holder.className = 'bottom-nav';
    holder.innerHTML = items.map(function (it) {
      var cls = 'bn-item' + (page === it.id ? ' is-active' : '') + (it.plus ? ' bn-plus' : '');
      var inner = it.avatar ? '<div class="avatar sm" id="nav-avatar">' + esc(initials(myName())) + '</div>' : it.icon;
      return '<a class="' + cls + '" href="' + it.href + '" aria-label="' + it.label + '">' + inner + '</a>';
    }).join('');
  }
  function refreshNavAvatar(name) {
    var a = $('nav-avatar'); if (a) a.textContent = initials(name);
    var y = $('story-you-avatar'); if (y) y.textContent = initials(name);
  }

  /* ===== Renderer postingan (dipakai Beranda & Profil) ===== */
  function postHtml(p, opts) {
    opts = opts || {};
    return '<article class="post" data-id="' + esc(p.id) + '">' +
      '<div class="avatar">' + esc(initials(p.author)) + '</div>' +
      '<div class="post-body">' +
        '<div class="post-head"><b>' + esc(p.author) + '</b><time>' + esc(relTime(p.created_at)) + '</time></div>' +
        '<div class="post-text">' + linkify(p.text) + '</div>' +
        (p.image ? '<div class="post-img-wrap"><img class="post-img js-img" src="' + esc(p.image) + '" alt="gambar postingan" loading="lazy"></div>' : '') +
        (opts.readonly ? '<div class="post-actions"><span class="act">❤ ' + (p.likes || 0) + '</span><span class="act">💬 ' + (p.comment_count || 0) + '</span></div>' :
        '<div class="post-actions">' +
          '<button class="act js-like' + (p.liked_by_me ? ' liked' : '') + '" aria-label="Suka">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>' +
            '<span class="n-like">' + (p.likes || 0) + '</span></button>' +
          '<button class="act js-cmt" aria-label="Komentar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 7.7z"/></svg>' +
            '<span>' + (p.comment_count || 0) + '</span></button>' +
        '</div>') +
        '<div class="comments hidden js-cmt-box">' + (p.comments || []).map(cmtHtml).join('') +
          '<div class="cmt-form"><input type="text" placeholder="Tulis komentar…" maxlength="300" class="js-cmt-input">' +
          '<button class="cmt-send js-cmt-send" aria-label="Kirim komentar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button></div>' +
        '</div>' +
      '</div></article>';
  }
  function cmtHtml(c) {
    return '<div class="cmt"><div class="avatar sm">' + esc(initials(c.author_name || c.author)) + '</div>' +
      '<div class="cmt-body"><b>' + esc(c.author_name || c.author) + '</b><time>' + esc(relTime(c.created_at)) + '</time><p>' + esc(c.text) + '</p></div></div>';
  }

  /* ===== HALAMAN LOGIN ===== */
  if (page === 'login') {
    if (token()) { location.replace('index.html'); }
    var mode = 'login';
    var authErr = function (msg) { var e = $('auth-err'); e.textContent = msg; e.classList.toggle('hidden', !msg); };
    $('auth-toggle').addEventListener('click', function () {
      mode = (mode === 'login') ? 'register' : 'login';
      var reg = (mode === 'register');
      $('f-name').classList.toggle('hidden', !reg);
      $('auth-btn').textContent = reg ? 'Daftar' : 'Masuk';
      $('auth-toggle').textContent = reg ? 'Masuk' : 'Daftar';
      $('auth-sub').textContent = reg ? 'Bikin akun Clincoo baru — sekali daftar, dipakai di semua produk Clincoo.' : 'Masuk dengan akun Clincoo kamu untuk ikut ngobrol.';
      authErr('');
    });
    $('auth-form').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = $('auth-btn'); btn.disabled = true; btn.textContent = 'Sedang memproses…';
      authErr('');
      var payload = { email: $('in-email').value.trim(), password: $('in-pass').value };
      if (mode === 'register') payload.name = $('in-name').value.trim();
      api('/auth/' + (mode === 'register' ? 'register' : 'login'), { method: 'POST', body: JSON.stringify(payload) })
        .then(function (d) {
          if (d && d.success && d.token) {
            setToken(d.token);
            setMyName((d.user && (d.user.name || d.user.email)) || payload.email.split('@')[0]);
            location.replace('index.html');
          } else { authErr((d && d.error) || 'Gagal masuk. Coba lagi.'); btn.disabled = false; btn.textContent = 'Masuk'; }
        })
        .catch(function () { authErr('Tidak bisa menghubungi server. Cek koneksi kamu.'); btn.disabled = false; btn.textContent = 'Masuk'; });
    });
    return;
  }

  /* ===== Guard: semua halaman selain login wajib token ===== */
  if (!token()) { location.replace('login.html'); return; }
  buildNav();

  /* ===== Muat feed (dipakai beberapa halaman) ===== */
  var feedState = [];
  function loadFeed(limit) {
    return api('/community?limit=' + (limit || 30)).then(function (d) {
      if (d._status === 401) { doLogout(); return null; }
      if (d.error) { toast(d.error); return null; }
      feedState = d.feed || [];
      if (d.me && d.me.name) { setMyName(d.me.name); refreshNavAvatar(d.me.name); }
      return feedState;
    }).catch(function () { toast('Koneksi bermasalah'); return null; });
  }

  /* ===== HALAMAN BERANDA ===== */
  if (page === 'home') {
    var filterTag = '';
    try { filterTag = (new URLSearchParams(location.search).get('tag') || '').replace(/^#/, ''); } catch (e) {}

    function applyFilter() {
      var list = feedState;
      if (filterTag) {
        var re = new RegExp('#' + filterTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}0-9_])', 'iu');
        list = list.filter(function (p) { return re.test(String(p.text || '')); });
      }
      var feedEl = $('feed');
      if (!list.length) {
        feedEl.innerHTML = '<div class="empty"><div class="big">' + (filterTag ? '🔍' : '🌱') + '</div><h3>' + (filterTag ? 'Belum ada postingan untuk #' + esc(filterTag) : 'Masih sepi di sini') + '</h3><p>' + (filterTag ? 'Jadi yang pertama nulis tentang topik ini — klik tombol + di bawah.' : 'Jadi orang pertama yang membagikan cerita. Ketuk tombol + di bawah!') + '</p></div>';
        return;
      }
      feedEl.innerHTML = list.map(function (p) { return postHtml(p); }).join('');
      $('feed-title').textContent = filterTag ? '#' + filterTag : 'Linimasa';
    }

    function renderTrendsSide() {
      var el = $('trends'); if (!el) return;
      var counts = {};
      feedState.forEach(function (p) {
        (String(p.text || '').match(/#([\p{L}0-9_]+)/gu) || []).forEach(function (raw) {
          var t = raw.slice(1).toLowerCase(); counts[t] = (counts[t] || 0) + 1;
        });
      });
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
      if (!top.length) { el.innerHTML = '<p class="trend-empty">Belum ada tag yang trending. Mulai dengan menulis #tag di postinganmu.</p>'; return; }
      el.innerHTML = top.map(function (t) {
        return '<div class="js-trend trend-item" data-tag="' + esc(t) + '"><b>#' + esc(t) + '</b><span>' + counts[t] + ' postingan</span></div>';
      }).join('');
    }

    function renderStories() {
      var rail = $('stories-rail');
      var seen = {}, top = [];
      feedState.forEach(function (p) {
        if (p.mine || seen[p.user_id]) return;
        seen[p.user_id] = true;
        top.push({ user_id: p.user_id, author: p.author, post_id: p.id });
      });
      top = top.slice(0, 10);
      var extra = top.map(function (c) {
        return '<div class="story-item js-story" data-post="' + esc(c.post_id) + '">' +
          '<div class="story-ring"><div class="avatar">' + esc(initials(c.author)) + '</div></div>' +
          '<span class="story-label">' + esc(c.author) + '</span></div>';
      }).join('');
      var you = rail.querySelector('#story-you');
      rail.innerHTML = '';
      if (you) rail.appendChild(you);
      rail.insertAdjacentHTML('beforeend', extra);
    }

    function showFilterBar() {
      if (!filterTag) return;
      $('filter-bar').classList.remove('hidden');
      $('filter-tag').textContent = '#' + filterTag;
    }
    $('filter-clear').addEventListener('click', function () {
      filterTag = '';
      $('filter-bar').classList.add('hidden');
      $('feed-title').textContent = 'Linimasa';
      try { history.replaceState(null, '', 'index.html'); } catch (e) {}
      applyFilter();
    });

    $('story-you').addEventListener('click', function () { location.href = 'posting.html'; });
    $('stories-rail').addEventListener('click', function (ev) {
      var it = ev.target.closest('.js-story');
      if (!it) return;
      var el = document.querySelector('.post[data-id="' + it.getAttribute('data-post') + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background .3s';
        el.style.background = 'var(--bg-soft)';
        setTimeout(function () { el.style.background = ''; }, 900);
      } else {
        toast('Postingan terbarunya ada di bawah — coba segarkan');
      }
    });
    document.querySelector('.side').addEventListener('click', function (ev) {
      var tr = ev.target.closest('.js-trend');
      if (!tr) return;
      location.href = 'index.html?tag=' + encodeURIComponent(tr.getAttribute('data-tag'));
    });
    $('btn-refresh').addEventListener('click', function () { loadFeed().then(applyHomeRender); toast('Linimasa disegarkan'); });

    function applyHomeRender() { applyFilter(); renderTrendsSide(); renderStories(); renderActivityDot(); }

    loadFeed().then(function (f) {
      if (f === null) { $('feed').innerHTML = '<div class="empty"><div class="big">📡</div><h3>Gagal memuat</h3><p>Coba segarkan lagi.</p></div>'; return; }
      showFilterBar(); applyHomeRender();
    });

    // Ketuk logo ala Instagram -> scroll ke atas + segarkan linimasa (kalau sudah di paling atas)
    $('brand-link').addEventListener('click', function (ev) {
      ev.preventDefault();
      if (window.scrollY < 40) { loadFeed().then(applyHomeRender); toast('Linimasa disegarkan'); }
      else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    // Aktivitas (ikon hati) — komentar terbaru di postingan milikku, dari data feed yang sudah dimuat
    function buildActivityItems() {
      var items = [];
      feedState.filter(function (p) { return p.mine; }).forEach(function (p) {
        (p.comments || []).forEach(function (c) {
          items.push({ author: c.author_name || c.author, text: c.text, created_at: c.created_at, post_id: p.id });
        });
      });
      items.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      return items.slice(0, 20);
    }
    function renderActivityDot() {
      var dot = $('activity-dot'); if (!dot) return;
      dot.classList.toggle('hidden', buildActivityItems().length === 0);
    }
    function openActivity() {
      var items = buildActivityItems();
      $('activity-list').innerHTML = items.length ? items.map(function (it) {
        return '<div class="activity-item js-activity-jump" data-post="' + esc(it.post_id) + '">' +
          '<div class="avatar">' + esc(initials(it.author)) + '</div>' +
          '<div><p><b>' + esc(it.author) + '</b> mengomentari postinganmu: "' + esc(it.text) + '"</p><time>' + esc(relTime(it.created_at)) + '</time></div></div>';
      }).join('') : '<div class="activity-empty">Belum ada aktivitas baru di postinganmu.</div>';
      $('activity-backdrop').classList.remove('hidden');
    }
    $('btn-activity').addEventListener('click', openActivity);
    $('activity-backdrop').addEventListener('click', function (ev) {
      var jump = ev.target.closest('.js-activity-jump');
      if (jump) {
        var el = document.querySelector('.post[data-id="' + jump.getAttribute('data-post') + '"]');
        $('activity-backdrop').classList.add('hidden');
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.transition = 'background .3s'; el.style.background = 'var(--bg-soft)'; setTimeout(function () { el.style.background = ''; }, 900); }
        return;
      }
      if (ev.target === $('activity-backdrop')) $('activity-backdrop').classList.add('hidden');
    });

    /* Interaksi like/komentar/gambar/tag */
    var busy = false;
    $('feed').addEventListener('click', function (ev) {
      var likeBtn = ev.target.closest('.js-like');
      var cmtBtn = ev.target.closest('.js-cmt');
      var sendBtn = ev.target.closest('.js-cmt-send');
      var img = ev.target.closest('.js-img');
      var tag = ev.target.closest('.tag');
      if (likeBtn) {
        if (busy) return; busy = true;
        var art = likeBtn.closest('.post');
        var pid = art.getAttribute('data-id');
        api('/community/react', { method: 'POST', body: JSON.stringify({ post_id: pid }) }).then(function (d) {
          busy = false;
          if (d && d.success) {
            var nEl = likeBtn.querySelector('.n-like');
            var n = parseInt(nEl.textContent, 10) || 0;
            nEl.textContent = d.liked ? n + 1 : Math.max(0, n - 1);
            likeBtn.classList.toggle('liked', d.liked);
            var p = feedState.find(function (x) { return x.id === pid; });
            if (p) { p.liked_by_me = d.liked; p.likes = d.liked ? n + 1 : Math.max(0, n - 1); }
          } else if (d.error) { toast(d.error); }
        }).catch(function () { busy = false; toast('Koneksi bermasalah'); });
        return;
      }
      if (cmtBtn) {
        cmtBtn.closest('.post-body').querySelector('.js-cmt-box').classList.toggle('hidden');
        var inp = cmtBtn.closest('.post-body').querySelector('.js-cmt-input');
        if (inp) inp.focus();
        return;
      }
      if (sendBtn) { submitComment(sendBtn.closest('.post')); return; }
      if (img) { window.open(img.src, '_blank'); return; }
      if (tag) { location.href = 'index.html?tag=' + encodeURIComponent(tag.textContent.slice(1)); }
    });
    $('feed').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && ev.target.classList.contains('js-cmt-input')) { ev.preventDefault(); submitComment(ev.target.closest('.post')); }
    });
    function submitComment(art) {
      if (!art || busy) return;
      var inp = art.querySelector('.js-cmt-input');
      var text = (inp.value || '').trim();
      if (!text) return;
      busy = true;
      api('/community/comment', { method: 'POST', body: JSON.stringify({ post_id: art.getAttribute('data-id'), text: text }) })
        .then(function (d) {
          busy = false;
          if (d && d.success) {
            var box = art.querySelector('.js-cmt-box');
            box.classList.remove('hidden');
            art.querySelector('.cmt-form').insertAdjacentHTML('beforebegin', cmtHtml(d.comment));
            inp.value = '';
            var cBtn = art.querySelector('.js-cmt span');
            if (cBtn) cBtn.textContent = (parseInt(cBtn.textContent, 10) || 0) + 1;
          } else if (d.error) { toast(d.error); }
        }).catch(function () { busy = false; toast('Koneksi bermasalah'); });
    }
  }

  /* ===== HALAMAN TULIS ===== */
  if (page === 'post') {
    var cText = $('composer-text'), cBtn = $('btn-post');
    $('composer-avatar').textContent = initials(myName());
    var pendingImage = '';
    cText.addEventListener('input', function () {
      cBtn.disabled = !(cText.value.trim() || pendingImage);
    });
    function processImage(file) {
      if (!file || String(file.type).indexOf('image/') !== 0) { toast('File harus berupa gambar'); return; }
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxDim = 900, q = 0.75, out = '';
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/jpeg', q);
          while (out.length > 90000 && q > 0.3) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
          if (out.length > 95000) {
            c.width = Math.round(c.width * 0.6); c.height = Math.round(c.height * 0.6);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            out = c.toDataURL('image/jpeg', 0.45);
          }
          if (out.length > 100000) { toast('Gambar tetap kegedean setelah dikompres — coba yang lain'); return; }
          pendingImage = out;
          $('cmp-preview-img').src = out;
          $('cmp-preview').classList.remove('hidden');
          cBtn.disabled = !(cText.value.trim() || pendingImage);
          toast('Foto siap dilampirkan');
        };
        img.onerror = function () { toast('Gambar tidak bisa dibaca'); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    }
    $('btn-img').addEventListener('click', function () { $('in-img').click(); });
    $('in-img').addEventListener('change', function () {
      if (this.files && this.files[0]) processImage(this.files[0]);
      this.value = '';
    });
    $('cmp-img-del').addEventListener('click', function () {
      pendingImage = '';
      $('cmp-preview').classList.add('hidden');
      cBtn.disabled = !cText.value.trim();
    });
    cBtn.addEventListener('click', function () {
      var text = cText.value.trim();
      if ((!text && !pendingImage) || busy) return;
      busy = true; cBtn.disabled = true; cBtn.textContent = 'Mengirim…';
      var payload = { text: text };
      if (pendingImage) payload.image = pendingImage;
      api('/community', { method: 'POST', body: JSON.stringify(payload) }).then(function (d) {
        busy = false;
        if (d && d.success && d.post) {
          toast('Postingan terkirim ✨');
          setTimeout(function () { location.replace('index.html'); }, 700);
        } else if (d && d._status === 429) {
          cBtn.disabled = false; cBtn.textContent = 'Bagikan'; toast(d.error || 'Sabar sedikit…');
        } else {
          cBtn.disabled = false; cBtn.textContent = 'Bagikan'; toast((d && d.error) || 'Gagal posting');
        }
      }).catch(function () { busy = false; cBtn.disabled = false; cBtn.textContent = 'Bagikan'; toast('Koneksi bermasalah'); });
    });
  }

  /* ===== HALAMAN JELAJAH ===== */
  if (page === 'jelajah') {
    loadFeed(50).then(function (f) {
      if (f === null) return;
      var counts = {};
      f.forEach(function (p) {
        (String(p.text || '').match(/#([\p{L}0-9_]+)/gu) || []).forEach(function (raw) {
          var t = raw.slice(1).toLowerCase(); counts[t] = (counts[t] || 0) + 1;
        });
      });
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 12);
      $('trend-cards').innerHTML = top.length ? top.map(function (t) {
        return '<a class="trend-card" href="index.html?tag=' + encodeURIComponent(t) + '"><b>#' + esc(t) + '</b><span>' + counts[t] + ' postingan</span></a>';
      }).join('') : '<div class="empty" style="padding:30px 10px;"><p>Belum ada #tag — tag akan muncul di sini begitu ada yang memakainya.</p></div>';

      var people = {}, order = [];
      f.forEach(function (p) {
        if (p.mine) return;
        if (!people[p.user_id]) { people[p.user_id] = { author: p.author, n: 0 }; order.push(p.user_id); }
        people[p.user_id].n++;
      });
      var list = order.map(function (id) { return { id: id, p: people[id] }; }).sort(function (a, b) { return b.p.n - a.p.n; }).slice(0, 10);
      $('people').innerHTML = list.length ? list.map(function (x) {
        return '<div class="person js-story-person" data-post="' + esc(feedState.find(function (pp) { return pp.user_id === x.id; }).id) + '">' +
          '<div class="avatar">' + esc(initials(x.p.author)) + '</div>' +
          '<div><b>' + esc(x.p.author) + '</b><span>' + x.p.n + ' postingan</span></div>' +
          '<span class="person-n">lihat →</span></div>';
      }).join('') : '<div class="empty" style="padding:30px 10px;"><p>Kamu satu-satunya di sini — ajak temanmu ikutan!</p></div>';
    });
  }

  /* ===== HALAMAN PROFIL ===== */
  if (page === 'profil') {
    var nm = myName();
    $('prof-name').textContent = nm;
    $('prof-avatar').textContent = initials(nm);
    $('btn-theme').addEventListener('click', function () { applyTheme(!document.body.classList.contains('dark-mode')); });
    $('btn-logout').addEventListener('click', doLogout);
    loadFeed(50).then(function (f) {
      if (f === null) return;
      var mine = feedState.filter(function (p) { return p.mine; });
      var likes = 0;
      mine.forEach(function (p) { likes += (p.likes || 0); });
      $('stat-posts').textContent = mine.length;
      $('stat-likes').textContent = likes;
      $('my-feed').innerHTML = mine.length ? mine.map(function (p) { return postHtml(p, { readonly: true }); }).join('') :
        '<div class="empty"><div class="big">✍️</div><h3>Belum ada postingan</h3><p>Tulis postingan pertamamu lewat tombol + di bawah.</p></div>';
    });
  }
})();
