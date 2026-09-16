// ===== Komunitas Clincoo — index app logic (fitur lengkap) =====
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

function relTime(iso) {
  var d = new Date(iso), s = Math.floor((Date.now() - d) / 1000);
  if (isNaN(s) || s < 0) return '';
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'j';
  if (s < 604800) return Math.floor(s / 86400) + 'h';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

var authorFilter = null;
var imageData = null;
var feedCache = [];
var meCache = null;
var messagesCache = [];
var openComments = {};

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
  if (targetViewId === 'msg-view') loadMessages();
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

function renderPost(p) {
  var name = p.author || p.name || 'User';
  var ini = name.charAt(0).toUpperCase();
  var text = esc(p.content || p.text || '');
  text = text.replace(/#([\w]+)/g, '<span class="text-blue-600">#$1</span>');
  var ava = p.author_avatar
    ? '<img src="' + esc(p.author_avatar) + '" class="w-full h-full object-cover" alt="">'
    : ini;
  var uid = p.user_id ? ('profil.html?uid=' + p.user_id) : '#';
  var pid = String(p.id || '');
  var liked = !!p.liked_by_me;
  var isOpen = !!openComments[pid];
  var comments = p.comments || [];
  var cmtHtml = '';
  if (isOpen) {
    cmtHtml = '<div class="mt-3 space-y-2.5 border-t border-slate-100 pt-3" id="cmt-box-' + esc(pid) + '">';
    if (comments.length) {
      cmtHtml += comments.map(function (c) {
        var cn = c.author || c.author_name || 'User';
        return '<div class="flex gap-2.5">'
          + '<div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600 flex-shrink-0">'
          + esc(cn.charAt(0).toUpperCase()) + '</div>'
          + '<div class="flex-1 min-w-0 bg-slate-50 rounded-xl px-3 py-2">'
          + '<p class="text-[12px] font-semibold text-slate-900">' + esc(cn)
          + ' <span class="font-normal text-slate-400">' + esc(relTime(c.created_at)) + '</span></p>'
          + '<p class="text-[13px] text-slate-700 mt-0.5 leading-snug">' + esc(c.text) + '</p>'
          + '</div></div>';
      }).join('');
    } else {
      cmtHtml += '<p class="text-[12px] text-slate-400 text-center py-1">Belum ada komentar. Jadilah yang pertama!</p>';
    }
    cmtHtml += '<div class="flex gap-2 mt-1">'
      + '<input type="text" id="cmt-in-' + esc(pid) + '" maxlength="300" placeholder="Tulis komentar…" '
      + 'class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-900/10" '
      + 'onkeydown="if(event.key===\'Enter\')submitComment(\'' + esc(pid) + '\')">'
      + '<button type="button" onclick="submitComment(\'' + esc(pid) + '\')" '
      + 'class="bg-slate-900 text-white text-[13px] font-semibold px-3.5 py-2 rounded-xl">Kirim</button>'
      + '</div></div>';
  }

  var delBtn = p.mine
    ? '<button type="button" onclick="deletePost(\'' + esc(pid) + '\')" class="hover:text-red-500 ml-auto" title="Hapus">🗑</button>'
    : '';

  return '<div class="bg-white p-4 flex space-x-3 items-start" data-post-id="' + esc(pid) + '">'
    + '<a href="' + uid + '" class="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600">' + ava + '</a>'
    + '<div class="flex-1 min-w-0">'
    + '<div class="flex items-center gap-2">'
    + '<p class="text-[14px] font-semibold text-slate-900"><a href="' + uid + '">' + esc(name) + '</a></p>'
    + (p.created_at ? '<span class="text-[11px] text-slate-400">' + esc(relTime(p.created_at)) + '</span>' : '')
    + '</div>'
    + '<p class="text-[14px] text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">' + text + '</p>'
    + (p.image ? (String(p.image).indexOf('data:video/') === 0
      ? '<video src="' + esc(p.image) + '" class="mt-2 rounded-xl max-h-72 w-full" controls playsinline></video>'
      : '<img src="' + esc(p.image) + '" class="mt-2 rounded-xl max-h-72 w-full object-cover" alt="">') : '')
    + '<div class="flex items-center gap-4 mt-2.5 text-[12px] text-slate-500">'
    + '<button type="button" onclick="reactPost(\'' + esc(pid) + '\')" class="hover:text-red-500 ' + (liked ? 'text-red-500 font-semibold' : '') + '">'
    + (liked ? '❤️' : '♡') + ' ' + (p.likes || 0) + '</button>'
    + '<button type="button" onclick="toggleComments(\'' + esc(pid) + '\')" class="hover:text-slate-900">'
    + '💬 ' + (p.comment_count != null ? p.comment_count : comments.length) + '</button>'
    + '<button type="button" onclick="savePost(' + JSON.stringify({
        id: p.id, author: name, content: p.content || p.text, likes: p.likes,
        comment_count: p.comment_count || comments.length, image: p.image, author_avatar: p.author_avatar
      }).replace(/"/g, '&quot;') + ')" class="hover:text-slate-900">🔖</button>'
    + '<button type="button" onclick="sharePost(\'' + esc(pid) + '\',\'' + esc(name).replace(/'/g, '') + '\')" class="hover:text-slate-900">↗</button>'
    + delBtn
    + '</div>'
    + cmtHtml
    + '</div></div>';
}

function loadFeed() {
  var box = document.getElementById('feed-container');
  var sk = document.getElementById('feed-skeleton');
  if (sk) sk.classList.remove('hidden');
  api('/community?limit=50').then(function (d) {
    if (sk) sk.classList.add('hidden');
    feedCache = (d && d.feed) || [];
    meCache = d && d.me ? d.me : null;
    messagesCache = (d && d.messages) || [];
    updateNotifBadge();

    var feed = feedCache.slice();
    if (authorFilter) feed = feed.filter(function (p) { return (p.author || '') === authorFilter; });

    var fr = document.getElementById('friends-row');
    if (fr && !authorFilter) {
      var seen = {}, people = [];
      ((d && d.following) || []).forEach(function (u) {
        var a = u.name || 'User';
        if (!seen[a]) { seen[a] = 1; people.push({ name: a, av: u.avatar_url, id: u.id }); }
      });
      feed.forEach(function (p) {
        var a = p.author || 'User';
        if (!seen[a]) { seen[a] = 1; people.push({ name: a, av: p.author_avatar, id: p.user_id }); }
      });
      fr.innerHTML = people.slice(0, 12).map(function (u) {
        var ini = u.name.charAt(0).toUpperCase();
        var av = u.av ? '<img src="' + esc(u.av) + '" class="w-full h-full object-cover" alt="">' : ini;
        var href = u.id ? ('profil.html?uid=' + u.id) : '#';
        return '<a href="' + href + '" class="flex flex-col items-center gap-1 flex-shrink-0">'
          + '<div class="w-14 h-14 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600 border-2 border-slate-900">' + av + '</div>'
          + '<span class="text-[11px] text-slate-600 max-w-[56px] truncate">' + esc(u.name.split(' ')[0]) + '</span></a>';
      }).join('');
    }

    if (!box) return;
    if (!feed.length) {
      box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Belum ada postingan. Jadilah yang pertama!</div>';
      return;
    }
    box.innerHTML = feed.map(renderPost).join('');
  }).catch(function () {
    if (sk) sk.classList.add('hidden');
    if (box) box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Gagal memuat feed. Coba refresh.</div>';
  });
}

function toggleComments(pid) {
  openComments[pid] = !openComments[pid];
  var box = document.getElementById('feed-container');
  if (!box) return;
  var p = feedCache.find(function (x) { return String(x.id) === String(pid); });
  if (!p) { loadFeed(); return; }
  var el = box.querySelector('[data-post-id="' + pid + '"]');
  if (el) {
    var tmp = document.createElement('div');
    tmp.innerHTML = renderPost(p);
    el.replaceWith(tmp.firstChild);
  } else loadFeed();
  if (openComments[pid]) {
    setTimeout(function () {
      var inp = document.getElementById('cmt-in-' + pid);
      if (inp) inp.focus();
    }, 50);
  }
}

function submitComment(pid) {
  var inp = document.getElementById('cmt-in-' + pid);
  var text = (inp && inp.value || '').trim();
  if (!text) return;
  if (inp) inp.disabled = true;
  api('/community/comment', { method: 'POST', body: JSON.stringify({ post_id: pid, text: text }) })
    .then(function (d) {
      if (inp) { inp.disabled = false; inp.value = ''; }
      if (d && (d.success || d._status === 200)) {
        toast('Komentar terkirim');
        var p = feedCache.find(function (x) { return String(x.id) === String(pid); });
        if (p) {
          p.comments = p.comments || [];
          p.comments.push({
            id: 'local' + Date.now(),
            author: (meCache && meCache.name) || 'Anda',
            text: text,
            created_at: new Date().toISOString()
          });
          p.comment_count = (p.comment_count || 0) + 1;
          openComments[pid] = true;
          var box = document.getElementById('feed-container');
          var el = box && box.querySelector('[data-post-id="' + pid + '"]');
          if (el) {
            var tmp = document.createElement('div');
            tmp.innerHTML = renderPost(p);
            el.replaceWith(tmp.firstChild);
          } else loadFeed();
        } else loadFeed();
      } else toast((d && d.error) || 'Gagal mengirim komentar');
    })
    .catch(function () {
      if (inp) inp.disabled = false;
      toast('Gagal mengirim komentar');
    });
}

function reactPost(id) {
  if (!id) return;
  api('/community/react', { method: 'POST', body: JSON.stringify({ post_id: id, type: 'like' }) })
    .then(function (d) {
      if (d && d._status === 401) { toast('Masuk dulu untuk menyukai'); return; }
      var p = feedCache.find(function (x) { return String(x.id) === String(id); });
      if (p) {
        if (typeof d.liked === 'boolean') {
          p.liked_by_me = d.liked;
          p.likes = d.likes != null ? d.likes : (p.likes || 0) + (d.liked ? 1 : -1);
        } else {
          p.liked_by_me = !p.liked_by_me;
          p.likes = Math.max(0, (p.likes || 0) + (p.liked_by_me ? 1 : -1));
        }
        var box = document.getElementById('feed-container');
        var el = box && box.querySelector('[data-post-id="' + id + '"]');
        if (el) {
          var tmp = document.createElement('div');
          tmp.innerHTML = renderPost(p);
          el.replaceWith(tmp.firstChild);
        } else loadFeed();
      } else loadFeed();
      toast(p && p.liked_by_me ? 'Disukai' : 'Batal suka');
    })
    .catch(function () { toast('Gagal'); });
}

function deletePost(id) {
  if (!id || !confirm('Hapus postingan ini?')) return;
  api('/community/delete', { method: 'POST', body: JSON.stringify({ post_id: id }) })
    .then(function (d) {
      if (d && d.success) {
        toast('Postingan dihapus');
        feedCache = feedCache.filter(function (p) { return String(p.id) !== String(id); });
        var el = document.querySelector('[data-post-id="' + id + '"]');
        if (el) el.remove();
        else loadFeed();
      } else toast((d && d.error) || 'Gagal menghapus');
    })
    .catch(function () { toast('Gagal menghapus'); });
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

function sharePost(pid, author) {
  var url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html#post-' + pid;
  var text = 'Lihat postingan ' + (author || '') + ' di Komunitas Clincoo';
  if (navigator.share) {
    navigator.share({ title: 'Komunitas Clincoo', text: text, url: url }).catch(function () {});
  } else {
    try {
      navigator.clipboard.writeText(url);
      toast('Link disalin');
    } catch (e) {
      toast(url);
    }
  }
}

function doSearch() {
  var q = (document.getElementById('search-input') || {}).value || '';
  q = q.trim().toLowerCase();
  var box = document.getElementById('search-live');
  if (!box) return;
  if (!q) { box.classList.add('hidden'); box.innerHTML = ''; return; }

  api('/community/search?q=' + encodeURIComponent(q)).then(function (d) {
    if (d && d.success && (d.posts || d.people)) {
      var html = '';
      if (d.people && d.people.length) {
        html += '<p class="text-[12px] font-semibold text-slate-500 mb-2">Orang</p>';
        html += d.people.slice(0, 8).map(function (u) {
          return '<a href="profil.html?uid=' + (u.id || '') + '" class="flex items-center gap-3 py-2.5 border-b border-slate-100">'
            + '<div class="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">'
            + esc((u.name || 'U').charAt(0).toUpperCase()) + '</div>'
            + '<span class="text-[14px] font-semibold">' + esc(u.name) + '</span></a>';
        }).join('');
      }
      if (d.posts && d.posts.length) {
        html += '<p class="text-[12px] font-semibold text-slate-500 mt-4 mb-2">Postingan</p>';
        html += d.posts.slice(0, 12).map(function (p) {
          return '<div class="py-3 border-b border-slate-100"><p class="text-[13px] font-semibold">' + esc(p.author || 'User') + '</p>'
            + '<p class="text-[13px] text-slate-600 mt-0.5">' + esc((p.content || p.text || '').slice(0, 140)) + '</p></div>';
        }).join('');
      }
      box.classList.remove('hidden');
      box.innerHTML = html || '<p class="text-[13px] text-slate-500 text-center py-4">Tidak ada hasil.</p>';
      return;
    }
    var hits = (feedCache.length ? feedCache : []).filter(function (p) {
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
  }).catch(function () {
    box.classList.remove('hidden');
    box.innerHTML = '<p class="text-[13px] text-slate-500 text-center py-4">Gagal mencari.</p>';
  });
}

function loadTrends() {
  var box = document.getElementById('trending-container');
  if (!box) return;
  function render(feed) {
    var tags = {}, order = [];
    (feed || []).forEach(function (p) {
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
  }
  if (feedCache.length) render(feedCache);
  else {
    api('/community?limit=100').then(function (d) {
      feedCache = (d && d.feed) || [];
      render(feedCache);
    });
  }
}

function updateNotifBadge() {
  var n = 0;
  feedCache.filter(function (p) { return p.mine; }).forEach(function (p) {
    n += (p.comments || []).length;
  });
  n += (messagesCache || []).length;
  var badge = document.getElementById('notif-badge');
  if (badge) {
    if (n > 0) {
      badge.textContent = n > 99 ? '99+' : String(n);
      badge.classList.remove('hidden');
    } else badge.classList.add('hidden');
  }
}

function loadNotifs() {
  var box = document.getElementById('notif-container');
  if (!box) return;

  var items = [];

  (messagesCache || []).forEach(function (m) {
    items.push({
      type: 'msg',
      t: (m.from_name || 'Seseorang') + ' mengirim pesan',
      d: relTime(m.created_at) || '',
      detail: m.text,
      ts: m.created_at ? new Date(m.created_at).getTime() : 0,
      action: 'msg'
    });
  });

  feedCache.filter(function (p) { return p.mine; }).forEach(function (p) {
    (p.comments || []).forEach(function (c) {
      items.push({
        type: 'cmt',
        t: (c.author || c.author_name || 'Seseorang') + ' mengomentari postinganmu',
        d: relTime(c.created_at) || '',
        detail: c.text,
        ts: c.created_at ? new Date(c.created_at).getTime() : 0,
        postId: p.id
      });
    });
  });

  feedCache.filter(function (p) { return p.mine && (p.likes || 0) > 0; }).forEach(function (p) {
    items.push({
      type: 'like',
      t: (p.likes || 0) + ' orang menyukai postinganmu',
      d: relTime(p.created_at) || '',
      detail: (p.content || p.text || '').slice(0, 60),
      ts: p.created_at ? new Date(p.created_at).getTime() : 0,
      postId: p.id
    });
  });

  items.sort(function (a, b) { return b.ts - a.ts; });

  if (!items.length) {
    items = [
      { type: 'sys', t: 'Selamat datang di Komunitas Clincoo!', d: '', detail: 'Bagikan progres, saling dukung, dan kenalan sesama pembangun.' }
    ];
  }

  box.innerHTML = items.slice(0, 40).map(function (n) {
    var icon = n.type === 'msg' ? '✉️' : n.type === 'cmt' ? '💬' : n.type === 'like' ? '❤️' : '🔔';
    var extra = n.detail ? '<p class="text-[12px] text-slate-500 mt-0.5 line-clamp-2">' + esc(n.detail) + '</p>' : '';
    var click = n.action === 'msg'
      ? 'onclick="switchTab(null,\'msg-view\',document.querySelector(\'[data-icon=msg]\'))"'
      : (n.postId ? 'onclick="openComments[\'' + esc(String(n.postId)) + '\']=true;switchTab(null,\'home-view\',document.querySelector(\'[data-icon=house]\'));loadFeed()"' : '');
    return '<div class="px-4 py-3.5 border-b border-slate-100 flex gap-3 cursor-pointer hover:bg-slate-50" ' + click + '>'
      + '<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">' + icon + '</div>'
      + '<div class="min-w-0"><p class="text-[14px] text-slate-900">' + esc(n.t) + '</p>'
      + extra
      + (n.d ? '<p class="text-[12px] text-slate-400 mt-0.5">' + esc(n.d) + '</p>' : '')
      + '</div></div>';
  }).join('');
}

function loadMessages() {
  var box = document.getElementById('msg-container');
  if (!box) return;

  function render(msgs) {
    if (!msgs || !msgs.length) {
      box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">'
        + '<p class="mb-2">Belum ada pesan.</p>'
        + '<p class="text-[12px]">Buka profil anggota lalu tekan <b>Pesan</b> untuk mulai chat.</p></div>';
      return;
    }
    box.innerHTML = msgs.map(function (m) {
      var name = m.from_name || 'Pengguna';
      return '<div class="px-4 py-3.5 border-b border-slate-100 flex gap-3">'
        + '<a href="profil.html?uid=' + (m.from_id || '') + '" class="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600 flex-shrink-0">'
        + esc(name.charAt(0).toUpperCase()) + '</a>'
        + '<div class="min-w-0 flex-1">'
        + '<div class="flex items-center justify-between gap-2">'
        + '<a href="profil.html?uid=' + (m.from_id || '') + '" class="text-[14px] font-semibold text-slate-900">' + esc(name) + '</a>'
        + '<span class="text-[11px] text-slate-400">' + esc(relTime(m.created_at)) + '</span></div>'
        + '<p class="text-[13px] text-slate-600 mt-0.5 leading-snug">' + esc(m.text) + '</p>'
        + '</div></div>';
    }).join('');
  }

  if (messagesCache.length) render(messagesCache);
  else {
    api('/community?limit=30').then(function (d) {
      messagesCache = (d && d.messages) || [];
      meCache = d && d.me ? d.me : meCache;
      feedCache = (d && d.feed) || feedCache;
      updateNotifBadge();
      render(messagesCache);
    }).catch(function () {
      box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Gagal memuat pesan.</div>';
    });
  }
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
      var prev = document.getElementById('img-preview');
      if (prev) { prev.classList.add('hidden'); prev.innerHTML = ''; }
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
      if (file.size > 4 * 1024 * 1024) { toast('Maksimal 4MB'); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        imageData = e.target.result;
        toast('Foto dilampirkan');
        var prev = document.getElementById('img-preview');
        if (prev) {
          prev.classList.remove('hidden');
          prev.innerHTML = '<img src="' + e.target.result + '" class="rounded-xl max-h-40 w-full object-cover">'
            + '<button type="button" onclick="imageData=null;this.parentElement.classList.add(\'hidden\');this.parentElement.innerHTML=\'\'" '
            + 'class="absolute top-2 right-2 bg-black/60 text-white text-xs rounded-full w-7 h-7">×</button>';
        }
      };
      reader.readAsDataURL(file);
    };
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
else initApp();
