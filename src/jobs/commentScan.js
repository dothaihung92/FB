const { db } = require('../db');
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
  const known = new Set(db.prepare('SELECT object_id FROM leads').all().map((r) => r.object_id));

  const newLeads = [];
  for (const c of comments) {
    if (known.has(c.id)) continue;
    if (!c.message) continue;

    const analysis = await ai.analyzeComment(c.message);

    const info = db
      .prepare(
        `INSERT INTO leads
         (source, fb_user_id, fb_user_name, object_id, post_id, message, ai_reply, interest_score, contact_info)
         VALUES ('comment', ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        c.from?.id || null,
        c.from?.name || null,
        c.id,
        c.post_id,
        c.message,
        analysis.suggested_reply,
        analysis.interest_score,
        analysis.extracted_contact
      );

    let replied = false;
    if (AUTO_REPLY() && analysis.is_potential_lead && analysis.suggested_reply) {
      try {
        await fb.replyToComment(c.id, analysis.suggested_reply);
        replied = true;
      } catch {
        // Bỏ qua lỗi trả lời (VD: quyền bị thu hồi), lead vẫn được lưu để xử lý tay.
      }
    }
    db.prepare('UPDATE leads SET replied = ? WHERE id = ?').run(replied ? 1 : 0, info.lastInsertRowid);

    newLeads.push({ id: info.lastInsertRowid, score: analysis.interest_score, replied });
  }
  return newLeads;
}

module.exports = { runCommentScan };
