// Helper bersama untuk /api/community/* — skema D1 komunitas Clinqoo
// JANGAN pakai prefix "_" pada nama file (wrangler mengecualikannya dari bundle)
import { initTables as initAuthTables, randomHex } from '../auth/shared.js';

export async function initCommunityTables(db) {
  await initAuthTables(db);
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_likes (
    post_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(post_id, user_id)
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_profiles (
    user_id INTEGER PRIMARY KEY,
    bio TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id INTEGER NOT NULL,
    to_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS community_follows (
    follower_id INTEGER NOT NULL,
    followed_id INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(follower_id, followed_id)
  )`).run();
  await migrateLegacy(db);
}

// Migrasi data lama: versi sebelumnya punya kolom author_name (NOT NULL) tanpa author,
// dan user_id tersimpan sebagai teks "61.0". Tabel dibangun ulang bersih, data dipertahankan.
async function migrateLegacy(db) {
  const colExists = async (table, col) => {
    try { await db.prepare(`SELECT ${col} FROM ${table} LIMIT 1`).run(); return true; }
    catch (e) { return false; }
  };
  const rebuildPosts = await colExists('community_posts', 'author_name');
  if (rebuildPosts) {
    try {
      const hasAuthor = await colExists('community_posts', 'author');
      const authorExpr = hasAuthor ? "COALESCE(author, author_name, 'Pengguna')" : "COALESCE(author_name, 'Pengguna')";
      await db.prepare('DROP TABLE IF EXISTS community_posts_mig').run();
      await db.prepare('ALTER TABLE community_posts RENAME TO community_posts_mig').run();
      await db.prepare(`CREATE TABLE community_posts (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`).run();
      await db.prepare(`INSERT INTO community_posts (id, user_id, author, text, image, created_at)
        SELECT id, CAST(user_id AS INTEGER), ${authorExpr}, COALESCE(text, ''), COALESCE(image, ''), COALESCE(created_at, datetime('now'))
        FROM community_posts_mig`).run();
      await db.prepare('DROP TABLE community_posts_mig').run();
    } catch (e) { /* bila gagal, tabel lama tetap dipakai */ }
  }
  const rebuildComments = await colExists('community_comments', 'author_name');
  if (rebuildComments) {
    try {
      const hasAuthor = await colExists('community_comments', 'author');
      const authorExpr = hasAuthor ? "COALESCE(author, author_name, 'Pengguna')" : "COALESCE(author_name, 'Pengguna')";
      await db.prepare('DROP TABLE IF EXISTS community_comments_mig').run();
      await db.prepare('ALTER TABLE community_comments RENAME TO community_comments_mig').run();
      await db.prepare(`CREATE TABLE community_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`).run();
      await db.prepare(`INSERT INTO community_comments (id, post_id, user_id, author, text, created_at)
        SELECT id, post_id, CAST(user_id AS INTEGER), ${authorExpr}, COALESCE(text, ''), COALESCE(created_at, datetime('now'))
        FROM community_comments_mig`).run();
      await db.prepare('DROP TABLE community_comments_mig').run();
    } catch (e) { /* bila gagal, tabel lama tetap dipakai */ }
  }
  // jaring pengaman: pastikan kolom author/link ada di semua instalasi
  const alter = async (sql) => { try { await db.prepare(sql).run(); } catch (e) {} };
  await alter('ALTER TABLE community_posts ADD COLUMN author TEXT');
  await alter('ALTER TABLE community_comments ADD COLUMN author TEXT');
  await alter("ALTER TABLE community_profiles ADD COLUMN link TEXT NOT NULL DEFAULT ''");
  await alter("ALTER TABLE community_profiles ADD COLUMN cover TEXT NOT NULL DEFAULT ''");
  try {
    await db.prepare(`UPDATE community_posts SET author = COALESCE(
      (SELECT name FROM auth_users WHERE auth_users.id = CAST(community_posts.user_id AS INTEGER)), 'Pengguna')
      WHERE author IS NULL OR author = ''`).run();
    await db.prepare(`UPDATE community_comments SET author = COALESCE(
      (SELECT name FROM auth_users WHERE auth_users.id = CAST(community_comments.user_id AS INTEGER)), 'Pengguna')
      WHERE author IS NULL OR author = ''`).run();
  } catch (e) { /* auth_users mungkin belum siap */ }
}

export function newPostId() { return randomHex(12); }

export function shapeComment(row) {
  return {
    id: String(row.id),
    author: row.author,
    author_name: row.author,
    text: row.text,
    created_at: row.created_at,
    user_id: row.user_id
  };
}

export function shapePost(row, meId, likes, likedByMe, comments) {
  return {
    id: row.id,
    author: row.author,
    user_id: row.user_id,
    mine: meId != null && row.user_id === meId,
    text: row.text,
    image: row.image,
    created_at: row.created_at,
    likes: likes,
    liked_by_me: likedByMe,
    comment_count: comments.length,
    comments: comments
  };
}

// Ambil postingan (list id) lengkap dengan like & komentar — dipakai feed, search, profil
export async function hydratePosts(db, rows, meId) {
  const ids = rows.map(function (r) { return r.id; });
  let likeRows = [], cmtRows = [];
  if (ids.length) {
    const ph = ids.map(function () { return '?'; }).join(',');
    likeRows = (await db.prepare(`SELECT post_id, user_id FROM community_likes WHERE post_id IN (${ph})`).bind(...ids).all()).results || [];
    cmtRows = (await db.prepare(`SELECT * FROM community_comments WHERE post_id IN (${ph}) ORDER BY created_at ASC, id ASC`).bind(...ids).all()).results || [];
  }
  const likesBy = {}, likedBy = {}, cmtsBy = {};
  likeRows.forEach(function (l) {
    likesBy[l.post_id] = (likesBy[l.post_id] || 0) + 1;
    if (meId != null && l.user_id === meId) likedBy[l.post_id] = true;
  });
  cmtRows.forEach(function (c) {
    (cmtsBy[c.post_id] = cmtsBy[c.post_id] || []).push(shapeComment(c));
  });
  const uids = [];
  rows.forEach(function (r) { const u = parseInt(r.user_id, 10); if (u && uids.indexOf(u) === -1) uids.push(u); });
  let avaBy = {}, linkBy = {}, bioBy = {};
  if (uids.length) {
    const ph = uids.map(function () { return '?'; }).join(',');
    try {
      const au = (await db.prepare(`SELECT id, avatar_url FROM auth_users WHERE id IN (${ph})`).bind(...uids).all()).results || [];
      au.forEach(function (u) { if (u.avatar_url) avaBy[u.id] = u.avatar_url; });
    } catch (e) {}
    try {
      const pr = (await db.prepare(`SELECT user_id, bio, link FROM community_profiles WHERE user_id IN (${ph})`).bind(...uids).all()).results || [];
      pr.forEach(function (p) { if (p.link) linkBy[parseInt(p.user_id, 10)] = p.link; if (p.bio) bioBy[parseInt(p.user_id, 10)] = p.bio; });
    } catch (e) {}
  }
  return rows.map(function (r) {
    const post = shapePost(r, meId, likesBy[r.id] || 0, !!likedBy[r.id], cmtsBy[r.id] || []);
    const uid = parseInt(r.user_id, 10);
    post.author_avatar = avaBy[uid] || '';
    post.author_link = linkBy[uid] || '';
    post.author_bio = bioBy[uid] || '';
    return post;
  });
}

export function validPostImage(img) {
  return typeof img === 'string' && (img.indexOf('data:image/') === 0 || img.indexOf('data:video/') === 0) && img.length <= 100000;
}
