const Anthropic = require('@anthropic-ai/sdk');

let _client = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Thiếu ANTHROPIC_API_KEY trong .env');
  }
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-8';

const BRAND_CONTEXT = `Bạn là trợ lý content marketing cho một dịch vụ kế toán - thuế dành cho
chủ doanh nghiệp nhỏ và hộ kinh doanh cá thể (HKD) tại Việt Nam. Đối tượng mục tiêu: chủ công ty
TNHH/CP nhỏ, chủ HKD, freelancer cần xử lý sổ sách - báo cáo thuế - BHXH - thành lập doanh nghiệp.
Giọng văn: gần gũi, đáng tin cậy, dễ hiểu, không dùng thuật ngữ khó, luôn có giá trị thực tế
(mẹo, cảnh báo deadline, thay đổi luật thuế...). Không bịa số liệu/pháp lý sai. Cuối bài luôn có
call-to-action nhẹ nhàng mời inbox/để lại bình luận để được tư vấn miễn phí.`;

function extractText(message) {
  const block = message.content.find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

async function generateTopics(count = 5) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: BRAND_CONTEXT,
    messages: [
      {
        role: 'user',
        content: `Đề xuất ${count} chủ đề bài đăng Facebook khác nhau, nhắm đúng chủ DN nhỏ/HKD
đang cần dịch vụ kế toán - thuế. Mỗi chủ đề 1 dòng ngắn gọn, không đánh số, không giải thích thêm.`,
      },
    ],
  });
  return extractText(res)
    .split('\n')
    .map((l) => l.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, count);
}

async function generatePost(topic) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: BRAND_CONTEXT,
    messages: [
      {
        role: 'user',
        content: `Viết một bài đăng Facebook (150-250 từ) về chủ đề: "${topic}".
Yêu cầu: có tiêu đề/hook 1 dòng đầu thu hút, dùng emoji vừa phải, chia đoạn ngắn dễ đọc trên mobile,
kết thúc bằng lời mời để lại bình luận hoặc inbox để được tư vấn miễn phí. Chỉ trả về nội dung bài
đăng, không thêm ghi chú nào khác.`,
      },
    ],
  });
  return extractText(res);
}

/**
 * Phân tích một bình luận để: chấm điểm tiềm năng khách hàng, gợi ý câu trả lời,
 * và trích xuất thông tin liên hệ nếu khách tự nguyện để lại.
 */
async function analyzeComment(commentText) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: BRAND_CONTEXT,
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            is_potential_lead: { type: 'boolean' },
            interest_score: { type: 'integer' },
            reason: { type: 'string' },
            suggested_reply: { type: 'string' },
            extracted_contact: { type: ['string', 'null'] },
          },
          required: [
            'is_potential_lead',
            'interest_score',
            'reason',
            'suggested_reply',
            'extracted_contact',
          ],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `Bình luận của khách trên bài Facebook: "${commentText}"

Hãy đánh giá: đây có phải người có khả năng cần dịch vụ kế toán/thuế/thành lập DN không?
interest_score từ 0-100 (100 = rất tiềm năng, ví dụ hỏi giá/hỏi cách làm/nói đang cần).
suggested_reply: câu trả lời ngắn gọn (1-3 câu), thân thiện, hữu ích, mời họ inbox để được tư vấn
chi tiết miễn phí - KHÔNG được yêu cầu số điện thoại/thông tin cá nhân trực tiếp trong bình luận công khai.
extracted_contact: nếu khách đã TỰ để lại SĐT/email/zalo trong bình luận thì trích ra, ngược lại null.`,
      },
    ],
  });
  const textBlock = extractText(res);
  try {
    return JSON.parse(textBlock);
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

module.exports = { generateTopics, generatePost, analyzeComment, MODEL };
