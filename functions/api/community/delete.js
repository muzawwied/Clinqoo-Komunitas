// POST /api/community/delete {post_id} — hapus postingan milik sendiri (beserta like & komentarnya)
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const body = await request.json().catch(() => ({}));
    const postId = String(body.post_id || '');
    const post = postId ? await db.prepare('SELECT * FROM community_posts WHERE id = ?').bind(postId).first() : null;
    if (!post) return json({ error: 'Postingan tidak ditemukan' }, 404);
    if (post.user_id !== user.id) return json({ error: 'Kamu hanya bisa menghapus postinganmu sendiri' }, 403);
    await db.prepare('DELETE FROM community_likes WHERE post_id = ?').bind(postId).run();
    await db.prepare('DELETE FROM community_comments WHERE post_id = ?').bind(postId).run();
    await db.prepare('DELETE FROM community_posts WHERE id = ?').bind(postId).run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
