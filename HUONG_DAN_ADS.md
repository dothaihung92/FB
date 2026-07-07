# Hướng dẫn thiết lập module Quảng cáo AI (Facebook Ads + Google Ads)

Module "Quảng cáo" (tab **Quảng cáo** trên dashboard) giúp AI đề xuất từ khoá + nội dung
quảng cáo, bạn duyệt rồi mới đẩy chiến dịch lên Facebook Ads/Google Ads (luôn ở trạng thái
**tạm dừng** — bạn tự bật khi sẵn sàng). Vì đây là tài khoản quảng cáo/thanh toán của riêng
bạn, có vài bước **chỉ bạn tự làm được** (Meta/Google yêu cầu xác thực danh tính cá nhân/doanh
nghiệp), phần mềm không thể làm thay.

**An toàn:** mặc định `ADS_DRY_RUN = true` — mọi lần bấm "Duyệt & đẩy lên" chỉ mô phỏng, không
tốn tiền, không cần tài khoản Ads thật vẫn dùng thử được toàn bộ luồng. Chỉ tắt trong tab
**Cài đặt AI → Cài đặt Ads** khi bạn đã có token thật và muốn chạy quảng cáo thật.

## Phần 1 — Facebook Ads

### 1. Nâng quyền App đã tạo (ở bước "Kết nối Facebook")
App bạn đã tạo trước đó (README, mục 2) chỉ có quyền đăng bài. Để dùng Marketing API cần thêm
2 quyền: `ads_management`, `ads_read`.
1. Vào https://developers.facebook.com/apps → chọn App của bạn.
2. Vào **App Review → Permissions and Features**, tìm `ads_management` và `ads_read`.
3. Ở chế độ Development, các quyền này dùng được ngay cho Admin/Editor/Tester của App (đủ cho
   một mình bạn quản lý tài khoản Ads của bạn). Muốn public cho người khác dùng thì cần nộp
   **App Review** + **Business Verification** (xác minh doanh nghiệp) — quy trình của Meta,
   thường mất vài ngày, mình không thể làm thay.

### 2. Lấy Ad Account ID
1. Vào https://business.facebook.com → **Cài đặt doanh nghiệp → Tài khoản → Tài khoản quảng cáo**.
2. Copy ID tài khoản quảng cáo (dạng số, VD `123456789`) → điền vào ô **Ad Account ID** trong
   dashboard (có hoặc không tiền tố `act_` đều được).

### 3. Lấy Access Token có quyền Ads
Khuyến nghị dùng **System User Token** (không hết hạn, phù hợp chạy nền tự động) thay vì token
cá nhân (hết hạn sau ~60 ngày):
1. **Cài đặt doanh nghiệp → Người dùng → Người dùng hệ thống** → Tạo mới (vai trò Admin).
2. Gán quyền vào Ad Account tương ứng.
3. Bấm **Tạo Token**, chọn App của bạn, tick quyền `ads_management`, `ads_read`.
4. Copy token → dán vào ô **Access Token** trong dashboard.

### 4. Cài Meta Pixel lên website (để retarget)
1. **Trình quản lý sự kiện (Events Manager)** → **Kết nối nguồn dữ liệu** → **Web** → tạo Pixel mới.
2. Copy **Pixel ID** → điền vào ô **Pixel ID** trong dashboard.
3. Dán đoạn code Pixel (Meta cung cấp sẵn đoạn `<script>`) vào phần `<head>` của **mọi trang**
   trên website của bạn — đây là code của website, nằm ngoài phần mềm này, bạn tự dán hoặc nhờ
   người quản trị website dán giúp.
4. Sau khi có traffic, phần mềm sẽ tạo được **Website Custom Audience** để chạy chiến dịch
   retargeting (người đã ghé site sẽ thấy lại quảng cáo của bạn trên Facebook).

## Phần 2 — Google Ads

### 1. Tạo tài khoản Google Ads
Nếu chưa có: vào https://ads.google.com → tạo tài khoản, liên kết phương thức thanh toán.

### 2. Xin Developer Token
1. Vào https://ads.google.com → **Tools & Settings → API Center** (cần tài khoản Google Ads,
   khuyến nghị dùng Manager Account/MCC).
