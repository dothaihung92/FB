// Dispatcher: chon nha cung cap AI (Claude / Gemini / GLM) theo Settings da
// luu qua dashboard (uu tien) hoac bien AI_PROVIDER trong .env, doc lai MOI
// LAN GOI (khong cache) de doi provider trong dashboard co hieu luc ngay,
// khong can khoi dong lai app. Cac noi khac trong app chi biet 1 interface
// duy nhat: generateTopics, generatePost, analyzeComment.

const store = require('../db');

function currentProvider() {
  return (store.getSetting('AI_PROVIDER') || process.env.AI_PROVIDER || 'claude').toLowerCase();
}

const PROVIDERS = {
  claude: () => require('./ai/claude'),
  gemini: () => require('./ai/gemini'),
  glm: () => require('./ai/glm'),
};

function getImpl() {
  const provider = currentProvider();
  const load = PROVIDERS[provider];
  if (!load) {
    throw new Error(
      `AI_PROVIDER không hợp lệ: "${provider}". Chỉ hỗ trợ "claude", "gemini" hoặc "glm".`
    );
  }
  return load();
}

async function generateTopics(...args) {
  return getImpl().generateTopics(...args);
}

async function generatePost(...args) {
  return getImpl().generatePost(...args);
}

async function analyzeComment(...args) {
  return getImpl().analyzeComment(...args);
}

module.exports = {
  generateTopics,
  generatePost,
  analyzeComment,
  get provider() {
    return currentProvider();
  },
  get MODEL() {
    return getImpl().MODEL;
  },
};
