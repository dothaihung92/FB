const store = require('../db');
const fb = require('../services/facebook');
const ai = require('../services/ai');

const AUTO_REPLY = () => String(process.env.AUTO_REPLY_COMMENTS || 'true') === 'true';

/**
 * Quét bình luận mới trên các bài đăng gần đây, dùng AI đánh giá tiềm năng,
 * lưu vào bảng leads, và tự động trả lời (nếu bật AUTO_REPLY_COMMENTS) với
 * những bình luận có khả năng là khách hàng tiềm năng.
 */
async function runCommentScan({ postLimit = 10, commentLimit = 25 } = {}) {
  const comments = await fb.listRecentCommentsAcrossPosts(postLimit, commentLimit);
  const known = store.knownLeadObjectIds();

  const newLeads = [];
  for (const c of comments) {
    if (known.has(c.id)) continue;
    if (!c.message) continue;

    const analysis = await ai.analyzeComment(c.message);

    const lead = store.insertLead({
      source: 'comment',
      fb_user_id: c.from?.id || null,
      fb_user_name: c.from?.name || null,
      object_id: c.id,
      post_id: c.post_id,
      message: c.message,
      ai_reply: analysis.suggested_reply,
      interest_score: analysis.interest_score,
      contact_info: analysis.extracted_contact,
    });

    let replied = false;
    if (AUTO_REPLY() && analysis.is_potential_lead && analysis.suggested_reply) {
      try {
        await fb.replyToComment(c.id, analysis.suggested_reply);
        replied = true;
      } catch {
        // Bỏ qua lỗi trả lời (VD: quyền bị thu hồi), lead vẫn được lưu để xử lý tay.
      }
    }
    store.updateLead(lead.id, { replied: replied ? 1 : 0 });

    newLeads.push({ id: lead.id, score: analysis.interest_score, replied });
  }
  return newLeads;
}

module.exports = { runCommentScan };
