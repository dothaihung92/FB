const express = require('express');
const store = require('../db');
const ai = require('../services/ai');

const router = express.Router();

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

router.get('/', (req, res) => {
  const provider = store.getSetting('AI_PROVIDER') || process.env.AI_PROVIDER || 'claude';

  res.render('settings', {
    provider,
    claude: {
      hasKey: Boolean(store.getSetting('ANTHROPIC_API_KEY') || process.env.ANTHROPIC_API_KEY),
      maskedKey: maskKey(store.getSetting('ANTHROPIC_API_KEY') || process.env.ANTHROPIC_API_KEY),
      model: store.getSetting('CLAUDE_MODEL') || process.env.CLAUDE_MODEL || 'claude-opus-4-8',
    },
    gemini: {
      hasKey: Boolean(store.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY),
      maskedKey: maskKey(store.getSetting('GEMINI_API_KEY') || process.env.GEMINI_API_KEY),
      model: store.getSetting('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-flash-latest',
    },
    glm: {
      hasKey: Boolean(store.getSetting('GLM_API_KEY') || process.env.GLM_API_KEY),
      maskedKey: maskKey(store.getSetting('GLM_API_KEY') || process.env.GLM_API_KEY),
      model: store.getSetting('GLM_MODEL') || process.env.GLM_MODEL || 'glm-5.2',
      baseUrl:
        store.getSetting('GLM_BASE_URL') ||
        process.env.GLM_BASE_URL ||
        'https://open.bigmodel.cn/api/paas/v4',
    },
    ads: {
      dryRun: store.getSetting('ADS_DRY_RUN', 'true') !== 'false',
      budgetCap: store.getSetting('ADS_DAILY_BUDGET_CAP_VND', ''),
      fbAdAccountId: store.getSetting('FB_AD_ACCOUNT_ID', ''),
      fbAdsTokenSet: Boolean(store.getSetting('FB_ADS_ACCESS_TOKEN')),
      fbAdsTokenMasked: maskKey(store.getSetting('FB_ADS_ACCESS_TOKEN')),
      fbPixelId: store.getSetting('FB_PIXEL_ID', ''),
      googleDeveloperTokenSet: Boolean(store.getSetting('GOOGLE_ADS_DEVELOPER_TOKEN')),
      googleDeveloperTokenMasked: maskKey(store.getSetting('GOOGLE_ADS_DEVELOPER_TOKEN')),
      googleClientId: store.getSetting('GOOGLE_ADS_CLIENT_ID', ''),
      googleClientSecretSet: Boolean(store.getSetting('GOOGLE_ADS_CLIENT_SECRET')),
      googleClientSecretMasked: maskKey(store.getSetting('GOOGLE_ADS_CLIENT_SECRET')),
      googleRefreshTokenSet: Boolean(store.getSetting('GOOGLE_ADS_REFRESH_TOKEN')),
      googleRefreshTokenMasked: maskKey(store.getSetting('GOOGLE_ADS_REFRESH_TOKEN')),
      googleCustomerId: store.getSetting('GOOGLE_ADS_CUSTOMER_ID', ''),
      googleLoginCustomerId: store.getSetting('GOOGLE_ADS_LOGIN_CUSTOMER_ID', ''),
    },
    flash: req.query.flash || null,
  });
});

router.post('/', (req, res) => {
  const { provider } = req.body;
  if (!['claude', 'gemini', 'glm'].includes(provider)) {
    return res.redirect('/settings?flash=' + encodeURIComponent('Nhà cung cấp AI không hợp lệ.'));
  }
  store.setSetting('AI_PROVIDER', provider);

  if (req.body.anthropic_api_key) store.setSetting('ANTHROPIC_API_KEY', req.body.anthropic_api_key.trim());
  if (req.body.claude_model) store.setSetting('CLAUDE_MODEL', req.body.claude_model.trim());

  if (req.body.gemini_api_key) store.setSetting('GEMINI_API_KEY', req.body.gemini_api_key.trim());
  if (req.body.gemini_model) store.setSetting('GEMINI_MODEL', req.body.gemini_model.trim());

  if (req.body.glm_api_key) store.setSetting('GLM_API_KEY', req.body.glm_api_key.trim());
  if (req.body.glm_model) store.setSetting('GLM_MODEL', req.body.glm_model.trim());
  if (req.body.glm_base_url) store.setSetting('GLM_BASE_URL', req.body.glm_base_url.trim());

  res.redirect('/settings?flash=' + encodeURIComponent('Đã lưu cài đặt AI.'));
});

router.post('/ads', (req, res) => {
  store.setSetting('ADS_DRY_RUN', req.body.ads_dry_run === 'false' ? 'false' : 'true');
  if (req.body.ads_budget_cap_vnd) store.setSetting('ADS_DAILY_BUDGET_CAP_VND', req.body.ads_budget_cap_vnd.trim());

  if (req.body.fb_ad_account_id) store.setSetting('FB_AD_ACCOUNT_ID', req.body.fb_ad_account_id.trim());
  if (req.body.fb_ads_access_token) store.setSetting('FB_ADS_ACCESS_TOKEN', req.body.fb_ads_access_token.trim());
  if (req.body.fb_pixel_id) store.setSetting('FB_PIXEL_ID', req.body.fb_pixel_id.trim());

  if (req.body.google_ads_developer_token) store.setSetting('GOOGLE_ADS_DEVELOPER_TOKEN', req.body.google_ads_developer_token.trim());
  if (req.body.google_ads_client_id) store.setSetting('GOOGLE_ADS_CLIENT_ID', req.body.google_ads_client_id.trim());
  if (req.body.google_ads_client_secret) store.setSetting('GOOGLE_ADS_CLIENT_SECRET', req.body.google_ads_client_secret.trim());
  if (req.body.google_ads_refresh_token) store.setSetting('GOOGLE_ADS_REFRESH_TOKEN', req.body.google_ads_refresh_token.trim());
  if (req.body.google_ads_customer_id) store.setSetting('GOOGLE_ADS_CUSTOMER_ID', req.body.google_ads_customer_id.trim());
  if (req.body.google_ads_login_customer_id) store.setSetting('GOOGLE_ADS_LOGIN_CUSTOMER_ID', req.body.google_ads_login_customer_id.trim());

  res.redirect('/settings?flash=' + encodeURIComponent('Đã lưu cài đặt Ads.'));
});

router.post('/test', async (req, res) => {
  try {
    const topics = await ai.generateTopics(1);
    res.redirect(
      '/settings?flash=' +
        encodeURIComponent(`Kết nối AI (${ai.provider}) thành công! Ví dụ chủ đề: "${topics[0] || ''}"`)
    );
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message;
    res.redirect('/settings?flash=' + encodeURIComponent('Lỗi kết nối AI: ' + msg));
  }
});

module.exports = router;
