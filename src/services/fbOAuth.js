const axios = require('axios');

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function getRedirectUri(req) {
  // Cho phep override khi deploy sau domain/proxy khac localhost.
  if (process.env.FB_OAUTH_REDIRECT_URI) return process.env.FB_OAUTH_REDIRECT_URI;
  return `${req.protocol}://${req.get('host')}/connect/facebook/callback`;
}

function requireAppCreds() {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('Thiếu FB_APP_ID hoặc FB_APP_SECRET trong file .env.');
  }
  return { appId, appSecret };
}

/** Xây URL để mở hộp thoại đăng nhập/cấp quyền Facebook. */
function buildAuthUrl(req, state) {
  const { appId } = requireAppCreds();
  const redirectUri = getRedirectUri(req);
  const scopes = [
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'pages_read_user_content',
  ].join(',');
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    response_type: 'code',
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

/** Đổi "code" (Facebook redirect về) lấy User Access Token ngắn hạn. */
async function exchangeCodeForUserToken(req, code) {
  const { appId, appSecret } = requireAppCreds();
  const redirectUri = getRedirectUri(req);
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
  });
  return data.access_token;
}

/** Đổi User Access Token ngắn hạn sang bản dài hạn (~60 ngày, tự gia hạn khi user còn dùng app). */
async function exchangeForLongLivedUserToken(shortLivedToken) {
  const { appId, appSecret } = requireAppCreds();
  const { data } = await axios.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    },
  });
  return data.access_token;
}

/**
 * Lấy danh sách Page mà user quản lý, kèm Page Access Token tương ứng.
 * Nếu user token truyền vào là bản dài hạn, Page Access Token trả về ở đây
 * cũng sẽ là bản không hết hạn (miễn Page còn tồn tại & user còn giữ vai trò).
 */
async function listManagedPages(userToken) {
  const { data } = await axios.get(`${GRAPH_BASE}/me/accounts`, {
    params: { access_token: userToken, fields: 'id,name,access_token' },
  });
  return data.data || [];
}

module.exports = {
  buildAuthUrl,
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  listManagedPages,
};
