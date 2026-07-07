const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
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

function apiKey() {
  return store.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
}

function client() {
  const key = apiKey();
  if (!key) {
    throw new Error('Thiếu Gemini API Key. Vào "Cài đặt AI" trên dashboard để điền.');
  }
  return new GoogleGenerativeAI(key);
}

function currentModel() {
  return store.getSetting('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-flash-latest';
}

function textModel() {
  return client().getGenerativeModel({ model: currentModel(), systemInstruction: BRAND_CONTEXT });
}

function jsonModel(schema) {
  return client().getGenerativeModel({
    model: currentModel(),
    systemInstruction: BRAND_CONTEXT,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
  });
}

async function generateTopics(count = 5) {
  const result = await textModel().generateContent(TOPICS_PROMPT(count));
  return parseTopicLines(result.response.text().trim(), count);
}

async function generatePost(topic) {
  const result = await textModel().generateContent(POST_PROMPT(topic));
  return result.response.text().trim();
}

async function analyzeComment(commentText) {
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      is_potential_lead: { type: SchemaType.BOOLEAN },
      interest_score: { type: SchemaType.INTEGER },
      reason: { type: SchemaType.STRING },
      suggested_reply: { type: SchemaType.STRING },
      extracted_contact: { type: SchemaType.STRING, nullable: true },
    },
    required: ['is_potential_lead', 'interest_score', 'reason', 'suggested_reply', 'extracted_contact'],
  };
  const result = await jsonModel(schema).generateContent(ANALYZE_COMMENT_PROMPT(commentText));
  return safeParseAnalysis(result.response.text().trim());
}

async function suggestAdKeywords({ platform = 'facebook', count = 8 } = {}) {
  const schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        keyword: { type: SchemaType.STRING },
        intent: { type: SchemaType.STRING },
        est_competition: { type: SchemaType.STRING },
      },
      required: ['keyword', 'intent', 'est_competition'],
    },
  };
  const result = await jsonModel(schema).generateContent(AD_KEYWORDS_PROMPT(platform, count));
  return safeParseJsonArray(result.response.text().trim()).slice(0, count);
}

async function generateAdCopy({ platform = 'facebook', keyword }) {
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      headline: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      cta: { type: SchemaType.STRING },
    },
    required: ['headline', 'description', 'cta'],
  };
  const result = await jsonModel(schema).generateContent(AD_COPY_PROMPT(platform, keyword));
  return safeParseAdCopy(result.response.text().trim());
}

async function suggestOptimization({ campaignStats }) {
  const schema = {
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        action: { type: SchemaType.STRING },
        target: { type: SchemaType.STRING },
        reason: { type: SchemaType.STRING },
      },
      required: ['action', 'target', 'reason'],
    },
  };
  const result = await jsonModel(schema).generateContent(
    AD_OPTIMIZATION_PROMPT(JSON.stringify(campaignStats))
  );
  return safeParseJsonArray(result.response.text().trim());
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
