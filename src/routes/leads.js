const express = require('express');
const { db } = require('../db');
const fb = require('../services/facebook');
const { runCommentScan } = require('../jobs/commentScan');

const router = express.Router();

router.get('/', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY interest_score DESC, id DESC LIMIT 200').all();
  res.render('leads', { leads, flash: req.query.flash || null });
});

router.post('/scan', async (req, res) => {
  try {
    const found = await runCommentScan();
    res.redirect('/leads?flash=' + encodeURIComponent(`Đã quét xong, phát hiện ${found.length} bình luận mới.`));
  } catch (err) {
    res.redirect('/leads?flash=' + encodeURIComponent('Lỗi quét bình luận: ' + err.message));
  }
});

router.post('/:id/reply', async (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.redirect('/leads');
    const message = req.body.message || lead.ai_reply;
    if (lead.source === 'comment') {
      await fb.replyToComment(lead.object_id, message);
    }
    db.prepare('UPDATE leads SET replied = 1, ai_reply = ? WHERE id = ?').run(message, lead.id);
    res.redirect('/leads?flash=' + encodeURIComponent('Đã gửi phản hồi.'));
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect('/leads?flash=' + encodeURIComponent('Lỗi gửi phản hồi: ' + msg));
  }
});

module.exports = router;
