const BRAND_CONTEXT = `Bạn là trợ lý content marketing cho một dịch vụ kế toán - thuế dành cho
chủ doanh nghiệp nhỏ và hộ kinh doanh cá thể (HKD) tại Việt Nam. Đối tượng mục tiêu: chủ công ty
TNHH/CP nhỏ, chủ HKD, freelancer cần xử lý sổ sách - báo cáo thuế - BHXH - thành lập doanh nghiệp.
Giọng văn: gần gũi, đáng tin cậy, dễ hiểu, không dùng thuật ngữ khó, luôn có giá trị thực tế
(mẹo, cảnh báo deadline, thay đổi luật thuế...). Không bịa số liệu/pháp lý sai. Cuối bài luôn có
call-to-action nhẹ nhàng mời inbox/để lại bình luận để được tư vấn miễn phí.`;

const TOPICS_PROMPT = (count) => `Đề xuất ${count} chủ đề bài đăng Facebook khác nhau, nhắm đúng chủ DN nhỏ/HKD
đang cần dịch vụ kế toán - thuế. Mỗi chủ đề 1 dòng ngắn gọn, không đánh số, không giải thích thêm.`;

const POST_PROMPT = (topic) => `Viết một bài đăng Facebook (150-250 từ) về chủ đề: "${topic}".
Yêu cầu: có tiêu đề/hook 1 dòng đầu thu hút, dùng emoji vừa phải, chia đoạn ngắn dễ đọc trên mobile,
kết thúc bằng lời mời để lại bình luận hoặc inbox để được tư vấn miễn phí. Chỉ trả về nội dung bài
đăng, không thêm ghi chú nào khác.`;

const ANALYZE_COMMENT_PROMPT = (commentText) => `Bình luận của khách trên bài Facebook: "${commentText}"

Hãy đánh giá: đây có phải người có khả năng cần dịch vụ kế toán/thuế/thành lập DN không?
interest_score từ 0-100 (100 = rất tiềm năng, ví dụ hỏi giá/hỏi cách làm/nói đang cần).
suggested_reply: câu trả lời ngắn gọn (1-3 câu), thân thiện, hữu ích, mời họ inbox để được tư vấn
chi tiết miễn phí - KHÔNG được yêu cầu số điện thoại/thông tin cá nhân trực tiếp trong bình luận công khai.
extracted_contact: nếu khách đã TỰ để lại SĐT/email/zalo trong bình luận thì trích ra, ngược lại null.`;

function parseTopicLines(text, count) {
  return text
    .split('\n')
    .map((l) => l.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, count);
}

function safeParseAnalysis(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {
      is_potential_lead: false,
      interest_score: 0,
      reason: 'parse_error',
      suggested_reply: '',
      extracted_contact: null,
    };
  }
}

module.exports = {
  BRAND_CONTEXT,
  TOPICS_PROMPT,
  POST_PROMPT,
  ANALYZE_COMMENT_PROMPT,
  parseTopicLines,
  safeParseAnalysis,
};
