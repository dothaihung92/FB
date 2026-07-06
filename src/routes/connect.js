const express = require('express');
const crypto = require('crypto');
const store = require('../db');
const fbOAuth = require('../services/fbOAuth');

const router = express.Router();

router.get('/', (req, res) => {
  const hasAppCreds = Boolean(process.env.FB_APP_ID && process.env.FB_APP_SECRET);
  const connected = Boolean(store.getSetting('FB_PAGE_ACCESS_TOKEN'));
  res.render('connect', {
    hasAppCreds,
    connected,
    pageName: store.getSetting('FB_PAGE_NAME'),
    pageId: store.getSetting('FB_PAGE_ID'),
    redirectUri: `${req.protocol}://${req.get('host')}/connect/facebook/callback`,
    flash: req.query.flash || null,
  });
});

router.get('/facebook', (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    store.setSetting('oauth_state', state);
    const url = fbOAuth.buildAuthUrl(req, state);
    res.redirect(url);
  } catch (err) {
    res.redirect('/connect?flash=' + encodeURIComponent('Lỗi: ' + err.message));
  }
});

router.get('/facebook/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;
  if (error) {
    return res.redirect(
      '/connect?flash=' + encodeURIComponent('Facebook từ chối cấp quyền: ' + (errorDescription || error))
    );
  }

  const expectedState = store.getSetting('oauth_state');
  if (!state || state !== expectedState) {
    return res.redirect(
      '/connect?flash=' + encodeURIComponent('Phiên xác thực không hợp lệ hoặc đã hết hạn, vui lòng thử lại.')
    );
  }

  try {
    const shortToken = await fbOAuth.exchangeCodeForUserToken(req, code);
    const longToken = await fbOAuth.exchangeForLongLivedUserToken(shortToken);
    const pages = await fbOAuth.listManagedPages(longToken);

    if (!pages.length) {
      return res.redirect(
        '/connect?flash=' +
          encodeURIComponent('Tài khoản Facebook này chưa quản lý Page nào, hoặc chưa cấp quyền quản lý Page.')
      );
    }

    if (pages.length === 1) {
      saveConnectedPage(pages[0]);
      return res.redirect(
        '/connect?flash=' + encodeURIComponent(`Đã kết nối Page "${pages[0].name}" thành công!`)
      );
    }

    // Quản lý nhiều Page: lưu tạm để người dùng chọn đúng Page cần dùng.
    store.setSetting('oauth_pages_json', JSON.stringify(pages));
    return res.redirect('/connect/select');
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    return res.redirect('/connect?flash=' + encodeURIComponent('Lỗi kết nối Facebook: ' + msg));
  }
});

router.get('/select', (req, res) => {
  const pages = JSON.parse(store.getSetting('oauth_pages_json', '[]'));
  if (!pages.length) return res.redirect('/connect');
  res.render('connect-select', { pages });
});

router.post('/select', (req, res) => {
  const pages = JSON.parse(store.getSetting('oauth_pages_json', '[]'));
  const chosen = pages.find((p) => p.id === req.body.page_id);
  if (!chosen) return res.redirect('/connect');
  saveConnectedPage(chosen);
  res.redirect('/connect?flash=' + encodeURIComponent(`Đã kết nối Page "${chosen.name}" thành công!`));
});

router.post('/disconnect', (req, res) => {
  store.setSetting('FB_PAGE_ID', '');
  store.setSetting('FB_PAGE_ACCESS_TOKEN', '');
  store.setSetting('FB_PAGE_NAME', '');
  res.redirect('/connect?flash=' + encodeURIComponent('Đã ngắt kết nối Page.'));
});

function saveConnectedPage(page) {
  store.setSetting('FB_PAGE_ID', page.id);
  store.setSetting('FB_PAGE_ACCESS_TOKEN', page.access_token);
  store.setSetting('FB_PAGE_NAME', page.name);
}

module.exports = router;
