const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const {
  BRAND_CONTEXT,
  TOPICS_PROMPT,
  POST_PROMPT,
  ANALYZE_COMMENT_PROMPT,
  parseTopicLines,
  safeParseAnalysis,
} = require('./shared');

let _client = null;
function client() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Thiếu GEMINI_API_KEY trong .env');
  }
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return _client;
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function textModel() {
  return client().getGenerativeModel({ model: MODEL, systemInstruction: BRAND_CONTEXT });
}

function jsonModel(schema) {
  return client().getGenerativeModel({
    model: MODEL,
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

module.exports = { generateTopics, generatePost, analyzeComment, MODEL };
