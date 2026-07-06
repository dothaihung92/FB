const axios = require('axios');
const store = require('../../db');
const {
  BRAND_CONTEXT,
  TOPICS_PROMPT,
  POST_PROMPT,
  ANALYZE_COMMENT_PROMPT,
  parseTopicLines,
  safeParseAnalysis,
} = require('./shared');

// GLM (Zhipu AI / Z.ai) dung API dang tuong thich OpenAI (chat completions),
// nen goi thang bang axios thay vi can 1 SDK rieng.
function apiKey() {
  return store.getSetting('GLM_API_KEY') || process.env.GLM_API_KEY;
}

function currentModel() {
  return store.getSetting('GLM_MODEL') || process.env.GLM_MODEL || 'glm-5.2';
}

function baseUrl() {
  return (
    store.getSetting('GLM_BASE_URL') ||
    process.env.GLM_BASE_URL ||
    'https://open.bigmodel.cn/api/paas/v4'
  );
}

async function chat(userPrompt, { jsonMode = false, maxTokens = 1200 } = {}) {
  const key = apiKey();
  if (!key) {
    throw new Error('Thiếu GLM API Key. Vào "Cài đặt AI" trên dashboard để điền.');
  }

  const body = {
    model: currentModel(),
    messages: [
      { role: 'system', content: BRAND_CONTEXT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.7,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const { data } = await axios.post(`${baseUrl()}/chat/completions`, body, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  return (data.choices?.[0]?.message?.content || '').trim();
}

async function generateTopics(count = 5) {
  const text = await chat(TOPICS_PROMPT(count), { maxTokens: 512 });
  return parseTopicLines(text, count);
}

async function generatePost(topic) {
  return chat(POST_PROMPT(topic), { maxTokens: 900 });
}

async function analyzeComment(commentText) {
  const schemaHint = `Trả lời DUY NHẤT bằng một object JSON hợp lệ, đúng các khoá sau, không thêm
chữ nào khác ngoài JSON: {"is_potential_lead": boolean, "interest_score": number (0-100),
"reason": string, "suggested_reply": string, "extracted_contact": string hoặc null}.`;
  const text = await chat(`${ANALYZE_COMMENT_PROMPT(commentText)}\n\n${schemaHint}`, {
    jsonMode: true,
    maxTokens: 500,
  });
  return safeParseAnalysis(text);
}

module.exports = {
  generateTopics,
  generatePost,
  analyzeComment,
  get MODEL() {
    return currentModel();
  },
};
