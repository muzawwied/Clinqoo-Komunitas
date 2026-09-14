// POST /api/community/profile — edit profil: nama, bio, tautan, foto profil
// (dipakai halaman edit-profil.html; menyimpan ke auth_users + community_profiles)
import { getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables, validPostImage } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const body = await request.json().catch(() => ({}));

    const name = String(body.name || '').trim().slice(0, 40);
    const bio = String(body.bio || '').trim().slice(0, 200);
    const link = String(body.link || '').trim().slice(0, 120);
    const avatar = body.avatar === '' || body.avatar == null ? undefined : String(body.avatar);
    const cover = body.cover == null ? undefined : String(body.cover); // undefined=jangan diubah, ''=hapus

    if (!name) return json({ error: 'Nama tidak boleh kosong' }, 400);
    if (avatar !== undefined && avatar !== '' && !validPostImage(avatar)) {
      return json({ error: 'Foto tidak valid atau terlalu besar (maks ~100KB)' }, 400);
    }
    if (cover !== undefined && cover !== '' && !validPostImage(cover)) {
      return json({ error: 'Cover tidak valid atau terlalu besar (maks ~100KB)' }, 400);
    }
    if (link && !/^(https?:\/\/|www\.)/i.test(link)) {
      return json({ error: 'Tautan harus diawali http://, https://, atau www.' }, 400);
    }

    // Nama & foto profil tersimpan di auth_users (avatar_url sudah ada kolomnya)
    if (avatar !== undefined) {
      await db.prepare('UPDATE auth_users SET name = ?, avatar_url = ? WHERE id = ?')
        .bind(name, avatar, user.id).run();
    } else {
      await db.prepare('UPDATE auth_users SET name = ? WHERE id = ?').bind(name, user.id).run();
    }

    // Bio & tautan di community_profiles
    await db.prepare(`
      INSERT INTO community_profiles (user_id, bio, link) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET bio = excluded.bio, link = excluded.link, updated_at = datetime('now')
    `).bind(user.id, bio, link).run();
    if (cover !== undefined) {
      await db.prepare('UPDATE community_profiles SET cover = ? WHERE user_id = ?').bind(cover, user.id).run();
    }

    return json({
      success: true,
      me: { id: user.id, name: name, avatar_url: avatar !== undefined ? (avatar || '') : (user.avatar_url || ''), bio: bio, link: link, cover: cover !== undefined ? (cover || '') : await getCover(db, user.id) }
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getCover(db, userId) {
  try {
    const pr = await db.prepare('SELECT cover FROM community_profiles WHERE user_id = ?').bind(userId).first();
    return (pr && pr.cover) || '';
  } catch (e) { return ''; }
}