2. Đăng ký Developer Token. Mức **Test Account** dùng được ngay (chỉ chạy được trên tài khoản
   test, không tiêu tiền thật) — dùng để thử nghiệm luồng trước. Mức **Basic/Standard** (chạy
   tài khoản thật) cần Google duyệt hồ sơ, thường mất vài ngày — **bạn tự nộp đơn**, mình không
   thể duyệt thay.
3. Copy Developer Token → điền vào dashboard.

### 3. Tạo OAuth Client (Google Cloud Console)
1. Vào https://console.cloud.google.com → tạo Project mới (hoặc dùng project có sẵn).
2. **APIs & Services → Library** → bật **Google Ads API**.
3. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** → loại
   "Desktop app" (đơn giản nhất cho việc lấy refresh token 1 lần).
4. Copy **Client ID** và **Client Secret** → điền vào dashboard.

### 4. Lấy Refresh Token (làm 1 lần)
Cách đơn giản nhất là dùng **Google OAuth 2.0 Playground**:
1. Vào https://developers.google.com/oauthplayground
2. Bấm biểu tượng ⚙️ (Settings) → tick **"Use your own OAuth credentials"** → dán Client ID/Secret
   vừa tạo ở bước 3.
3. Ở khung bên trái, dán scope: `https://www.googleapis.com/auth/adwords` → **Authorize APIs** →
   đăng nhập bằng tài khoản Google Ads của bạn → **Exchange authorization code for tokens**.
4. Copy **Refresh token** → điền vào dashboard.

### 5. Lấy Customer ID
Trong tài khoản Google Ads, số ID hiện ở góc trên bên phải (dạng `123-456-7890`) → điền vào ô
**Customer ID**. Nếu bạn quản lý qua **Manager Account (MCC)**, điền thêm ID của MCC vào ô
**Login Customer ID**.

### 6. Cài Google Tag lên website (để remarketing)
Tương tự Pixel: **Google Ads → Tools → Audience Manager → Your data sources → Google Ads tag** →
lấy đoạn code, dán vào mọi trang trên website (ngoài phạm vi phần mềm này).

## Phần 3 — Bắt đầu dùng

1. Điền đầy đủ thông tin ở trên vào **Cài đặt AI → Cài đặt Ads**, đặt sẵn **trần ngân sách/ngày**
   để AI không bao giờ đề xuất vượt mức bạn cho phép.
2. Vào tab **Quảng cáo** → bấm **"Sinh đề xuất"** → xem AI đề xuất từ khoá + nội dung → sửa nếu
   cần → **"Duyệt & đẩy lên"**. Vì `ADS_DRY_RUN` vẫn đang bật, bước này chỉ mô phỏng — kiểm tra kỹ
   toàn bộ luồng trước.
3. Khi đã sẵn sàng chạy thật: vào **Cài đặt Ads**, tick "Tắt chế độ mô phỏng", lưu lại. Từ giờ,
   "Duyệt & đẩy lên" sẽ tạo chiến dịch thật (ở trạng thái **tạm dừng**) trên Ads Manager/Google
   Ads — bạn vào đó tự bật khi đã kiểm tra ngân sách/đối tượng đúng ý.
4. Khuyến nghị bắt đầu với ngân sách rất nhỏ (VD 50.000–100.000đ/ngày) trong 1–2 tuần đầu để
   kiểm tra hiệu quả trước khi mở rộng.

## Lưu ý an toàn quan trọng
- Phần mềm **không bao giờ tự động chi tiền** — mọi chiến dịch được tạo ở trạng thái tạm dừng,
  mọi đề xuất tối ưu (đổi ngân sách, tắt từ khoá) đều cần bạn duyệt thủ công.
- Access token/API key được lưu ở dạng văn bản thường trong `data/store.json` (giống các API key
  AI khác của phần mềm này) — không chia sẻ file này, backup cẩn thận.
- Không dùng phần mềm này để chạy quảng cáo/nội dung sai sự thật về dịch vụ kế toán — vi phạm
  chính sách quảng cáo của cả Meta và Google và có thể bị khoá tài khoản.
