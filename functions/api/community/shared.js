// Helper bersama untuk /api/community/* — skema D1 komunitas Clincoo
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
    updated_at TEXT DEFAULT (datetime('now'))
  )`).run();
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
  return rows.map(function (r) {
    return shapePost(r, meId, likesBy[r.id] || 0, !!likedBy[r.id], cmtsBy[r.id] || []);
  });
}

export function validPostImage(img) {
  return typeof img === 'string' && img.indexOf('data:image/') === 0 && img.length <= 100000;
}
