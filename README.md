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

## 2. Kết nối Facebook Page (tự động, chỉ cần tạo App 1 lần)

Việc lấy Page Access Token đã được **tự động hoá** ngay trong dashboard — bạn không cần
vào Graph API Explorer hay tự đổi token thủ công nữa. Chỉ có **một bước duy nhất bắt buộc
phải tự làm** vì Meta yêu cầu xác thực bằng chính tài khoản Facebook của bạn: tạo App.

1. Vào https://developers.facebook.com/apps → **Create App** → chọn loại "Business".
2. Trong app, vào **Add Product** → thêm **Facebook Login for Business**.
3. Vào **Facebook Login → Settings**, thêm vào ô *Valid OAuth Redirect URIs*:
   `http://localhost:3000/connect/facebook/callback`
   (nếu bạn đổi `PORT` trong `.env` thì sửa số cổng trong URL này cho khớp).
4. Vào **App Settings → Basic**, copy **App ID** và **App Secret**, điền vào `.env`:
   ```
   FB_APP_ID=...
   FB_APP_SECRET=...
   ```
5. Khởi động lại phần mềm (`npm start` hoặc chạy lại `start.bat`).
6. Mở dashboard → vào tab **Kết nối Facebook** → bấm **"Kết nối với Facebook"** → đăng nhập
   Facebook bằng tài khoản admin của Page → cấp quyền quản lý Page. Xong! Hệ thống tự động
   lấy Page ID + Page Access Token (bản dài hạn, không hết hạn) và lưu lại, không cần thao
   tác gì thêm.

Nếu App đang ở chế độ Development, chỉ tài khoản có vai trò trong App (Admin/Editor/Tester)
mới đăng nhập được — đủ dùng cho một mình bạn quản lý Page của bạn. Để mời thêm nhân viên
khác cùng dùng, thêm họ vào vai trò **Tester** trong App, hoặc nộp **App Review** xin quyền
`pages_manage_posts` (Advanced Access) nếu muốn public app.

*(Muốn tự lấy token thủ công qua Graph API Explorer thay vì dùng nút "Kết nối Facebook"
thì vẫn được — chỉ cần điền `FB_PAGE_ID` và `FB_PAGE_ACCESS_TOKEN` trực tiếp vào `.env`.)*

## 3. Cấu hình AI viết nội dung

Chọn 1 trong 2 nhà cung cấp AI bằng biến `AI_PROVIDER` trong `.env` (chỉ cần điền API key
của bên bạn chọn dùng):

**Dùng Claude (mặc định, khuyến nghị chất lượng cao nhất):**
```
AI_PROVIDER=claude
ANTHROPIC_API_KEY=<lấy tại https://console.anthropic.com/>
```

**Dùng Gemini (có gói miễn phí):**
```
AI_PROVIDER=gemini
GEMINI_API_KEY=<lấy miễn phí tại https://aistudio.google.com/apikey>
```

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
