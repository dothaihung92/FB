const path = require('path');
const fs = require('fs');

// Kho luu tru don gian dua tren file JSON - khong dung module native nao,
// tranh loi bien dich (native build) hay gap tren Windows voi better-sqlite3/
// sqlite3. Phu hop voi quy mo du lieu cua app nay (mot Page, vai chuc/tram
// ban ghi), khong can toi mot database server that su.

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const storePath = path.join(dataDir, 'store.json');

function emptyStore() {
  return {
    posts: [],
    leads: [],
    topics: [],
    adDrafts: [],
    adCampaigns: [],
    adSuggestions: [],
    settings: {},
    seq: { posts: 0, leads: 0, topics: 0, adDrafts: 0, adCampaigns: 0, adSuggestions: 0 },
  };
}

function load() {
  if (!fs.existsSync(storePath)) return emptyStore();
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Object.assign(emptyStore(), parsed);
  } catch {
    // File hong/rong - bat dau lai voi kho trong thay vi crash ca app.
    return emptyStore();
  }
}

let state = load();

function save() {
  // Ghi ra file tam roi doi ten (atomic) de tranh hong du lieu neu app bi tat
  // dot ngot giua luc dang ghi.
  const tmpPath = storePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, storePath);
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(table) {
  state.seq[table] = (state.seq[table] || 0) + 1;
  return state.seq[table];
}

// ---------------------------------------------------------------- settings

function getSetting(key, fallback = null) {
  return Object.prototype.hasOwnProperty.call(state.settings, key)
    ? state.settings[key]
    : fallback;
}

function setSetting(key, value) {
  state.settings[key] = String(value);
  save();
}

// ------------------------------------------------------------------ posts

function listPosts({ limit = 100 } = {}) {
  return [...state.posts].sort((a, b) => b.id - a.id).slice(0, limit);
}

function getPost(id) {
  return state.posts.find((p) => p.id === Number(id)) || null;
}

function listDuePosts() {
  const now = nowIso();
  return state.posts
    .filter((p) => p.status === 'scheduled' && p.scheduled_at && p.scheduled_at <= now)
    .sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1));
}

function insertPost({ topic = null, content, status = 'draft' }) {
  const post = {
    id: nextId('posts'),
    topic,
    content,
    status,
    scheduled_at: null,
    fb_post_id: null,
    error: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  state.posts.push(post);
  save();
  return post;
}

function updatePost(id, fields) {
  const post = getPost(id);
  if (!post) return null;
  Object.assign(post, fields, { updated_at: nowIso() });
  save();
  return post;
}

function deletePost(id) {
  state.posts = state.posts.filter((p) => p.id !== Number(id));
  save();
}

// ------------------------------------------------------------------ leads

function listLeads({ limit = 200 } = {}) {
  return [...state.leads]
    .sort((a, b) => b.interest_score - a.interest_score || b.id - a.id)
    .slice(0, limit);
}

function getLead(id) {
  return state.leads.find((l) => l.id === Number(id)) || null;
}

function knownLeadObjectIds() {
  return new Set(state.leads.map((l) => l.object_id));
}

function insertLead(fields) {
  const lead = {
    id: nextId('leads'),
    source: fields.source,
    fb_user_id: fields.fb_user_id || null,
    fb_user_name: fields.fb_user_name || null,
    object_id: fields.object_id,
    post_id: fields.post_id || null,
    message: fields.message || null,
    ai_reply: fields.ai_reply || null,
    replied: fields.replied ? 1 : 0,
    interest_score: fields.interest_score || 0,
    contact_info: fields.contact_info || null,
    created_at: nowIso(),
  };
  state.leads.push(lead);
  save();
  return lead;
}

function updateLead(id, fields) {
  const lead = getLead(id);
  if (!lead) return null;
  Object.assign(lead, fields);
  save();
  return lead;
}

// ----------------------------------------------------------------- topics

function countUnusedTopics() {
  return state.topics.filter((t) => !t.used).length;
}

function listUnusedTopics(limit = 5) {
  return state.topics
    .filter((t) => !t.used)
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);
}

