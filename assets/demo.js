/* =========================================================
   Clincoo Komunitas — MODE DEMO (tanpa auth, data dummy)
   Saat tidak ada token, api() di tiap halaman mendelegasikan
   ke sini. Semua perubahan (like, komentar, ikuti, pesan,
   postingan) tersimpan di localStorage — terasa seperti asli.
   ========================================================= */
(function () {
    'use strict';

    function hasToken() {
        try { return !!(localStorage.getItem('clincoo_auth_token') || localStorage.getItem('clincoo_token')); } catch (e) { return false; }
    }
    window.demoMode = function () { return !hasToken(); };

    var DB_KEY = 'clincoo_demo_db_v1';
    var _now = Date.now();
    function isoMin(m) { return new Date(_now - m * 60000).toISOString(); }

    function seed() {
        var users = {
            1: { id: 1, name: 'Anda (Demo)', bio: 'Semua data di halaman ini simulasi — belum terhubung ke akun sungguhan.', link: 'clincoo.co', avatar_url: '' },
            2: { id: 2, name: 'Dinda Prameswari', bio: 'Pemilik Toko Luna — hijab & jilbab premium', link: 'tokoluna.id', avatar_url: '' },
            3: { id: 3, name: 'Bagus Setiawan', bio: 'Lagi serius belajar bikin situs sendiri', link: 'bagusdev.site', avatar_url: '' },
            4: { id: 4, name: 'Salsa Nabila', bio: 'Desainer UI/UX', link: 'salsadesign.co', avatar_url: '' },
            5: { id: 5, name: 'Rizky Maulana', bio: 'Pemula di dunia web, semangat 45', link: 'rizkym.id', avatar_url: '' },
            6: { id: 6, name: 'Tim Clincoo', bio: 'Akun resmi Clincoo', link: 'clincoo.co', avatar_url: '' },
            7: { id: 7, name: 'Nadia Kirana', bio: 'Batik Laras — butik online', link: 'batiklaras.id', avatar_url: '' },
            8: { id: 8, name: 'Yoga Pratama', bio: 'Freelancer web developer', link: 'yogaweb.dev', avatar_url: '' }
        };
        var posts = [
            { id: 'dm1', user_id: 6, text: 'Selamat datang di Komunitas Clincoo! 🎉 Ruang buat berbagi progres proyek, tanya jawab, dan kenalan sesama pembangun situs. Semua data di mode ini simulasi, tapi semua tombol berfungsi — coba like, komentar, ikuti, dan kirim pesan!', image: null, created_at: isoMin(35), likes: 12, liked_by_me: false, comments: [{ id: 'dc1', user_id: 2, text: 'Akhirnya ada ruang komunitasnya! Keren 🔥', created_at: isoMin(28) }, { id: 'dc2', user_id: 5, text: 'Izin nongkrong di sini, masih belajar nih', created_at: isoMin(20) }] },
            { id: 'dm2', user_id: 2, text: 'Toko Luna baru ganti tampilan situsnya jadi lebih bersih. Konversi naik 18% dalam seminggu! Buat yang jualan online: tampilan rapi itu beneran ngarauuh.', image: 'https://picsum.photos/seed/tokoluna/800/500', created_at: isoMin(120), likes: 24, liked_by_me: true, comments: [{ id: 'dc3', user_id: 4, text: 'Wah selamat! Aku suka palet warnanya 🤍', created_at: isoMin(95) }] },
            { id: 'dm3', user_id: 4, text: 'Tips desain hari ini: satu halaman, satu aksi utama. Kalau ada 3 tombol yang sama-sama "penting", berarti belum ada yang penting. #tipsdesain', image: null, created_at: isoMin(300), likes: 31, liked_by_me: false, comments: [{ id: 'dc4', user_id: 8, text: 'Ini yang selalu aku kasih ke klien 😂 setuju banget', created_at: isoMin(240) }, { id: 'dc5', user_id: 7, text: 'Lagi merapikan halaman produkku sesuai tips ini', created_at: isoMin(180) }] },
            { id: 'dm4', user_id: 8, text: 'Baru selesaikan situs klien kedua pakai Clincoo. Dari brief ke launching cuma 3 hari. Kalau ada yang butuh jasa web, sapa aja ya!', image: 'https://picsum.photos/seed/yogaport/800/500', created_at: isoMin(480), likes: 15, liked_by_me: false, comments: [] },
            { id: 'dm5', user_id: 7, text: 'Cerita kecil: awalnya takut banget bikin situs sendiri, ternyata perlahan-lahan bisa juga. Sekarang pesanan batik masuk lewat website tiap hari. Buat yang masih ragu — mulai aja dulu, kecil-kecil dulu. #proyekbaru', image: 'https://picsum.photos/seed/batiklaras/800/500', created_at: isoMin(1500), likes: 42, liked_by_me: true, comments: [{ id: 'dc6', user_id: 6, text: 'Nadia ini contoh nyata pemilik toko yang mandiri digital 💪', created_at: isoMin(1400) }, { id: 'dc7', user_id: 3, text: 'Semangat! Halaman batiknya bagus banget', created_at: isoMin(1300) }] },
            { id: 'dm6', user_id: 3, text: 'Pertanyaan pemula: domain .id vs .co.id bedanya apa ya? Buat toko kecil lebih cocok yang mana? #tanya', image: null, created_at: isoMin(2000), likes: 7, liked_by_me: false, comments: [{ id: 'dc8', user_id: 8, text: 'Untuk toko kecil, .id lebih murah dan prosesnya gampang. .co.id butuh akta usaha.', created_at: isoMin(1900) }, { id: 'dc9', user_id: 2, text: 'Setuju sama Yoga, aku pakai .id aja', created_at: isoMin(1850) }] },
            { id: 'dm7', user_id: 5, text: 'Hari ke-7 belajar bikin situs: akhirnya paham bedanya domain, hosting, dan DNS 🙌 Kek thread lama soal konfigurasi, makasih semuanya!', image: null, created_at: isoMin(2800), likes: 19, liked_by_me: false, comments: [{ id: 'dc10', user_id: 6, text: 'Mantap Rizky, lanjut ke pekan kedua! 🚀', created_at: isoMin(2700) }] },
            { id: 'dm8', user_id: 6, text: 'Update: fitur pesan antar anggota sudah bisa dicoba. Buka profil anggota lalu tekan "Kirim Pesan". Pesan masuknya bakal muncul di ikon love di kanan atas.', image: 'https://picsum.photos/seed/komunitas/800/500', created_at: isoMin(90), likes: 9, liked_by_me: false, comments: [] }
        ];
        return {
            users: users,
            posts: posts,
            following: [2, 6, 4],
            messages: [
                { id: 'dmsg1', from_id: 2, text: 'Halo! Aku lihat situsmu di profil, bersih banget. Ajarin dong bikin halaman produk yang kayak punyamu 😊', created_at: isoMin(75) },
                { id: 'dmsg2', from_id: 6, text: 'Halo! Selamat datang di Komunitas Clincoo 👋 Ada yang bisa kami bantu? Semua fitur di mode ini bebas dicoba.', created_at: isoMin(45) }
            ]
        };
    }

    var db = null;
    function load() {
        try { db = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); } catch (e) { db = null; }
        if (!db || !db.posts || !db.users) { db = seed(); save(); }
    }
    function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }

    function shapePost(p) {
        var u = db.users[p.user_id] || { name: 'Pengguna', bio: '', link: '' };
        return {
            id: p.id, author: u.name, user_id: p.user_id, mine: p.user_id === 1,
            text: p.text, image: p.image, created_at: p.created_at,
            likes: p.likes || 0, liked_by_me: !!p.liked_by_me,
            comment_count: (p.comments || []).length,
            comments: (p.comments || []).map(function (c, i) {
                var cu = db.users[c.user_id] || { name: 'Pengguna' };
                return { id: c.id || ('dc' + i), author: cu.name, author_name: cu.name, text: c.text, created_at: c.created_at, user_id: c.user_id };
            }),
            author_avatar: '', author_bio: u.bio || '', author_link: u.link || ''
        };
    }
    function feedSorted() {
        return db.posts.slice().sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    }
    function ok(obj) { obj = obj || {}; obj._status = 200; return Promise.resolve(obj); }
    function err(msg, status) { return Promise.resolve({ error: msg, _status: status || 400 }); }

    function body(opts) { try { return JSON.parse((opts && opts.body) || '{}') || {}; } catch (e) { return {}; } }

    window.DemoApi = function (path, opts) {
        load();
        opts = opts || {};
        var method = (opts.method || 'GET').toUpperCase();
        var qi = path.indexOf('?');
        var base = qi >= 0 ? path.slice(0, qi) : path;
        var qs = qi >= 0 ? new URLSearchParams(path.slice(qi + 1)) : new URLSearchParams();
        var b = body(opts);

        // ---- auth ----
        if (base === '/auth/me') return ok({ user: { id: 1, name: db.users[1].name, email: 'demo@clincoo.dev', avatar_url: '' } });
        if (base === '/auth/logout') return ok({ success: true });

        // ---- cari ----
        if (base === '/community/search') {
            var q = (qs.get('q') || '').trim().toLowerCase();
            if (q.length < 2) return ok({ success: true, posts: [], people: [] });
            var posts = feedSorted().filter(function (p) { return p.text.toLowerCase().indexOf(q) !== -1; }).map(shapePost);
            var seen = {}, people = [];
            Object.keys(db.users).forEach(function (k) {
                var u = db.users[k];
                if (u.id !== 1 && !seen[u.id] && u.name.toLowerCase().indexOf(q) !== -1) { seen[u.id] = 1; people.push({ id: u.id, name: u.name, n: 0 }); }
            });
            return ok({ success: true, posts: posts, people: people });
        }

        // ---- ikuti ----
        if (base === '/community/follow') {
            var tid = parseInt(b.user_id, 10);
            if (!tid || !db.users[tid]) return err('Anggota tidak ditemukan', 404);
            if (tid === 1) return err('Tidak bisa mengikuti diri sendiri', 400);
            var ix = db.following.indexOf(tid);
            if (method === 'DELETE') { if (ix !== -1) db.following.splice(ix, 1); save(); return ok({ success: true, following: false }); }
            if (ix === -1) db.following.push(tid);
            save();
            return ok({ success: true, following: true });
        }

        // ---- pesan ----
        if (base === '/community/message') {
            var toId = parseInt(b.to_id, 10);
            var txt = String(b.text || '').trim().slice(0, 500);
            if (!toId || !db.users[toId]) return err('Anggota tidak ditemukan', 404);
            if (!txt) return err('Pesan tidak boleh kosong', 400);
            if (toId === 1) return err('Tidak bisa mengirim pesan ke diri sendiri', 400);
            // Balasan otomatis supaya percakapan demo terasa hidup
            db.messages.unshift({ id: 'dmsg' + Date.now(), from_id: toId, text: 'Terima kasih pesannya! (Balasan otomatis mode demo) 😊', created_at: new Date().toISOString() });
            save();
            return ok({ success: true });
        }

        // ---- like ----
        if (base === '/community/react') {
            var p1 = db.posts.find(function (p) { return p.id === String(b.post_id || ''); });
            if (!p1) return err('Postingan tidak ditemukan', 404);
            if (p1.liked_by_me) { p1.liked_by_me = false; p1.likes = Math.max(0, (p1.likes || 0) - 1); }
            else { p1.liked_by_me = true; p1.likes = (p1.likes || 0) + 1; }
            save();
            return ok({ success: true, liked: p1.liked_by_me, likes: p1.likes });
        }

        // ---- komentar ----
        if (base === '/community/comment') {
            var p2 = db.posts.find(function (p) { return p.id === String(b.post_id || ''); });
            if (!p2) return err('Postingan tidak ditemukan', 404);
            var ctext = String(b.text || '').trim().slice(0, 300);
            if (!ctext) return err('Komentar tidak boleh kosong', 400);
            p2.comments = p2.comments || [];
            p2.comments.push({ id: 'dc' + Date.now(), user_id: 1, text: ctext, created_at: new Date().toISOString() });
            save();
            return ok({ success: true, comment_count: p2.comments.length });
        }

        // ---- hapus postingan ----
        if (base === '/community/delete') {
            var ix2 = db.posts.findIndex(function (p) { return p.id === String(b.post_id || ''); });
            if (ix2 === -1) return err('Postingan tidak ditemukan', 404);
            if (db.posts[ix2].user_id !== 1) return err('Kamu hanya bisa menghapus postinganmu sendiri', 403);
            db.posts.splice(ix2, 1);
            save();
            return ok({ success: true });
        }

        // ---- profil (nama/bio/link/cover) ----
        if (base === '/community/profile') {
            var meU = db.users[1];
            if (typeof b.name === 'string' && b.name.trim()) meU.name = b.name.trim().slice(0, 40);
            if (typeof b.bio === 'string') meU.bio = b.bio.slice(0, 200);
            if (typeof b.link === 'string') meU.link = b.link.trim().slice(0, 60);
            if (typeof b.cover === 'string') meU.cover = b.cover;
            save();
            return ok({ success: true, me: { id: 1, name: meU.name, avatar_url: '', bio: meU.bio, link: meU.link, cover: meU.cover || '' } });
        }

        // ---- feed & postingan ----
        if (base === '/community') {
            if (method === 'POST') {
                var text = String(b.text || '').trim().slice(0, 1000);
                if (!text && !b.image) return err('Postingan tidak boleh kosong', 400);
                var np = { id: 'dm' + Date.now(), user_id: 1, text: text, image: b.image || null, created_at: new Date().toISOString(), likes: 0, liked_by_me: false, comments: [] };
                db.posts.unshift(np);
                save();
                return ok({ success: true, post: shapePost(np) });
            }
            var lim = parseInt(qs.get('limit') || '30', 10) || 30;
            var feed = feedSorted().slice(0, lim).map(shapePost);
            var following = db.following.map(function (id) { return { id: id, name: (db.users[id] || {}).name || 'Pengguna', avatar_url: '' }; });
            var messages = db.messages.slice(0, 30).map(function (m, i) { return { id: m.id || ('dmsg' + i), from_id: m.from_id, from_name: (db.users[m.from_id] || {}).name || 'Pengguna', from_avatar: '', text: m.text, created_at: m.created_at }; });
            var meU2 = db.users[1];
            return ok({ feed: feed, following: following, messages: messages, me: { id: 1, name: meU2.name, avatar_url: '', bio: meU2.bio || '', link: meU2.link || '', cover: meU2.cover || '' } });
        }

        return err('Endpoint demo tidak dikenal: ' + base, 404);
    };

    // Inisialisasi pertama: pastikan DB demo siap & nama profil demo tersedia
    load();
    if (window.demoMode()) {
        try {
            if (!localStorage.getItem('clincoo_community_me')) {
                localStorage.setItem('clincoo_community_me', JSON.stringify({ id: 1, name: db.users[1].name, bio: db.users[1].bio, link: db.users[1].link, avatar: '' }));
            }
        } catch (e) {}
    }
})();
