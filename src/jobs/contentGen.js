const store = require('../db');
const ai = require('../services/ai');

/**
 * Sinh chủ đề mới (nếu kho chủ đề chưa dùng còn ít) rồi viết bài nháp cho các
 * chủ đề chưa dùng. Bài viết ra sẽ ở trạng thái "draft" chờ duyệt trên dashboard
 * (trừ khi AUTO_PUBLISH=true thì job publish sẽ tự đăng theo lịch).
 */
async function runContentGeneration({ topicsToGenerate = 5, postsToWrite = 1 } = {}) {
  if (store.countUnusedTopics() < 3) {
    const topics = await ai.generateTopics(topicsToGenerate);
    for (const t of topics) store.insertTopic(t);
  }

  const pending = store.listUnusedTopics(postsToWrite);

  const created = [];
  for (const topic of pending) {
    const content = await ai.generatePost(topic.title);
    const post = store.insertPost({ topic: topic.title, content, status: 'draft' });
    store.markTopicUsed(topic.id);
    created.push({ id: post.id, topic: topic.title });
  }
  return created;
}

module.exports = { runContentGeneration };
