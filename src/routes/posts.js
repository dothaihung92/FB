const express = require('express');
const store = require('../db');
const fb = require('../services/facebook');
const ai = require('../services/ai');
const { runContentGeneration } = require('../jobs/contentGen');

const router = express.Router();

router.get('/', (req, res) => {
  const posts = store.listPosts({ limit: 100 });
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
  store.updatePost(req.params.id, { content: req.body.content });
  res.redirect('/posts?flash=' + encodeURIComponent('Đã lưu chỉnh sửa.'));
});

router.post('/:id/regenerate', async (req, res) => {
  try {
    const post = store.getPost(req.params.id);
    if (!post) return res.redirect('/posts');
    const content = await ai.generatePost(post.topic || 'dịch vụ kế toán cho hộ kinh doanh');
    store.updatePost(post.id, { content });
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
  const iso = new Date(scheduled_at).toISOString();
  store.updatePost(req.params.id, { status: 'scheduled', scheduled_at: iso });
  res.redirect('/posts?flash=' + encodeURIComponent('Đã lên lịch đăng bài.'));
});

router.post('/:id/publish-now', async (req, res) => {
  try {
    const post = store.getPost(req.params.id);
    if (!post) return res.redirect('/posts');
    const fbRes = await fb.publishPost({ message: post.content });
    store.updatePost(post.id, { status: 'published', fb_post_id: fbRes.id });
    res.redirect('/posts?flash=' + encodeURIComponent('Đã đăng bài lên Page!'));
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect('/posts?flash=' + encodeURIComponent('Lỗi đăng bài: ' + msg));
  }
});

router.post('/:id/delete', (req, res) => {
  store.deletePost(req.params.id);
  res.redirect('/posts?flash=' + encodeURIComponent('Đã xoá bài nháp.'));
});

module.exports = router;
