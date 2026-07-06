const { db } = require('../db');
const ai = require('../services/ai');

/**
 * Sinh chủ đề mới (nếu kho chủ đề chưa dùng còn ít) rồi viết bài nháp cho các
 * chủ đề chưa dùng. Bài viết ra sẽ ở trạng thái "draft" chờ duyệt trên dashboard
 * (trừ khi AUTO_PUBLISH=true thì job publish sẽ tự đăng theo lịch).
 */
async function runContentGeneration({ topicsToGenerate = 5, postsToWrite = 1 } = {}) {
  const unusedCount = db.prepare('SELECT COUNT(*) AS c FROM topics WHERE used = 0').get().c;
  if (unusedCount < 3) {
    const topics = await ai.generateTopics(topicsToGenerate);
    const insert = db.prepare('INSERT INTO topics (title) VALUES (?)');
    for (const t of topics) insert.run(t);
  }

  const pending = db
    .prepare('SELECT * FROM topics WHERE used = 0 ORDER BY id ASC LIMIT ?')
    .all(postsToWrite);

  const created = [];
  for (const topic of pending) {
    const content = await ai.generatePost(topic.title);
    const info = db
      .prepare('INSERT INTO posts (topic, content, status) VALUES (?, ?, ?)')
      .run(topic.title, content, 'draft');
    db.prepare('UPDATE topics SET used = 1 WHERE id = ?').run(topic.id);
    created.push({ id: info.lastInsertRowid, topic: topic.title });
  }
  return created;
}

module.exports = { runContentGeneration };
