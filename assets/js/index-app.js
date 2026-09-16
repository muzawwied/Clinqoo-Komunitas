// ===== Komunitas Clincoo — index app logic =====
var API = '/api';
if (location.hostname.indexOf('github.io') !== -1) API = 'https://clincoo-komunitas.pages.dev/api';

function token() {
  try {
    return localStorage.getItem('clincoo_auth_token') || localStorage.getItem('clincoo_token')
      || localStorage.getItem('clinqoo_auth_token') || localStorage.getItem('clinqoo_token') || '';
  } catch (e) { return ''; }
}

function api(path, opts) {
  if (window.DemoApi && !token()) return window.DemoApi(path, opts);
  opts = opts || {};
  opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  var tk = token(); if (tk) opts.headers['Authorization'] = 'Bearer ' + tk;
  return fetch(API + path, opts).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) { d._status = r.status; return d; });
  });
}

function toast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.remove('opacity-0');
  clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.add('opacity-0'); }, 2200);
}

function esc(t) {
  return String(t || '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

var authorFilter = null;
var imageData = null;

function switchTab(event, targetViewId, clickedElement) {
  if (event) event.preventDefault();
  document.querySelectorAll('.app-view').forEach(function (v) {
    v.classList.add('hidden'); v.classList.remove('block');
  });
  var target = document.getElementById(targetViewId);
  if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
  document.querySelectorAll('.nav-item').forEach(function (el) {
    el.classList.remove('text-slate-900');
    if (!el.classList.contains('bg-slate-900')) el.classList.add('text-slate-400');
  });
  if (clickedElement && !clickedElement.classList.contains('bg-slate-900')) {
    clickedElement.classList.remove('text-slate-400');
    clickedElement.classList.add('text-slate-900');
  }
  if (targetViewId === 'home-view') loadFeed();
  if (targetViewId === 'notif-view') loadNotifs();
  if (targetViewId === 'search-view') loadTrends();
  window.scrollTo(0, 0);
}

function clearAuthorFilter() {
  authorFilter = null;
  var chip = document.getElementById('author-chip');
  if (chip) { chip.classList.add('hidden'); chip.textContent = ''; }
  loadFeed();
}

function filterByAuthor(name) {
  authorFilter = name;
  var chip = document.getElementById('author-chip');
  if (chip) {
    chip.textContent = 'Postingan dari ' + name + ' ×';
    chip.classList.remove('hidden');
  }
  loadFeed();
  switchTab(null, 'home-view', document.querySelector('[data-icon=house]'));
}

function loadFeed() {
  var box = document.getElementById('feed-container');
  var sk = document.getElementById('feed-skeleton');
  if (sk) sk.classList.remove('hidden');
  api('/community?limit=50').then(function (d) {
    if (sk) sk.classList.add('hidden');
    var feed = (d && d.feed) || [];
    if (authorFilter) feed = feed.filter(function (p) { return (p.author || '') === authorFilter; });
    // friends row
    var fr = document.getElementById('friends-row');
    if (fr && !authorFilter) {
      var seen = {}, people = [];
      feed.forEach(function (p) {
        var a = p.author || 'User';
        if (!seen[a]) { seen[a] = 1; people.push({ name: a, av: p.author_avatar }); }
      });
      fr.innerHTML = people.slice(0, 12).map(function (u) {
        var ini = u.name.charAt(0).toUpperCase();
        var av = u.av ? '<img src="' + esc(u.av) + '" class="w-full h-full object-cover" alt="">' : ini;
        return '<button type="button" onclick="filterByAuthor(\'' + esc(u.name).replace(/'/g, '') + '\')" class="flex flex-col items-center gap-1 flex-shrink-0">'
          + '<div class="w-14 h-14 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600 border-2 border-slate-900">' + av + '</div>'
          + '<span class="text-[11px] text-slate-600 max-w-[56px] truncate">' + esc(u.name.split(' ')[0]) + '</span></button>';
      }).join('');
    }
    if (!box) return;
    if (!feed.length) {
      box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Belum ada postingan. Jadilah yang pertama!</div>';
      return;
    }
    box.innerHTML = feed.map(function (p) {
      var name = p.author || p.name || 'User';
      var ini = name.charAt(0).toUpperCase();
      var text = esc(p.content || p.text || '');
      text = text.replace(/#([\w]+)/g, '<span class="text-blue-600">#$1</span>');
      var ava = p.author_avatar
        ? '<img src="' + esc(p.author_avatar) + '" class="w-full h-full object-cover" alt="">'
        : ini;
      var uid = p.user_id ? ('profil.html?uid=' + p.user_id) : '#';
      return '<div class="bg-white p-4 flex space-x-3 items-start">'
        + '<a href="' + uid + '" class="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600">' + ava + '</a>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="text-[14px] font-semibold text-slate-900"><a href="' + uid + '">' + esc(name) + '</a></p>'
        + '<p class="text-[14px] text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">' + text + '</p>'
        + (p.image ? (String(p.image).indexOf('data:video/') === 0
          ? '<video src="' + esc(p.image) + '" class="mt-2 rounded-xl max-h-72 w-full" controls playsinline></video>'
          : '<img src="' + esc(p.image) + '" class="mt-2 rounded-xl max-h-72 w-full object-cover" alt="">') : '')
        + '<div class="flex items-center gap-4 mt-2.5 text-[12px] text-slate-500">'
        + '<button type="button" onclick="reactPost(\'' + esc(String(p.id || '')) + '\')" class="hover:text-red-500">❤ ' + (p.likes || 0) + '</button>'
        + '<span>💬 ' + (p.comment_count || p.comments || 0) + '</span>'
        + '<button type="button" onclick="savePost(' + JSON.stringify({ id: p.id, author: name, content: p.content || p.text, likes: p.likes, comment_count: p.comment_count || p.comments, image: p.image, author_avatar: p.author_avatar }).replace(/"/g, '&quot;') + ')" class="hover:text-slate-900">🔖</button>'
        + '</div></div></div>';
    }).join('');
  }).catch(function () {
    if (sk) sk.classList.add('hidden');
    if (box) box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Gagal memuat feed. Coba refresh.</div>';
  });
}

function reactPost(id) {
  if (!id) return;
  api('/community/react', { method: 'POST', body: JSON.stringify({ post_id: id, type: 'like' }) })
    .then(function () { loadFeed(); toast('Disukai'); })
    .catch(function () { toast('Gagal'); });
}

function savePost(obj) {
  try {
    var key = 'clincoo_saved';
    var arr = JSON.parse(localStorage.getItem(key) || localStorage.getItem('clinqoo_saved') || '[]');
    if (arr.some(function (x) { return String(x.id) === String(obj.id); })) {
      toast('Sudah tersimpan');
      return;
    }
    arr.unshift(obj);
    localStorage.setItem(key, JSON.stringify(arr));
    localStorage.setItem('clinqoo_saved', JSON.stringify(arr));
    toast('Disimpan');
  } catch (e) { toast('Gagal menyimpan'); }
}

function doSearch() {
  var q = (document.getElementById('search-input') || {}).value || '';
  q = q.trim().toLowerCase();
  var box = document.getElementById('search-live');
  if (!box) return;
  if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  api('/community?limit=50').then(function (d) {
    var hits = ((d && d.feed) || []).filter(function (p) {
      var t = ((p.content || p.text || '') + ' ' + (p.author || '')).toLowerCase();
      return t.indexOf(q) !== -1;
    }).slice(0, 15);
    box.classList.remove('hidden');
    box.innerHTML = !hits.length
      ? '<p class="text-[13px] text-slate-500 text-center py-4">Tidak ada hasil.</p>'
      : hits.map(function (p) {
          return '<div class="py-3 border-b border-slate-100"><p class="text-[13px] font-semibold">' + esc(p.author || 'User') + '</p>'
            + '<p class="text-[13px] text-slate-600 mt-0.5">' + esc((p.content || p.text || '').slice(0, 140)) + '</p></div>';
        }).join('');
  });
}

function loadTrends() {
  var box = document.getElementById('trending-container');
  if (!box) return;
  api('/community?limit=100').then(function (d) {
    var tags = {}, order = [];
    ((d && d.feed) || []).forEach(function (p) {
      (String(p.content || p.text || '').match(/#[\w]+/g) || []).forEach(function (t) {
        if (!tags[t]) order.push(t);
        tags[t] = (tags[t] || 0) + 1;
      });
    });
    order.sort(function (a, b) { return tags[b] - tags[a]; });
    box.innerHTML = '<h2 class="text-[15px] font-bold mb-3">Tren tag</h2>'
      + (order.length ? order.slice(0, 15).map(function (t) {
          return '<button type="button" onclick="document.getElementById(\'search-input\').value=\'' + esc(t) + '\';doSearch()" class="block w-full text-left py-2.5 border-b border-slate-100">'
            + '<span class="font-semibold text-[14px]">' + esc(t) + '</span>'
            + '<span class="text-[12px] text-slate-400 ml-2">' + tags[t] + ' postingan</span></button>';
        }).join('') : '<p class="text-[13px] text-slate-400">Belum ada tag.</p>');
  });
}

function loadNotifs() {
  var box = document.getElementById('notif-container');
  if (!box) return;
  // Demo / local notifs
  var items = [
    { t: 'Seseorang menyukai postinganmu', d: 'Baru saja' },
    { t: 'Komentar baru di postinganmu', d: '1j' },
    { t: 'Selamat datang di Komunitas Clincoo!', d: '1h' }
  ];
  box.innerHTML = items.map(function (n) {
    return '<div class="px-4 py-3.5 border-b border-slate-100 flex gap-3">'
      + '<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">🔔</div>'
      + '<div><p class="text-[14px] text-slate-900">' + esc(n.t) + '</p>'
      + '<p class="text-[12px] text-slate-400 mt-0.5">' + esc(n.d) + '</p></div></div>';
  }).join('');
}

function submitPost() {
  var ta = document.getElementById('composer-text');
  var text = (ta && ta.value || '').trim();
  if (!text) return;
  var btn = document.getElementById('btn-post');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  var body = { content: text, text: text };
  if (imageData) body.image = imageData;
  api('/community', { method: 'POST', body: JSON.stringify(body) }).then(function (d) {
    if (btn) { btn.disabled = false; btn.textContent = 'Bagikan'; }
    if (d && (d.success || d.id || d.post || d._status === 200 || !d.error)) {
      if (ta) ta.value = '';
      imageData = null;
      toast('Postingan terkirim ✨');
      switchTab(null, 'home-view', document.querySelector('[data-icon=house]'));
      loadFeed();
    } else toast((d && d.error) || 'Gagal mengirim');
  }).catch(function () {
    if (btn) { btn.disabled = false; btn.textContent = 'Bagikan'; }
    toast('Terkirim (mode lokal)');
    switchTab(null, 'home-view', document.querySelector('[data-icon=house]'));
  });
}

function initApp() {
  var homeBtn = document.querySelector('[data-icon=house]');
  if (homeBtn) {
    homeBtn.classList.remove('text-slate-400');
    homeBtn.classList.add('text-slate-900');
  }
  if (!token() && window.DemoApi) {
    var badge = document.getElementById('demo-badge');
    if (badge) badge.classList.remove('hidden');
  }
  loadFeed();

  var ta = document.getElementById('composer-text');
  if (ta) {
    ta.addEventListener('input', function () {
      var btn = document.getElementById('btn-post');
      if (btn) btn.disabled = !this.value.trim();
    });
  }
  var btnImg = document.getElementById('btn-img');
  var inImg = document.getElementById('in-img');
  if (btnImg && inImg) {
    btnImg.onclick = function () { inImg.click(); };
    inImg.onchange = function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        imageData = e.target.result;
        toast('Foto dilampirkan');
      };
      reader.readAsDataURL(file);
    };
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();
