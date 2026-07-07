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

const AD_KEYWORDS_PROMPT = (platform, count) => `Đề xuất ${count} từ khoá quảng cáo ${platform === 'google' ? 'Google Ads (Search)' : 'Facebook Ads'}
nhắm đúng chủ DN nhỏ/HKD đang tìm/cần dịch vụ kế toán - thuế - thành lập doanh nghiệp tại Việt Nam.
Ưu tiên các từ khoá có ý định tìm dịch vụ rõ ràng (transactional), không phải từ khoá thông tin chung chung.
Chỉ trả về DUY NHẤT một JSON array hợp lệ, không thêm chữ nào khác, đúng dạng:
[{"keyword": string, "intent": string mô tả ngắn ý định tìm kiếm, "est_competition": "thấp"|"trung bình"|"cao"}]`;

const AD_COPY_PROMPT = (platform, keyword) => `Viết nội dung quảng cáo ${platform === 'google' ? 'Google Search Ads' : 'Facebook Ads'}
cho từ khoá/chủ đề: "${keyword}", nhắm chủ DN nhỏ/HKD cần dịch vụ kế toán - thuế.
${platform === 'google' ? 'Headline tối đa 30 ký tự, description tối đa 90 ký tự (giới hạn Google Search Ads).' : 'Headline tối đa 40 ký tự, description tối đa 125 ký tự.'}
Chỉ trả về DUY NHẤT một JSON object hợp lệ, không thêm chữ nào khác, đúng dạng:
{"headline": string, "description": string, "cta": string (VD: "Tìm hiểu thêm", "Liên hệ ngay")}`;

const AD_OPTIMIZATION_PROMPT = (statsJson) => `Đây là số liệu hiệu suất các chiến dịch quảng cáo dịch vụ kế toán đang chạy
(CPC/CPA/spend/clicks/conversions theo từ khoá hoặc chiến dịch):
${statsJson}

Hãy phân tích và đề xuất tối đa 5 hành động tối ưu cụ thể (VD: tắt từ khoá có CPA quá cao và không
ra chuyển đổi, tăng ngân sách cho từ khoá đang hiệu quả, giảm ngân sách chiến dịch kém, thêm từ
khoá liên quan tiềm năng). Chỉ trả về DUY NHẤT một JSON array hợp lệ, không thêm chữ nào khác,
đúng dạng:
[{"action": "pause_keyword"|"increase_budget"|"decrease_budget"|"new_keyword", "target": string, "reason": string ngắn gọn giải thích tại sao}]`;

function safeParseJsonArray(text) {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseAdCopy(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { headline: '', description: '', cta: '' };
  }
}

module.exports = {
  BRAND_CONTEXT,
  TOPICS_PROMPT,
  POST_PROMPT,
  ANALYZE_COMMENT_PROMPT,
  AD_KEYWORDS_PROMPT,
  AD_COPY_PROMPT,
  AD_OPTIMIZATION_PROMPT,
  parseTopicLines,
  safeParseAnalysis,
  safeParseJsonArray,
  safeParseAdCopy,
};
