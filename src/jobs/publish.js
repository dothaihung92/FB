const store = require('../db');
const fb = require('../services/facebook');

/** Đăng ngay các bài đã đến hạn (status='scheduled' và scheduled_at <= now). */
async function runPublishDue() {
  const due = store.listDuePosts();

  const results = [];
  for (const post of due) {
    try {
      const fbRes = await fb.publishPost({ message: post.content });
      store.updatePost(post.id, { status: 'published', fb_post_id: fbRes.id });
      results.push({ id: post.id, ok: true, fb_post_id: fbRes.id });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message;
      store.updatePost(post.id, { status: 'failed', error: msg });
      results.push({ id: post.id, ok: false, error: msg });
    }
  }
  return results;
}

module.exports = { runPublishDue };
