const axios = require('axios');
const store = require('../../db');
const {
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

// GLM's json_object mode chỉ chấp nhận JSON object ở cấp cao nhất (không phải
// array trần) - nên yêu cầu model bọc mảng trong khoá "items" rồi tự bóc ra.
const ARRAY_WRAP_HINT = `Trả lời DUY NHẤT bằng một JSON object hợp lệ dạng {"items": [...]}, không thêm chữ nào khác.`;

async function suggestAdKeywords({ platform = 'facebook', count = 8 } = {}) {
  const text = await chat(`${AD_KEYWORDS_PROMPT(platform, count)}\n\n${ARRAY_WRAP_HINT}`, {
    jsonMode: true,
    maxTokens: 900,
  });
  try {
    const parsed = JSON.parse(text);
    return (Array.isArray(parsed.items) ? parsed.items : []).slice(0, count);
  } catch {
    return [];
  }
}

async function generateAdCopy({ platform = 'facebook', keyword }) {
  const text = await chat(AD_COPY_PROMPT(platform, keyword), { jsonMode: true, maxTokens: 300 });
  return safeParseAdCopy(text);
}

async function suggestOptimization({ campaignStats }) {
  const text = await chat(
    `${AD_OPTIMIZATION_PROMPT(JSON.stringify(campaignStats))}\n\n${ARRAY_WRAP_HINT}`,
    { jsonMode: true, maxTokens: 900 }
  );
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

module.exports = {
  generateTopics,
  generatePost,
  analyzeComment,
  suggestAdKeywords,
  generateAdCopy,
  suggestOptimization,
  get MODEL() {
    return currentModel();
  },
};
