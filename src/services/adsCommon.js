const store = require('../db');

// Dry-run mac dinh BAT (an toan) - chi khi nguoi dung chu dong tat trong Cai dat
// Ads thi cac ham tao/sua chien dich moi thuc su goi API va tieu tien that.
function isDryRun() {
  return store.getSetting('ADS_DRY_RUN', 'true') !== 'false';
}

function dailyBudgetCapVnd() {
  const cap = Number(store.getSetting('ADS_DAILY_BUDGET_CAP_VND', '0'));
  return Number.isFinite(cap) && cap > 0 ? cap : null;
}

function assertWithinBudgetCap(dailyBudgetVnd) {
  const cap = dailyBudgetCapVnd();
  if (cap && Number(dailyBudgetVnd) > cap) {
    throw new Error(
      `Ngân sách ${Number(dailyBudgetVnd).toLocaleString('vi-VN')}đ/ngày vượt trần an toàn ` +
        `${cap.toLocaleString('vi-VN')}đ/ngày đã cấu hình trong "Cài đặt Ads". Hãy giảm ngân sách ` +
        `hoặc tăng trần nếu bạn chắc chắn muốn chi nhiều hơn.`
    );
  }
}

module.exports = { isDryRun, dailyBudgetCapVnd, assertWithinBudgetCap };
