const store = require('../db');
const ai = require('../services/ai');
const facebookAds = require('../services/facebookAds');
const googleAds = require('../services/googleAds');

/**
 * Lấy hiệu suất các chiến dịch đang chạy, nhờ AI phân tích và đề xuất tối ưu
 * (tắt từ khoá kém/tăng-giảm ngân sách/thêm từ khoá mới). CHỈ lưu đề xuất chờ
 * duyệt trên dashboard - không tự động áp dụng, theo đúng lựa chọn an toàn
 * của người dùng vì việc này ảnh hưởng trực tiếp tới tiền quảng cáo.
 */
async function runAdsMonitor() {
  const campaigns = store.listAdCampaigns({ limit: 50 }).filter((c) => c.status === 'active');
  if (!campaigns.length) return [];

  const stats = [];
  for (const c of campaigns) {
    try {
      const insight =
        c.platform === 'google'
          ? await googleAds.getCampaignStats(c.external_id)
          : await facebookAds.getInsights(c.external_id);
      stats.push({ campaign_id: c.id, platform: c.platform, ...insight });
    } catch (err) {
      // Bỏ qua chiến dịch lỗi (VD: token hết hạn) để không chặn cả job.
    }
  }
  if (!stats.length) return [];

  const suggestions = await ai.suggestOptimization({ campaignStats: stats });
  const created = [];
  for (const s of suggestions) {
    const statMatch = stats.find((st) => String(st.campaign_id) === String(s.target)) || stats[0];
    const suggestion = store.insertAdSuggestion({
      campaign_id: statMatch?.campaign_id || null,
      action: s.action,
      target: s.target,
      reason: s.reason,
    });
    created.push(suggestion);
  }
  return created;
}

module.exports = { runAdsMonitor };
