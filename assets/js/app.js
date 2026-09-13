// Komunitas Clincoo — logic aplikasi
(function () {
    'use strict';
    // API base: sama seperti pola halaman Clincoo — GitHub Pages pakai be2, self-host pakai /api
    var API = (location.hostname.indexOf('github.io') !== -1) ? 'https://clincoo-be2.pages.dev/api' : '/api';
    var TOKEN_KEY = 'clincoo_auth_token', TOKEN_KEY2 = 'clincoo_token', ME_KEY = 'clincoo_community_me';

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
    var toastTmr = null;
    function toast(msg) {
      var t = $('toast'); t.textContent = msg; t.classList.add('show');
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
      $('icon-moon').classList.toggle('hidden', dark);
      $('icon-sun').classList.toggle('hidden', !dark);
      try { localStorage.setItem('clincoo_community_theme', dark ? 'dark' : 'light'); } catch (e) {}
    }
    function toggleTheme() {
      var dark = !document.body.classList.contains('dark-mode');
      applyTheme(dark);
      var lbl = $('sheet-theme-label'); if (lbl) lbl.textContent = dark ? 'Mode terang' : 'Mode gelap';
    }
    $('btn-theme').addEventListener('click', toggleTheme);
    // Default gelap ala linimasa IG — hormati pilihan 'terang' eksplisit dari user.
    var savedTheme = null; try { savedTheme = localStorage.getItem('clincoo_community_theme'); } catch (e) {}
    applyTheme(savedTheme ? savedTheme === 'dark' : true);

    /* ===== Auth screen ===== */
    var mode = 'login';
    function showAuth() { $('auth-screen').classList.remove('hidden'); $('app').classList.add('hidden'); }
    function authErr(msg) { var e = $('auth-err'); e.textContent = msg; e.classList.toggle('hidden', !msg); }
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
            try { localStorage.setItem(ME_KEY, JSON.stringify({ name: (d.user && (d.user.name || d.user.email)) || payload.email.split('@')[0], ts: Date.now() })); } catch (e) {}
            enterApp();
          } else {
            authErr((d && d.error) || 'Gagal masuk. Coba lagi.');
          }
        })
        .catch(function () { authErr('Tidak bisa menghubungi server. Cek koneksi kamu.'); })
        .finally(function () { btn.disabled = false; btn.textContent = (mode === 'register') ? 'Daftar' : 'Masuk'; });
    });
    $('btn-logout').addEventListener('click', function () {
      try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ME_KEY); } catch (e) {}
      showAuth(); toast('Kamu sudah keluar');
    });

    /* ===== App ===== */
    var feedState = [];
    function enterApp() {
      $('auth-screen').classList.add('hidden');
      $('app').classList.remove('hidden');
      var me = null; try { me = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) {}
      var myName = (me && me.name) || 'Saya';
      $('me-name').textContent = myName;
      $('me-avatar').textContent = initials(myName);
      $('composer-avatar').textContent = initials(myName);
      $('bn-avatar').textContent = initials(myName);
      $('sheet-avatar').textContent = initials(myName);
      $('sheet-name').textContent = myName;
      $('story-you-avatar').textContent = initials(myName);
      loadFeed();
    }

    function loadFeed(silent) {
      if (!silent) { $('feed').innerHTML = '<div class="skeleton"><div class="sk-line w30"></div><div class="sk-line w90"></div><div class="sk-line w60"></div></div><div class="skeleton"><div class="sk-line w30"></div><div class="sk-line w90"></div><div class="sk-line w60"></div></div>'; }
      api('/community?limit=30').then(function (d) {
        if (d._status === 401) { showAuth(); return; }
        if (d.error) { $('feed').innerHTML = '<div class="empty"><div class="big">⚠️</div><h3>Gagal memuat</h3><p>' + esc(d.error) + '</p></div>'; return; }
        feedState = d.feed || [];
        if (d.me && d.me.name) {
          $('me-name').textContent = d.me.name;
          $('me-avatar').textContent = initials(d.me.name);
          $('composer-avatar').textContent = initials(d.me.name);
          try { localStorage.setItem(ME_KEY, JSON.stringify({ name: d.me.name, ts: Date.now() })); } catch (e) {}
        }
        renderFeed();
        renderTrends();
        renderStories();
      }).catch(function () {
        $('feed').innerHTML = '<div class="empty"><div class="big">📡</div><h3>Tidak ada koneksi</h3><p>Gagal menghubungi server. Coba segarkan lagi.</p></div>';
      });
    }

    function renderFeed() {
      if (!feedState.length) {
        $('feed').innerHTML = '<div class="empty"><div class="big">🌱</div><h3>Masih sepi di sini</h3><p>Jadi orang pertama yang membagikan cerita. Tulis postingan pertamamu di atas!</p></div>';
        return;
      }
      var html = '';
      feedState.forEach(function (p) {
        html += '<article class="post" data-id="' + esc(p.id) + '">' +
          '<div class="avatar">' + esc(initials(p.author)) + '</div>' +
          '<div class="post-body">' +
            '<div class="post-head"><b>' + esc(p.author) + '</b><time>' + esc(relTime(p.created_at)) + '</time></div>' +
            '<div class="post-text">' + linkify(p.text) + '</div>' +
            (p.image ? '<div class="post-img-wrap"><img class="post-img js-img" src="' + esc(p.image) + '" alt="gambar postingan" loading="lazy"></div>' : '') +
            '<div class="post-actions">' +
              '<button class="act js-like' + (p.liked_by_me ? ' liked' : '') + '" aria-label="Suka">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/></svg>' +
                '<span class="n-like">' + (p.likes || 0) + '</span></button>' +
              '<button class="act js-cmt" aria-label="Komentar">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 7.7z"/></svg>' +
                '<span>' + (p.comment_count || 0) + '</span></button>' +
            '</div>' +
            '<div class="comments hidden js-cmt-box">' + (p.comments || []).map(function (c) { return cmtHtml(c); }).join('') +
              '<div class="cmt-form"><input type="text" placeholder="Tulis komentar…" maxlength="300" class="js-cmt-input">' +
              '<button class="cmt-send js-cmt-send" aria-label="Kirim komentar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg></button></div>' +
            '</div>' +
          '</div></article>';
      });
      $('feed').innerHTML = html;
    }

    function cmtHtml(c) {
      return '<div class="cmt"><div class="avatar sm">' + esc(initials(c.author_name || c.author)) + '</div>' +
        '<div class="cmt-body"><b>' + esc(c.author_name || c.author) + '</b><time>' + esc(relTime(c.created_at)) + '</time><p>' + esc(c.text) + '</p></div></div>';
    }

    /* Rail kontributor teratas — mirip cincin story IG, tapi statis: klik = lompat ke postingan terbarunya */
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
      // Item pertama ("Ceritamu") tetap, sisanya disegarkan
      var you = rail.querySelector('#story-you');
      rail.innerHTML = '';
      if (you) rail.appendChild(you);
      rail.insertAdjacentHTML('beforeend', extra);
    }
    var storyYou = $('story-you');
    if (storyYou) storyYou.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () { cText.focus(); }, 300);
    });
    document.getElementById('stories-rail').addEventListener('click', function (ev) {
      var it = ev.target.closest('.js-story');
      if (!it) return;
      var pid = it.getAttribute('data-post');
      var el = document.querySelector('.post[data-id="' + pid + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background .3s';
        el.style.background = 'var(--bg-soft)';
        setTimeout(function () { el.style.background = ''; }, 900);
      }
    });

    /* Interaksi feed: delegasi event */
    var busy = false;
    $('feed').addEventListener('click', function (ev) {
      var likeBtn = ev.target.closest('.js-like');
      var cmtBtn = ev.target.closest('.js-cmt');
      var sendBtn = ev.target.closest('.js-cmt-send');
      if (likeBtn) {
        if (busy) return; busy = true;
        var art = likeBtn.closest('.post');
        var pid = art.getAttribute('data-id');
        api('/community/react', { method: 'POST', body: JSON.stringify({ post_id: pid }) }).then(function (d) {
          if (d && d.success) {
            var nEl = likeBtn.querySelector('.n-like');
            var n = parseInt(nEl.textContent, 10) || 0;
            nEl.textContent = d.liked ? n + 1 : Math.max(0, n - 1);
            likeBtn.classList.toggle('liked', d.liked);
            var p = feedState.find(function (x) { return x.id === pid; });
            if (p) { p.liked_by_me = d.liked; p.likes = d.liked ? n + 1 : Math.max(0, n - 1); }
          } else if (d._status === 429 || d.error) { toast(d.error || 'Sabar ya…'); }
          busy = false;
        }).catch(function () { busy = false; toast('Koneksi bermasalah'); });
        return;
      }
      if (cmtBtn) {
        cmtBtn.closest('.post-body').querySelector('.js-cmt-box').classList.toggle('hidden');
        var inp = cmtBtn.closest('.post-body').querySelector('.js-cmt-input');
        if (inp) inp.focus();
        return;
      }
      if (sendBtn) submitComment(sendBtn.closest('.post'));
      var img = ev.target.closest('.js-img');
      if (img) { window.open(img.src, '_blank'); return; }
      var tag = ev.target.closest('.tag');
      if (tag) {
        var q = tag.textContent;
        $('composer-text').value = q + ' ';
        $('composer-text').dispatchEvent(new Event('input'));
        $('composer-text').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
            var form = art.querySelector('.cmt-form');
            form.insertAdjacentHTML('beforebegin', cmtHtml(d.comment));
            inp.value = '';
            var cBtn = art.querySelector('.js-cmt span');
            if (cBtn) cBtn.textContent = (parseInt(cBtn.textContent, 10) || 0) + 1;
            var p = feedState.find(function (x) { return x.id === art.getAttribute('data-id'); });
            if (p) { p.comment_count = (p.comment_count || 0) + 1; p.comments.push({ author_name: d.comment.author, text: d.comment.text, created_at: d.comment.created_at }); }
          } else if (d.error) { toast(d.error); }
        }).catch(function () { busy = false; toast('Koneksi bermasalah'); });
    }

    /* ===== Composer + lampiran foto ===== */
    var cText = $('composer-text'), cBtn = $('btn-post');
    var pendingImage = '';
    function updatePostEnabled() { cBtn.disabled = !(cText.value.trim() || pendingImage); }
    cText.addEventListener('input', function () {
      $('char-now').textContent = cText.value.length;
      updatePostEnabled();
    });

    // Resize di klien: maks sisi 900px, JPEG kualitas turun bertahap sampai < 90KB (hemat D1)
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
          updatePostEnabled();
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
      updatePostEnabled();
    });
    cBtn.addEventListener('click', function () {
      var text = cText.value.trim();
      if ((!text && !pendingImage) || busy) return;
      busy = true; cBtn.disabled = true; cBtn.textContent = 'Mengirim…';
      var payload = { text: text };
      if (pendingImage) payload.image = pendingImage;
      api('/community', { method: 'POST', body: JSON.stringify(payload) }).then(function (d) {
        busy = false; cBtn.textContent = 'Posting';
        if (d && d.success && d.post) {
          feedState.unshift(d.post);
          renderFeed(); renderTrends();
          cText.value = ''; $('char-now').textContent = '0'; cBtn.disabled = true;
          pendingImage = ''; $('cmp-preview').classList.add('hidden');
          toast('Postingan terkirim ✨');
        } else if (d && d._status === 429) {
          cBtn.disabled = false; toast(d.error || 'Sabar sedikit…');
        } else {
          cBtn.disabled = false; toast((d && d.error) || 'Gagal posting');
        }
      }).catch(function () { busy = false; cBtn.disabled = false; cBtn.textContent = 'Posting'; toast('Koneksi bermasalah'); });
    });

    $('btn-refresh').addEventListener('click', function () { loadFeed(); toast('Linimasa disegarkan'); });

    /* ===== Trend ===== */
    function renderTrends() {
      var counts = {};
      feedState.forEach(function (p) {
        (String(p.text || '').match(/#([\p{L}0-9_]+)/gu) || []).forEach(function (raw) {
          var t = raw.slice(1).toLowerCase(); counts[t] = (counts[t] || 0) + 1;
        });
      });
      var top = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
      if (!top.length) { $('trends').innerHTML = '<p class="trend-empty">Belum ada tag yang trending. Mulai dengan menulis #tag di postinganmu.</p>'; return; }
      $('trends').innerHTML = top.map(function (t) {
        return '<div class="js-trend trend-item" data-tag="#' + esc(t) + '"><b>#' + esc(t) + '</b><span>' + counts[t] + ' postingan</span></div>';
      }).join('');
    }
    document.querySelector('.side').addEventListener('click', function (ev) {
      var tr = ev.target.closest('.js-trend');
      if (!tr) return;
      cText.value = tr.getAttribute('data-tag') + ' ';
      cText.dispatchEvent(new Event('input'));
      cText.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ===== Bottom nav + sheet profil (mobile) ===== */
    function setActiveNav(id) {
      document.querySelectorAll('.bn-item').forEach(function (b) { b.classList.remove('is-active'); });
      var el = $(id); if (el) el.classList.add('is-active');
    }
    $('bn-home').addEventListener('click', function () {
      setActiveNav('bn-home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    $('bn-trend').addEventListener('click', function () {
      setActiveNav('bn-trend');
      var side = document.querySelector('.side');
      if (side) side.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('bn-post').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(function () { cText.focus(); }, 300);
    });
    $('bn-refresh2').addEventListener('click', function () {
      setActiveNav('bn-home');
      loadFeed(); toast('Linimasa disegarkan');
    });
    function openSheet() { $('sheet-backdrop').classList.remove('hidden'); }
    function closeSheet() { $('sheet-backdrop').classList.add('hidden'); }
    $('bn-profile').addEventListener('click', function () { setActiveNav('bn-profile'); openSheet(); });
    $('sheet-backdrop').addEventListener('click', function (ev) { if (ev.target === $('sheet-backdrop')) { closeSheet(); setActiveNav('bn-home'); } });
    $('sheet-theme').addEventListener('click', toggleTheme);
    $('sheet-logout').addEventListener('click', function () { closeSheet(); $('btn-logout').click(); });
    $('sheet-theme-label').textContent = document.body.classList.contains('dark-mode') ? 'Mode terang' : 'Mode gelap';

    /* ===== Boot ===== */
    if (token()) enterApp(); else showAuth();
  })();
