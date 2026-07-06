const express = require('express');
const { db } = require('../db');
const fb = require('../services/facebook');
const ai = require('../services/ai');
const { runContentGeneration } = require('../jobs/contentGen');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = db.prepare('SELECT * FROM posts ORDER BY id DESC LIMIT 100').all();
  res.render('posts', { posts, flash: req.query.flash || null });
});

router.post('/generate', async (req, res) => {
  try {
    const count = Math.max(1, Math.min(5, Number(req.body.count) || 1));
    await runContentGeneration({ postsToWrite: count });
    res.redirect('/posts?flash=' + encodeURIComponent(`Đã tạo ${count} bài nháp mới.`));
  } catch (err) {
    res.redirect('/posts?flash=' + encodeURIComponent('Lỗi: ' + err.message));
  }
});

router.post('/:id/edit', (req, res) => {
  const { content } = req.body;
  db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
    content,
    req.params.id
  );
  res.redirect('/posts?flash=' + encodeURIComponent('Đã lưu chỉnh sửa.'));
});

router.post('/:id/regenerate', async (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.redirect('/posts');
    const content = await ai.generatePost(post.topic || 'dịch vụ kế toán cho hộ kinh doanh');
    db.prepare("UPDATE posts SET content = ?, updated_at = datetime('now') WHERE id = ?").run(
      content,
      post.id
    );
    res.redirect('/posts?flash=' + encodeURIComponent('Đã sinh lại nội dung.'));
  } catch (err) {
    res.redirect('/posts?flash=' + encodeURIComponent('Lỗi: ' + err.message));
  }
});

router.post('/:id/schedule', (req, res) => {
  const { scheduled_at } = req.body;
  if (!scheduled_at) {
    return res.redirect('/posts?flash=' + encodeURIComponent('Vui lòng chọn thời gian đăng.'));
  }
  db.prepare(
    "UPDATE posts SET status = 'scheduled', scheduled_at = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(scheduled_at, req.params.id);
  res.redirect('/posts?flash=' + encodeURIComponent('Đã lên lịch đăng bài.'));
});

router.post('/:id/publish-now', async (req, res) => {
  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) return res.redirect('/posts');
    const fbRes = await fb.publishPost({ message: post.content });
    db.prepare(
      "UPDATE posts SET status = 'published', fb_post_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(fbRes.id, post.id);
    res.redirect('/posts?flash=' + encodeURIComponent('Đã đăng bài lên Page!'));
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect('/posts?flash=' + encodeURIComponent('Lỗi đăng bài: ' + msg));
  }
});

router.post('/:id/delete', (req, res) => {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.redirect('/posts?flash=' + encodeURIComponent('Đã xoá bài nháp.'));
});

module.exports = router;
