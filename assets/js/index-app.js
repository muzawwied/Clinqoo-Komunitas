
        // ===== Komunitas Clincoo — VibeSpace edisi fullstack =====
        var API = '/api';
        if (location.hostname.indexOf('github.io') !== -1) API = 'https://clincoo-komunitas.pages.dev/api';

        function token() { try { return localStorage.getItem('clincoo_auth_token') || localStorage.getItem('clincoo_token') || localStorage.getItem('clinqoo_auth_token') || localStorage.getItem('clinqoo_token') || ''; } catch (e) { return ''; } }

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

        function switchTab(event, targetViewId, clickedElement) {
            if (event) event.preventDefault();
            document.querySelectorAll('.app-view').forEach(function (v) { v.classList.add('hidden'); v.classList.remove('block'); });
            var target = document.getElementById(targetViewId);
            if (target) { target.classList.remove('hidden'); target.classList.add('block'); }
            document.querySelectorAll('.nav-item').forEach(function (el) {
                el.classList.remove('text-slate-900', 'text-gray-900');
                el.classList.add('text-gray-400');
            });
            if (clickedElement) {
                clickedElement.classList.remove('text-gray-400');
                clickedElement.classList.add('text-slate-900');
            }
            window.scrollTo(0, 0);
        }

        function loadFeed() {
            var box = document.getElementById('feed-container');
            var sk = document.getElementById('feed-skeleton');
            if (sk) sk.classList.remove('hidden');
            api('/community?limit=50').then(function (d) {
                if (sk) sk.classList.add('hidden');
                var feed = (d && d.feed) || [];
                if (!box) return;
                if (!feed.length) {
                    box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Belum ada postingan. Jadilah yang pertama!</div>';
                    return;
                }
                box.innerHTML = feed.map(function (p) {
                    var name = p.author || p.name || 'User';
                    var ini = name.charAt(0).toUpperCase();
                    var text = (p.content || p.text || '').replace(/</g, '&lt;');
                    text = text.replace(/#([\w]+)/g, '<span class="text-blue-600">#$1</span>');
                    var ava = p.author_avatar
                        ? '<img src="' + p.author_avatar + '" class="w-full h-full object-cover" alt="">'
                        : ini;
                    return '<div class="bg-white p-4 flex space-x-3 items-start border-b border-slate-100">'
                        + '<div class="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-semibold text-slate-600">' + ava + '</div>'
                        + '<div class="flex-1 min-w-0">'
                        + '<p class="text-[14px] font-semibold text-slate-900">' + name + '</p>'
                        + '<p class="text-[14px] text-slate-800 mt-1 leading-relaxed whitespace-pre-wrap">' + text + '</p>'
                        + (p.image ? '<img src="' + p.image + '" class="mt-2 rounded-xl max-h-72 w-full object-cover" alt="">' : '')
                        + '<div class="flex items-center gap-4 mt-2 text-[12px] text-slate-500">'
                        + '<span>❤ ' + (p.likes || 0) + '</span>'
                        + '<span>💬 ' + (p.comment_count || p.comments || 0) + '</span>'
                        + '</div></div></div>';
                }).join('');
            }).catch(function () {
                if (sk) sk.classList.add('hidden');
                if (box) box.innerHTML = '<div class="p-8 text-center text-slate-500 text-sm">Gagal memuat feed.</div>';
            });
        }

        function initApp() {
            loadFeed();
            var homeBtn = document.querySelector('[data-icon="house"]');
            if (homeBtn) {
                homeBtn.classList.remove('text-gray-400');
                homeBtn.classList.add('text-slate-900');
            }
        }

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
        else initApp();
