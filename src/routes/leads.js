const express = require('express');
const store = require('../db');
const fb = require('../services/facebook');
const { runCommentScan } = require('../jobs/commentScan');

const router = express.Router();

router.get('/', (req, res) => {
  const leads = store.listLeads({ limit: 200 });
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
    const lead = store.getLead(req.params.id);
    if (!lead) return res.redirect('/leads');
    const message = req.body.message || lead.ai_reply;
    if (lead.source === 'comment') {
      await fb.replyToComment(lead.object_id, message);
    }
    store.updateLead(lead.id, { replied: 1, ai_reply: message });
    res.redirect('/leads?flash=' + encodeURIComponent('Đã gửi phản hồi.'));
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect('/leads?flash=' + encodeURIComponent('Lỗi gửi phản hồi: ' + msg));
  }
});

module.exports = router;
