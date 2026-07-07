const express = require('express');
const store = require('../db');
const ai = require('../services/ai');
const facebookAds = require('../services/facebookAds');
const googleAds = require('../services/googleAds');
const { isDryRun, dailyBudgetCapVnd } = require('../services/adsCommon');
const { runAdsMonitor } = require('../jobs/adsMonitor');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('ads', {
    dryRun: isDryRun(),
    budgetCap: dailyBudgetCapVnd(),
    fbConfigured: Boolean(store.getSetting('FB_AD_ACCOUNT_ID') && store.getSetting('FB_ADS_ACCESS_TOKEN')),
    googleConfigured: Boolean(
      store.getSetting('GOOGLE_ADS_DEVELOPER_TOKEN') && store.getSetting('GOOGLE_ADS_CUSTOMER_ID')
    ),
    pixelId: store.getSetting('FB_PIXEL_ID'),
    drafts: store.listAdDrafts({ limit: 50 }).filter((d) => d.status === 'pending'),
    campaigns: store.listAdCampaigns({ limit: 50 }),
    suggestions: store.listAdSuggestions({ limit: 50 }).filter((s) => s.status === 'pending'),
    flash: req.query.flash || null,
  });
});

router.post('/drafts/generate', async (req, res) => {
  try {
    const platform = req.body.platform === 'google' ? 'google' : 'facebook';
    const count = Math.max(1, Math.min(10, Number(req.body.count) || 5));
    const budget = Number(req.body.daily_budget_vnd) || null;

    const keywords = await ai.suggestAdKeywords({ platform, count });
    for (const k of keywords) {
      const copy = await ai.generateAdCopy({ platform, keyword: k.keyword });
      store.insertAdDraft({
        platform,
        keyword: k.keyword,
        intent: k.intent,
        headline: copy.headline,
        description: copy.description,
        cta: copy.cta,
        daily_budget_vnd: budget,
      });
    }
    res.redirect('/ads?flash=' + encodeURIComponent(`Đã sinh ${keywords.length} đề xuất quảng cáo mới.`));
  } catch (err) {
    res.redirect('/ads?flash=' + encodeURIComponent('Lỗi: ' + err.message));
  }
});

router.post('/drafts/:id/edit', (req, res) => {
  const { headline, description, cta, daily_budget_vnd } = req.body;
  store.updateAdDraft(req.params.id, {
    headline,
    description,
    cta,
    daily_budget_vnd: Number(daily_budget_vnd) || null,
  });
  res.redirect('/ads?flash=' + encodeURIComponent('Đã lưu chỉnh sửa.'));
});

router.post('/drafts/:id/reject', (req, res) => {
  store.updateAdDraft(req.params.id, { status: 'rejected' });
  res.redirect('/ads?flash=' + encodeURIComponent('Đã từ chối đề xuất.'));
});

router.post('/drafts/:id/approve', async (req, res) => {
  try {
    const draft = store.getAdDraft(req.params.id);
    if (!draft) return res.redirect('/ads');

    let campaign;
    if (draft.platform === 'google') {
      const created = await googleAds.createSearchCampaign(draft);
      await googleAds.addKeywords(created.id, [{ keyword: draft.keyword }]);
      campaign = store.insertAdCampaign({
        platform: 'google',
        draft_id: draft.id,
        external_id: created.id,
        simulated: created.simulated,
        payload: created.payload,
      });
    } else {
      const createdCampaign = await facebookAds.createCampaign(draft);
      const adSet = await facebookAds.createAdSet(draft, createdCampaign.id);
      const ad = await facebookAds.createAd(draft, adSet.id);
      campaign = store.insertAdCampaign({
        platform: 'facebook',
        draft_id: draft.id,
        external_id: ad.id,
        simulated: ad.simulated,
        payload: { campaign: createdCampaign, adSet, ad },
      });
    }

    store.updateAdDraft(draft.id, { status: 'approved' });
    const note = campaign.simulated
      ? ' (chế độ mô phỏng - chưa tiêu tiền thật, xem "Cài đặt Ads" để bật thật)'
      : '';
    res.redirect('/ads?flash=' + encodeURIComponent(`Đã đẩy chiến dịch lên (tạm dừng)${note}. Vào Ads Manager/Google Ads để bật khi sẵn sàng.`));
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.redirect('/ads?flash=' + encodeURIComponent('Lỗi tạo chiến dịch: ' + msg));
  }
});

router.post('/suggestions/:id/approve', async (req, res) => {
  const suggestion = store.getAdSuggestion(req.params.id);
  if (!suggestion) return res.redirect('/ads');
  // Áp dụng thật (đổi ngân sách/tắt từ khoá) cần thao tác trực tiếp trên nền
  // tảng tương ứng - ở bản này chỉ đánh dấu đã duyệt để người dùng tự thực hiện
  // trên Ads Manager/Google Ads, tránh rủi ro thay đổi ngân sách ngoài ý muốn.
  store.updateAdSuggestion(suggestion.id, { status: 'approved' });
  res.redirect('/ads?flash=' + encodeURIComponent('Đã duyệt đề xuất - hãy áp dụng thủ công trên Ads Manager/Google Ads.'));
});

router.post('/suggestions/:id/reject', (req, res) => {
  store.updateAdSuggestion(req.params.id, { status: 'rejected' });
  res.redirect('/ads?flash=' + encodeURIComponent('Đã bỏ qua đề xuất.'));
});

router.post('/monitor/run', async (req, res) => {
  try {
    const created = await runAdsMonitor();
    res.redirect('/ads?flash=' + encodeURIComponent(`Đã quét hiệu suất, sinh ${created.length} đề xuất tối ưu mới.`));
  } catch (err) {
    res.redirect('/ads?flash=' + encodeURIComponent('Lỗi: ' + err.message));
  }
});

module.exports = router;
