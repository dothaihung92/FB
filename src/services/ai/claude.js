const Anthropic = require('@anthropic-ai/sdk');
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

// Doc cau hinh tu Settings (luu qua dashboard, ap dung ngay khong can khoi
// dong lai) truoc, neu chua cau hinh thi lay tu .env.
function apiKey() {
  return store.getSetting('ANTHROPIC_API_KEY') || process.env.ANTHROPIC_API_KEY;
}

function client() {
  const key = apiKey();
  if (!key) {
    throw new Error('Thiếu Anthropic API Key. Vào "Cài đặt AI" trên dashboard để điền.');
  }
  return new Anthropic({ apiKey: key });
}

function currentModel() {
  return store.getSetting('CLAUDE_MODEL') || process.env.CLAUDE_MODEL || 'claude-opus-4-8';
}

function extractText(message) {
  const block = message.content.find((b) => b.type === 'text');
  return block ? block.text.trim() : '';
}

async function generateTopics(count = 5) {
  const res = await client().messages.create({
    model: currentModel(),
    max_tokens: 1024,
    system: BRAND_CONTEXT,
    messages: [{ role: 'user', content: TOPICS_PROMPT(count) }],
  });
  return parseTopicLines(extractText(res), count);
}

async function generatePost(topic) {
  const res = await client().messages.create({
    model: currentModel(),
    max_tokens: 1200,
    system: BRAND_CONTEXT,
    messages: [{ role: 'user', content: POST_PROMPT(topic) }],
  });
  return extractText(res);
}

async function analyzeComment(commentText) {
  const res = await client().messages.create({
    model: currentModel(),
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
    messages: [{ role: 'user', content: ANALYZE_COMMENT_PROMPT(commentText) }],
  });
  return safeParseAnalysis(extractText(res));
}

async function suggestAdKeywords({ platform = 'facebook', count = 8 } = {}) {
  const res = await client().messages.create({
    model: currentModel(),
    max_tokens: 1200,
    system: BRAND_CONTEXT,
    messages: [{ role: 'user', content: AD_KEYWORDS_PROMPT(platform, count) }],
  });
  return safeParseJsonArray(extractText(res)).slice(0, count);
}

async function generateAdCopy({ platform = 'facebook', keyword }) {
  const res = await client().messages.create({
    model: currentModel(),
    max_tokens: 400,
    system: BRAND_CONTEXT,
    messages: [{ role: 'user', content: AD_COPY_PROMPT(platform, keyword) }],
  });
  return safeParseAdCopy(extractText(res));
}

async function suggestOptimization({ campaignStats }) {
  const res = await client().messages.create({
    model: currentModel(),
    max_tokens: 1200,
    system: BRAND_CONTEXT,
    messages: [{ role: 'user', content: AD_OPTIMIZATION_PROMPT(JSON.stringify(campaignStats)) }],
  });
  return safeParseJsonArray(extractText(res));
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
