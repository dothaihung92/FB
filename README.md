# FB AI Page Manager

Phần mềm AI tự động **viết & đăng bài content marketing** cho Facebook Page, **quản lý
bài viết** qua dashboard web, và **tự động phát hiện + trả lời khách hàng tiềm năng**
(chủ công ty/hộ kinh doanh cần dịch vụ kế toán) qua bình luận.

Toàn bộ tương tác với Facebook đi qua **Graph API chính thức** (không scrape dữ liệu
cá nhân, không spam hàng loạt) — an toàn với chính sách của Meta và tránh rủi ro khoá Page.

## Tính năng

- 🧠 AI (Claude) tự động đề xuất chủ đề và viết bài đăng nhắm đúng đối tượng chủ DN/HKD.
- 📅 Dashboard duyệt/sửa bài nháp, lên lịch đăng, hoặc đăng ngay lên Page.
- ⏱ Cron job tự động: sinh bài mới mỗi sáng, đăng bài đúng lịch, quét bình luận mới.
- 💬 AI đọc bình luận mới, chấm điểm mức độ tiềm năng (0-100), gợi ý câu trả lời,
  tự động phản hồi những bình luận có khả năng là khách hàng thật.
- 🔒 Không thu thập/scrape thông tin cá nhân của người dùng khác — chỉ ghi nhận thông tin
  liên hệ mà khách **tự nguyện để lại** trong bình luận công khai trên Page của bạn.

## 1. Cài đặt

```bash
npm install
cp .env.example .env
```

## 2. Lấy Facebook Page Access Token

1. Vào https://developers.facebook.com/apps → **Create App** → chọn loại "Business".
2. Trong app, thêm sản phẩm **Facebook Login for Business**.
3. Vào **Graph API Explorer** (https://developers.facebook.com/tools/explorer/):
   - Chọn App vừa tạo.
   - Chọn "User Token" → cấp quyền: `pages_show_list`, `pages_manage_posts`,
     `pages_read_engagement`, `pages_read_user_content` (thêm `pages_messaging` nếu muốn
     trả lời Messenger).
   - Bấm "Generate Access Token", đăng nhập bằng tài khoản admin của Page.
4. Đổi User Token vừa lấy sang **Page Access Token**:
   `GET /me/accounts?access_token=<USER_TOKEN>` → lấy `access_token` ứng với Page của bạn.
5. (Khuyến nghị) Đổi sang token dài hạn (không hết hạn) bằng cách trước tiên đổi User Token
   sang long-lived token:
   `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<USER_TOKEN>`
   rồi lặp lại bước 4 với long-lived user token — Page token lấy được sẽ không hết hạn
   miễn Page vẫn còn active và app chưa bị thu hồi quyền.
6. Điền vào `.env`:
   ```
   FB_PAGE_ID=...
   FB_PAGE_ACCESS_TOKEN=...
   FB_APP_ID=...
   FB_APP_SECRET=...
   ```
7. Nếu App đang ở chế độ Development, chỉ tài khoản có vai trò trong App (Admin/Editor/Tester)
   mới dùng được. Để dùng cho Page thật với người ngoài, cần nộp **App Review** xin quyền
   `pages_manage_posts` (Advanced Access) — Meta sẽ yêu cầu quay video demo mô tả cách app dùng
   quyền này.

## 3. Cấu hình Claude API (sinh nội dung AI)

Lấy API key tại https://console.anthropic.com/ rồi điền `ANTHROPIC_API_KEY` vào `.env`.

## 4. Chạy ứng dụng

```bash
npm start
```

Mở trình duyệt: `http://localhost:3000` (đăng nhập bằng `DASHBOARD_USER`/`DASHBOARD_PASSWORD`
đã cấu hình trong `.env`).

## 5. Luồng hoạt động

1. Mỗi sáng 8h (giờ VN), hệ thống tự sinh 1 bài nháp mới (chủ đề xoay quanh thuế/kế toán/HKD).
2. Bạn vào tab **Bài viết** để duyệt, sửa nội dung, rồi bấm **Lên lịch đăng** hoặc **Đăng ngay**.
3. Mỗi 5 phút, hệ thống tự đăng các bài đã tới giờ lên lịch.
4. Mỗi 10 phút, hệ thống quét bình luận mới trên các bài gần đây, dùng AI chấm điểm tiềm năng
   và tự trả lời (mời khách inbox tư vấn) nếu `AUTO_REPLY_COMMENTS=true`.
5. Vào tab **Khách tiềm năng** để xem danh sách, ưu tiên liên hệ những người điểm cao nhất.

## Giới hạn & lưu ý quan trọng

- Đây là công cụ **content marketing + CRM nhẹ**, không phải công cụ "kéo view ảo" hay bot
  tương tác giả — những kỹ thuật đó vi phạm chính sách Facebook và có thể khiến Page bị khoá.
  Cách bền vững để "kéo khách" là nội dung đều đặn, đúng trọng tâm + phản hồi nhanh, chuyên nghiệp.
  Chỉ nên gọi API tối đa vài chục request/giờ (dùng cho 1 Page) — không cấu hình chạy dồn dập.
- Không tự động nhắn tin hàng loạt (cold message) tới người lạ — vi phạm chính sách Messenger
  Platform và Luật An ninh mạng/bảo vệ dữ liệu cá nhân nếu không có sự đồng ý.
- File dữ liệu nằm ở `data/store.json` (định dạng JSON đơn giản, không dùng module
  native nên không cần biên dịch/cài thêm gì trên Windows) — nên backup định kỳ.
