const cron = require('node-cron');
const { runContentGeneration } = require('./contentGen');
const { runPublishDue } = require('./publish');
const { runCommentScan } = require('./commentScan');
const { runAdsMonitor } = require('./adsMonitor');

function log(job, payload) {
  console.log(`[${new Date().toISOString()}] [${job}]`, JSON.stringify(payload));
}

function startScheduler() {
  const tz = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';

  // 08:00 mỗi ngày: sinh 1 bài nháp mới để duyệt/lên lịch.
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        const created = await runContentGeneration({ postsToWrite: 1 });
        log('content-gen', created);
      } catch (err) {
        log('content-gen-error', { error: err.message });
      }
    },
    { timezone: tz }
  );

  // Mỗi 5 phút: đăng các bài đã lên lịch tới hạn.
  cron.schedule(
    '*/5 * * * *',
    async () => {
      try {
        const results = await runPublishDue();
        if (results.length) log('publish', results);
      } catch (err) {
        log('publish-error', { error: err.message });
      }
    },
    { timezone: tz }
  );

  // Mỗi 10 phút: quét bình luận mới để phát hiện khách tiềm năng.
  cron.schedule(
    '*/10 * * * *',
    async () => {
      try {
        const leads = await runCommentScan();
        if (leads.length) log('comment-scan', leads);
      } catch (err) {
        log('comment-scan-error', { error: err.message });
      }
    },
    { timezone: tz }
  );

  // Mỗi 30 phút: quét hiệu suất chiến dịch Ads đang chạy, AI đề xuất tối ưu
  // (chỉ lưu đề xuất chờ duyệt trên dashboard, không tự động áp dụng).
  cron.schedule(
    '*/30 * * * *',
    async () => {
      try {
        const created = await runAdsMonitor();
        if (created.length) log('ads-monitor', created);
      } catch (err) {
        log('ads-monitor-error', { error: err.message });
      }
    },
    { timezone: tz }
  );

  console.log('Scheduler đã khởi động (timezone:', tz, ')');
}

module.exports = { startScheduler };
