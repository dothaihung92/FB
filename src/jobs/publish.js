const { db } = require('../db');
const fb = require('../services/facebook');

/** Đăng ngay các bài đã đến hạn (status='scheduled' và scheduled_at <= now). */
async function runPublishDue() {
  const due = db
    .prepare(
      "SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= datetime('now') ORDER BY scheduled_at ASC"
    )
    .all();

  const results = [];
  for (const post of due) {
    try {
      const fbRes = await fb.publishPost({ message: post.content });
      db.prepare(
        "UPDATE posts SET status = 'published', fb_post_id = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(fbRes.id, post.id);
      results.push({ id: post.id, ok: true, fb_post_id: fbRes.id });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      db.prepare(
        "UPDATE posts SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(msg, post.id);
      results.push({ id: post.id, ok: false, error: msg });
    }
  }
  return results;
}

module.exports = { runPublishDue };
