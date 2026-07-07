const axios = require('axios');
const store = require('../db');
const { isDryRun, assertWithinBudgetCap } = require('./adsCommon');

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Cau hinh Marketing API tach rieng voi Page token dung de dang bai/tra loi
 * comment, vi Marketing API can quyen ads_management/ads_read (Advanced
 * Access, phai xin App Review + xac minh doanh nghiep) va thao tac tren
 * mot Ad Account (act_<id>) chu khong phai Page.
 */
function requireConfig() {
  const adAccountId = store.getSetting('FB_AD_ACCOUNT_ID');
  const token = store.getSetting('FB_ADS_ACCESS_TOKEN');
  if (!adAccountId || !token) {
    throw new Error(
      'Chưa cấu hình tài khoản Facebook Ads. Vào "Cài đặt Ads" trên dashboard để điền ' +
        'FB_AD_ACCOUNT_ID và access token có quyền ads_management (xem HUONG_DAN_ADS.md).'
    );
  }
  const accountPath = String(adAccountId).startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  return { accountPath, token };
}

function simulatedId(prefix) {
  return `sandbox_${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/** Tạo chiến dịch quảng cáo (Campaign) trên tài khoản Facebook Ads. */
async function createCampaign(draft) {
  assertWithinBudgetCap(draft.daily_budget_vnd);
  const payload = {
    name: `[AI] ${draft.keyword}`,
    objective: 'OUTCOME_LEADS',
    status: 'PAUSED', // luôn tạo ở trạng thái tạm dừng - người dùng tự bật khi sẵn sàng
    special_ad_categories: [],
  };

  if (isDryRun()) {
    return { id: simulatedId('campaign'), simulated: true, payload };
  }

  const { accountPath, token } = requireConfig();
  const { data } = await axios.post(`${GRAPH_BASE}/${accountPath}/campaigns`, null, {
    params: { ...payload, special_ad_categories: JSON.stringify([]), access_token: token },
  });
  return { ...data, simulated: false, payload };
}

/** Tạo Ad Set (ngân sách, đối tượng) gắn với một Campaign. */
async function createAdSet(draft, campaignId) {
  assertWithinBudgetCap(draft.daily_budget_vnd);
  const dailyBudgetCents = Math.round(Number(draft.daily_budget_vnd || 0) / 25); // ước lượng quy đổi VND -> USD cents cho ví dụ, cần chỉnh theo tiền tệ tài khoản thật
  const payload = {
    name: `[AI] Ad Set - ${draft.keyword}`,
    campaign_id: campaignId,
    daily_budget: dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LEAD_GENERATION',
    status: 'PAUSED',
  };

  if (isDryRun()) {
    return { id: simulatedId('adset'), simulated: true, payload };
  }

  const { accountPath, token } = requireConfig();
  const { data } = await axios.post(`${GRAPH_BASE}/${accountPath}/adsets`, null, {
    params: { ...payload, access_token: token },
  });
  return { ...data, simulated: false, payload };
}

/** Tạo mẩu quảng cáo (Ad) với nội dung do AI sinh ra, gắn vào Ad Set. */
async function createAd(draft, adSetId) {
  const payload = {
    name: `[AI] Ad - ${draft.keyword}`,
    adset_id: adSetId,
    status: 'PAUSED',
    creative: { headline: draft.headline, body: draft.description, cta_type: draft.cta },
  };

  if (isDryRun()) {
    return { id: simulatedId('ad'), simulated: true, payload };
  }

  const { accountPath, token } = requireConfig();
  const { data } = await axios.post(`${GRAPH_BASE}/${accountPath}/ads`, null, {
    params: { ...payload, creative: JSON.stringify(payload.creative), access_token: token },
  });
  return { ...data, simulated: false, payload };
}

/** Tạo Website Custom Audience từ Pixel để retarget người đã ghé site. */
async function createWebsiteCustomAudience({ pixelId, name, retentionDays = 30 } = {}) {
  const targetPixelId = pixelId || store.getSetting('FB_PIXEL_ID');
  if (!targetPixelId) {
    throw new Error('Chưa cấu hình FB_PIXEL_ID. Cài Meta Pixel lên website trước (xem HUONG_DAN_ADS.md).');
  }
  const payload = {
    name: name || 'Khách đã ghé website (AI retargeting)',
    subtype: 'WEBSITE',
    pixel_id: targetPixelId,
    retention_days: retentionDays,
    rule: { inclusions: { operator: 'or', rules: [{ event_sources: [{ id: targetPixelId, type: 'pixel' }], retention_seconds: retentionDays * 86400, filter: { operator: 'and', filters: [] } }] } },
  };

  if (isDryRun()) {
    return { id: simulatedId('audience'), simulated: true, payload };
  }

  const { accountPath, token } = requireConfig();
  const { data } = await axios.post(`${GRAPH_BASE}/${accountPath}/customaudiences`, null, {
    params: { ...payload, rule: JSON.stringify(payload.rule), access_token: token },
  });
  return { ...data, simulated: false, payload };
}

/** Lấy chỉ số hiệu suất (spend/CPC/CPA...) của một chiến dịch để đưa vào AI tối ưu. */
async function getInsights(campaignId) {
  if (isDryRun() || String(campaignId).startsWith('sandbox_')) {
    return {
      campaign_id: campaignId,
      spend: 0,
      clicks: 0,
      cpc: 0,
      conversions: 0,
      cpa: null,
      simulated: true,
    };
  }

  const { token } = requireConfig();
  const { data } = await axios.get(`${GRAPH_BASE}/${campaignId}/insights`, {
    params: { access_token: token, fields: 'spend,clicks,cpc,actions' },
  });
  const row = data.data?.[0] || {};
  const conversions = (row.actions || []).find((a) => a.action_type === 'lead')?.value || 0;
  return {
    campaign_id: campaignId,
    spend: Number(row.spend || 0),
    clicks: Number(row.clicks || 0),
    cpc: Number(row.cpc || 0),
    conversions: Number(conversions),
    cpa: conversions > 0 ? Number(row.spend || 0) / conversions : null,
    simulated: false,
  };
}

module.exports = {
  createCampaign,
  createAdSet,
  createAd,
  createWebsiteCustomAudience,
  getInsights,
};
