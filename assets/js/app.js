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
    $('btn-theme').addEventListener('click', function () { applyTheme(!document.body.classList.contains('dark-mode')); });
    var savedTheme = null; try { savedTheme = localStorage.getItem('clincoo_community_theme'); } catch (e) {}
    applyTheme(savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);

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

    /* ===== Composer ===== */
    var cText = $('composer-text'), cBtn = $('btn-post');
    cText.addEventListener('input', function () {
      $('char-now').textContent = cText.value.length;
      cBtn.disabled = !cText.value.trim();
    });
    cBtn.addEventListener('click', function () {
      var text = cText.value.trim();
      if (!text || busy) return;
      busy = true; cBtn.disabled = true; cBtn.textContent = 'Mengirim…';
      api('/community', { method: 'POST', body: JSON.stringify({ text: text }) }).then(function (d) {
        busy = false; cBtn.textContent = 'Posting';
        if (d && d.success && d.post) {
          feedState.unshift(d.post);
          renderFeed(); renderTrends();
          cText.value = ''; $('char-now').textContent = '0'; cBtn.disabled = true;
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

    /* ===== Boot ===== */
    if (token()) enterApp(); else showAuth();
  })();
