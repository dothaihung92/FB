// Dispatcher: chon nha cung cap AI (Claude hoac Gemini) theo bien AI_PROVIDER
// trong .env, nhung expose ra ngoai dung 1 interface duy nhat (generateTopics,
// generatePost, analyzeComment) de cac noi khac trong app khong can biet dang
// dung provider nao.

const provider = (process.env.AI_PROVIDER || 'claude').toLowerCase();

let impl;
if (provider === 'gemini') {
  impl = require('./ai/gemini');
} else if (provider === 'claude') {
  impl = require('./ai/claude');
} else {
  throw new Error(`AI_PROVIDER không hợp lệ: "${provider}". Chỉ hỗ trợ "claude" hoặc "gemini".`);
}

module.exports = {
  generateTopics: impl.generateTopics,
  generatePost: impl.generatePost,
  analyzeComment: impl.analyzeComment,
  provider,
  MODEL: impl.MODEL,
};
