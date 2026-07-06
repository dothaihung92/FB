const axios = require('axios');

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireConfig() {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    throw new Error(
      'Thiếu FB_PAGE_ID hoặc FB_PAGE_ACCESS_TOKEN trong .env. Xem README.md để lấy Page Access Token.'
    );
  }
  return { pageId, token };
}

/** Đăng bài text (kèm ảnh liên kết nếu có link_image_url) lên Page. */
async function publishPost({ message, link }) {
  const { pageId, token } = requireConfig();
  const url = `${GRAPH_BASE}/${pageId}/feed`;
  const params = { message, access_token: token };
  if (link) params.link = link;
  const { data } = await axios.post(url, null, { params });
  return data; // { id: "<page_id>_<post_id>" }
}

/** Đăng bài kèm ảnh (upload trực tiếp qua URL công khai). */
async function publishPhotoPost({ message, imageUrl }) {
  const { pageId, token } = requireConfig();
  const url = `${GRAPH_BASE}/${pageId}/photos`;
  const { data } = await axios.post(url, null, {
    params: { url: imageUrl, caption: message, access_token: token },
  });
  return data;
}

/** Lấy danh sách bài đã đăng gần đây trên Page. */
async function listRecentPosts(limit = 10) {
  const { pageId, token } = requireConfig();
  const url = `${GRAPH_BASE}/${pageId}/posts`;
  const { data } = await axios.get(url, {
    params: { access_token: token, limit, fields: 'id,message,created_time,permalink_url' },
  });
  return data.data || [];
}

/** Lấy comment mới trên một bài viết. */
async function listComments(postId, limit = 25) {
  const { token } = requireConfig();
  const url = `${GRAPH_BASE}/${postId}/comments`;
  const { data } = await axios.get(url, {
    params: {
      access_token: token,
      limit,
      order: 'reverse_chronological',
      fields: 'id,message,from,created_time,comment_count',
    },
  });
  return data.data || [];
}

/** Lấy comment mới trên tất cả bài đăng gần đây (để quét lead). */
async function listRecentCommentsAcrossPosts(postLimit = 10, commentLimit = 25) {
  const posts = await listRecentPosts(postLimit);
  const results = [];
  for (const post of posts) {
    try {
      const comments = await listComments(post.id, commentLimit);
      for (const c of comments) results.push({ ...c, post_id: post.id });
    } catch (err) {
      // Bỏ qua bài lỗi (VD: đã bị xoá quyền comment) để không chặn toàn bộ job.
    }
  }
  return results;
}

/** Trả lời một comment. */
async function replyToComment(commentId, message) {
  const { token } = requireConfig();
  const url = `${GRAPH_BASE}/${commentId}/comments`;
  const { data } = await axios.post(url, null, { params: { message, access_token: token } });
  return data;
}

/** Gửi tin nhắn Messenger cho một user đã từng nhắn cho Page (dùng psid). */
async function sendMessengerMessage(psid, text) {
  const { pageId, token } = requireConfig();
  const url = `${GRAPH_BASE}/me/messages`;
  const { data } = await axios.post(
    url,
    { recipient: { id: psid }, message: { text }, messaging_type: 'RESPONSE' },
    { params: { access_token: token } }
  );
  return data;
}

module.exports = {
  publishPost,
  publishPhotoPost,
  listRecentPosts,
  listComments,
  listRecentCommentsAcrossPosts,
  replyToComment,
  sendMessengerMessage,
};