function insertTopic(title) {
  const topic = { id: nextId('topics'), title, used: 0, created_at: nowIso() };
  state.topics.push(topic);
  save();
  return topic;
}

function markTopicUsed(id) {
  const topic = state.topics.find((t) => t.id === Number(id));
  if (!topic) return;
  topic.used = 1;
  save();
}

// --------------------------------------------------------------- ad drafts

function listAdDrafts({ limit = 100 } = {}) {
  return [...state.adDrafts].sort((a, b) => b.id - a.id).slice(0, limit);
}

function getAdDraft(id) {
  return state.adDrafts.find((d) => d.id === Number(id)) || null;
}

function insertAdDraft({ platform, keyword, intent, headline, description, cta, daily_budget_vnd }) {
  const draft = {
    id: nextId('adDrafts'),
    platform,
    keyword,
    intent: intent || null,
    headline,
    description,
    cta,
    daily_budget_vnd: daily_budget_vnd || null,
    status: 'pending',
    created_at: nowIso(),
  };
  state.adDrafts.push(draft);
  save();
  return draft;
}

function updateAdDraft(id, fields) {
  const draft = getAdDraft(id);
  if (!draft) return null;
  Object.assign(draft, fields);
  save();
  return draft;
}

// ------------------------------------------------------------ ad campaigns

function listAdCampaigns({ limit = 100 } = {}) {
  return [...state.adCampaigns].sort((a, b) => b.id - a.id).slice(0, limit);
}

function getAdCampaign(id) {
  return state.adCampaigns.find((c) => c.id === Number(id)) || null;
}

function insertAdCampaign({ platform, draft_id, external_id, simulated, payload }) {
  const campaign = {
    id: nextId('adCampaigns'),
    platform,
    draft_id: draft_id || null,
    external_id,
    simulated: Boolean(simulated),
    payload: payload || null,
    status: 'active',
    created_at: nowIso(),
  };
  state.adCampaigns.push(campaign);
  save();
  return campaign;
}

function updateAdCampaign(id, fields) {
  const campaign = getAdCampaign(id);
  if (!campaign) return null;
  Object.assign(campaign, fields);
  save();
  return campaign;
}

// ---------------------------------------------------------- ad suggestions

function listAdSuggestions({ limit = 100 } = {}) {
  return [...state.adSuggestions].sort((a, b) => b.id - a.id).slice(0, limit);
}

function getAdSuggestion(id) {
  return state.adSuggestions.find((s) => s.id === Number(id)) || null;
}

function insertAdSuggestion({ campaign_id, action, target, reason }) {
  const suggestion = {
    id: nextId('adSuggestions'),
    campaign_id: campaign_id || null,
    action,
    target,
    reason,
    status: 'pending',
    created_at: nowIso(),
  };
  state.adSuggestions.push(suggestion);
  save();
  return suggestion;
}

function updateAdSuggestion(id, fields) {
  const suggestion = getAdSuggestion(id);
  if (!suggestion) return null;
  Object.assign(suggestion, fields);
  save();
  return suggestion;
}

module.exports = {
  getSetting,
  setSetting,
  listPosts,
  getPost,
  listDuePosts,
  insertPost,
  updatePost,
  deletePost,
  listLeads,
  getLead,
  knownLeadObjectIds,
  insertLead,
  updateLead,
  countUnusedTopics,
  listUnusedTopics,
  insertTopic,
  markTopicUsed,
  listAdDrafts,
  getAdDraft,
  insertAdDraft,
  updateAdDraft,
  listAdCampaigns,
  getAdCampaign,
  insertAdCampaign,
  updateAdCampaign,
  listAdSuggestions,
  getAdSuggestion,
  insertAdSuggestion,
  updateAdSuggestion,
};
