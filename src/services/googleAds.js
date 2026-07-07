const axios = require('axios');
const store = require('../db');
const { isDryRun, assertWithinBudgetCap } = require('./adsCommon');

const API_VERSION = 'v17';
const ADS_BASE = `https://googleads.googleapis.com/${API_VERSION}`;

/**
 * Google Ads API dung REST + OAuth2 refresh token (khac han co che cua Meta -
 * can Developer Token rieng do Google duyet, thuong mat vai ngay cho tai
 * khoan Production). Xem HUONG_DAN_ADS.md de tu lay du 5 gia tri ben duoi.
 */
function requireConfig() {
  const developerToken = store.getSetting('GOOGLE_ADS_DEVELOPER_TOKEN');
  const clientId = store.getSetting('GOOGLE_ADS_CLIENT_ID');
  const clientSecret = store.getSetting('GOOGLE_ADS_CLIENT_SECRET');
  const refreshToken = store.getSetting('GOOGLE_ADS_REFRESH_TOKEN');
  const customerId = store.getSetting('GOOGLE_ADS_CUSTOMER_ID');
  if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
    throw new Error(
      'Chưa cấu hình đủ Google Ads API. Vào "Cài đặt Ads" trên dashboard để điền Developer Token, ' +
        'Client ID/Secret, Refresh Token và Customer ID (xem HUONG_DAN_ADS.md).'
    );
  }
  return {
    developerToken,
    clientId,
    clientSecret,
    refreshToken,
    customerId: String(customerId).replace(/-/g, ''),
    loginCustomerId: store.getSetting('GOOGLE_ADS_LOGIN_CUSTOMER_ID', '').replace(/-/g, ''),
  };
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const { data } = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return data.access_token;
}

async function authHeaders(cfg) {
  const accessToken = await getAccessToken(cfg);
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': cfg.developerToken,
  };
  if (cfg.loginCustomerId) headers['login-customer-id'] = cfg.loginCustomerId;
  return headers;
}

function simulatedId(prefix) {
  return `sandbox_${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/** Tạo chiến dịch Search Ads (tạm dừng sẵn) cho một từ khoá/nhóm quảng cáo. */
async function createSearchCampaign(draft) {
  assertWithinBudgetCap(draft.daily_budget_vnd);
  const budgetMicros = Math.round(Number(draft.daily_budget_vnd || 0) * 1_000_000);
  const payload = {
    campaign: {
      name: `[AI] ${draft.keyword}`,
      status: 'PAUSED',
      advertisingChannelType: 'SEARCH',
      campaignBudget: { amountMicros: budgetMicros },
    },
  };

  if (isDryRun()) {
    return { id: simulatedId('campaign'), simulated: true, payload };
  }

  const cfg = requireConfig();
  const headers = await authHeaders(cfg);
  const { data } = await axios.post(
    `${ADS_BASE}/customers/${cfg.customerId}/campaigns:mutate`,
    { operations: [{ create: payload.campaign }] },
    { headers }
  );
  return { id: data.results?.[0]?.resourceName, simulated: false, payload };
}

/** Thêm danh sách từ khoá (keyword criteria) vào một Ad Group. */
async function addKeywords(adGroupResourceName, keywords) {
  const payload = {
    operations: keywords.map((k) => ({
      create: {
        adGroup: adGroupResourceName,
        status: 'PAUSED',
        keyword: { text: k.keyword, matchType: 'PHRASE' },
      },
    })),
  };

  if (isDryRun()) {
    return { ids: keywords.map((_, i) => simulatedId(`keyword${i}`)), simulated: true, payload };
  }

  const cfg = requireConfig();
  const headers = await authHeaders(cfg);
  const { data } = await axios.post(
    `${ADS_BASE}/customers/${cfg.customerId}/adGroupCriteria:mutate`,
    payload,
    { headers }
  );
  return { ids: (data.results || []).map((r) => r.resourceName), simulated: false, payload };
}

/** Lấy chỉ số hiệu suất (spend/clicks/conversions) của một chiến dịch. */
async function getCampaignStats(campaignResourceName) {
  if (isDryRun() || String(campaignResourceName).startsWith('sandbox_')) {
    return {
      campaign: campaignResourceName,
      cost_vnd: 0,
      clicks: 0,
      conversions: 0,
      cpa_vnd: null,
      simulated: true,
    };
  }

  const cfg = requireConfig();
  const headers = await authHeaders(cfg);
  const query = `SELECT campaign.id, metrics.cost_micros, metrics.clicks, metrics.conversions
    FROM campaign WHERE campaign.resource_name = '${campaignResourceName}' DURING LAST_7_DAYS`;
  const { data } = await axios.post(
    `${ADS_BASE}/customers/${cfg.customerId}/googleAds:search`,
    { query },
    { headers }
  );
  const row = data.results?.[0]?.metrics || {};
  const costVnd = Number(row.costMicros || 0) / 1_000_000;
  const conversions = Number(row.conversions || 0);
  return {
    campaign: campaignResourceName,
    cost_vnd: costVnd,
    clicks: Number(row.clicks || 0),
    conversions,
    cpa_vnd: conversions > 0 ? costVnd / conversions : null,
    simulated: false,
  };
}

module.exports = {
  createSearchCampaign,
  addKeywords,
  getCampaignStats,
};
