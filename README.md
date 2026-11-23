# Kế hoạch đám cưới · Tự đồng bộ Google Sheets

Website tĩnh HTML/CSS/JavaScript chạy trên GitHub Pages. Dữ liệu lịch trình, checklist, công việc, nhóm khách, khách mời, ngân sách và cài đặt nằm ở bảy tab riêng trong một file Google Sheets do bạn sở hữu (ID khai báo trong `apps-script/Code.gs` và `sheet-config.js`).

**Sau lần cập nhật cột STT:** Bảy tab hiện có cột `STT` ở A và ID/khóa chuyển sang B. Bản Apps Script đã triển khai trước đó sẽ báo `Sai tiêu đề tab Cài đặt` cho đến khi bạn dán lại [apps-script/Code.gs](./apps-script/Code.gs) và chọn **Triển khai → Quản lý các bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai**. Giữ nguyên URL `/exec` và tải lại website sau khi triển khai.

## Tính năng chính

- **Ngày cưới** có thể để trống; website hiển thị "Đang chọn ngày lành" và ẩn đếm ngược cho tới khi bạn chọn ngày.
- **Ngân sách:** đặt tổng ngân sách mục tiêu (Cài đặt hoặc nút trong tab Ngân sách), thanh mức đã dùng và cảnh báo khi vượt; biểu đồ cơ cấu chi theo danh mục; so sánh dự trù và thực tế; lịch thanh toán (quá hạn, sắp đến hạn trong 14 ngày); bình quân mỗi khách và mỗi mâm; lọc theo trạng thái thanh toán và sắp xếp. "Dự kiến chi" của một khoản là giá thực tế nếu đã chốt, chưa có thì lấy dự trù.
- **Khách mời:** thống kê cơ cấu xác nhận và theo nhóm, theo dõi thiệp đã gửi (bấm biểu tượng gửi, hoặc đánh dấu cả nhóm), bộ lọc thiệp mời, sắp xếp A-Z, cảnh báo khách trùng tên/số điện thoại và bàn vượt sức chứa, liên kết Gọi/Zalo từ số điện thoại.

## Quy ước màu

Màu của thẻ số liệu, thẻ thống kê và nhãn trạng thái đi theo ý nghĩa, không theo vị trí: **xanh dương** = tổng/thông tin, **xanh mint** = hoàn thành/tốt, **vàng bơ** = đang chờ/cần theo dõi, **đỏ nhạt** = quá hạn/vượt/rủi ro, **lavender** = tiến độ và số thực tế, **be** = trung tính. Hồng chỉ dùng làm màu nhấn của thương hiệu (ngày cưới, nhóm khách). Thẻ "Quá hạn" tự chuyển xanh mint khi không còn việc quá hạn.

## Cấu trúc mã

| Tệp | Vai trò |
|---|---|
| `index.html`, `styles.css` | Trang và giao diện |
| `app.js` | Giao diện, trạng thái, xử lý thao tác |
| `stats.js` | Thống kê ngân sách và khách mời (thuần, có test) |
| `charts.js` | Biểu đồ SVG/HTML, không thư viện (thuần, có test) |
| `xlsx.js` | Xuất/nhập Excel XLSX và CSV (có test) |
| `sheet-schema.js`, `sheet-sync.js`, `sheet-config.js` | Sơ đồ dữ liệu và đồng bộ Google Sheets |
| `apps-script/Code.gs` | Mã dán vào Apps Script |
| `tests/` | Kiểm thử Node.js, chạy bằng `npm test` (không cần cài gói) |

Mục tiêu ngân sách được lưu trong tab `Cài đặt` của Sheet (khóa `budgetTarget`), không đổi cấu trúc các tab; không cần cập nhật Apps Script cho tính năng này. `.github/workflows/test.yml` tự chạy `npm test` mỗi khi đẩy mã lên GitHub (token đẩy mã cần quyền **Workflows: Read and write** để cập nhật tệp này).

## Đặt mật khẩu truy cập (bắt buộc)

Apps Script từ chối mọi yêu cầu nếu chưa đặt mật khẩu. Mật khẩu không nằm trong mã GitHub.

1. Trong Apps Script: **Project Settings (⚙) → Script Properties → Add script property**.
2. Khóa `WEB_PASSWORD`, giá trị là mật khẩu tối thiểu 8 ký tự. Lưu.
3. Dán lại [apps-script/Code.gs](./apps-script/Code.gs) và **Triển khai → Quản lý các bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai**.
4. **Link riêng:** `https://<tài-khoản>.github.io/<repo>/#k=MẬT_KHẨU`. Lần đầu mở link này trên một thiết bị, website lưu mật khẩu vào trình duyệt, xóa nó khỏi thanh địa chỉ rồi tự đồng bộ. Các lần sau mở link thường (không có `#k=`) là vào luôn. Nếu mật khẩu có ký tự đặc biệt (`&`, `#`, `%`, khoảng trắng, chữ có dấu), hãy mã hóa bằng `encodeURIComponent` (hoặc dùng mật khẩu chỉ gồm chữ và số). Phần sau dấu `#` không được gửi lên máy chủ và không nằm trong repo; đừng đăng link riêng lên nơi công khai. Mở link thường trên thiết bị mới sẽ chỉ báo "Cần mở link riêng". Đổi mật khẩu bằng cách sửa Script Property rồi tạo link riêng mới; thiết bị cũ sẽ bị từ chối cho tới khi mở link mới.

Mật khẩu đi kèm mỗi yêu cầu đọc dưới dạng tham số URL nên có thể xuất hiện trong nhật ký của Google. Đây là mức bảo vệ cho trang gia đình, không thay thế đăng nhập thật. Đừng dùng lại mật khẩu quan trọng.

## Thiết lập một lần bằng tài khoản sở hữu Sheet

1. Mở file Google Sheets của bạn bằng tài khoản có quyền chỉnh sửa. Vào **Tiện ích mở rộng → Apps Script**. Xóa mã mẫu trong `Code.gs`, rồi dán toàn bộ nội dung tệp [apps-script/Code.gs](./apps-script/Code.gs). Lưu dự án.
2. Trong Apps Script, chọn **Triển khai → Triển khai mới → Ứng dụng web**. Chọn **Thực thi với tư cách: Tôi** và **Ai có quyền truy cập: Bất kỳ ai** (không chọn mục bắt buộc có Tài khoản Google). Nhấn **Triển khai**, cấp quyền cho chính tài khoản sở hữu Sheet nếu Google yêu cầu.
3. Sao chép **URL ứng dụng web** kết thúc bằng `/exec`. Dán vào `webAppUrl` trong [sheet-config.js](./sheet-config.js). Không dùng URL thử nghiệm kết thúc bằng `/dev`.
4. Chạy `http://127.0.0.1:5500/` bằng Live Server rồi mở tab ẩn danh. Trang sẽ tự tải Sheet. Thử thêm một công việc và kiểm tra tab `Công việc` trong Sheet. Khi dòng trạng thái báo **Đã đồng bộ Google Sheets**, bản ghi đã được đọc lại và xác nhận. Không cần đăng nhập Google trên website.
5. Đưa `index.html`, `styles.css`, `app.js`, `sheet-config.js`, `sheet-schema.js`, `sheet-sync.js` lên cùng một nhánh GitHub. Vào **Settings → Pages → Deploy from a branch**, chọn nhánh chính và thư mục `/ (root)`. Mở URL Pages để thử tiếp. Apps Script không cần thêm GitHub Pages vào OAuth origins.

Nếu sửa mã Apps Script sau khi triển khai, vào **Triển khai → Quản lý các bản triển khai → Chỉnh sửa → Phiên bản mới → Triển khai** để URL `/exec` dùng mã mới.

## Cách đồng bộ

- Mở trang: website tự tải toàn bộ bảy tab từ Sheet. Mỗi lần thêm, sửa, xóa hoặc đánh dấu, website lưu trên máy rồi tự gửi các tab thay đổi lên Sheet. Trạng thái góc phải cho biết đang gửi, đã xác nhận hoặc có lỗi.
- Nếu sửa trực tiếp trên Sheet trong lúc website đang mở, dùng **Cài đặt → Tải từ Sheets** trước khi tiếp tục. Nếu cùng một tab thay đổi trên Sheet, website giữ thay đổi trên máy và báo xung đột; bạn có thể tải lại hoặc chủ động dùng **Ghi dữ liệu máy lên Sheets**.
- Cột `STT` ở A được tự đánh số theo các dòng có ID/khóa ở B, kể cả khi thêm dòng trực tiếp trong Sheet. Đây chỉ là số để xem; không dùng STT thay cho ID và không sửa công thức trong cột A. ID cũ và các liên kết `ID sự kiện`, `ID nhóm` được giữ nguyên.
- Lần đầu chuyển từ phiên bản OAuth cũ: nếu dữ liệu trong trình duyệt khác Sheet, website hỏi giữ dữ liệu máy và ghi lên Sheet hay lấy dữ liệu Sheet. Hãy xuất JSON trước nếu cần bản sao lưu.
- Nút **Sửa tên và ngày cưới** ở góc phải trên cập nhật tên, ngày, số ngày đếm ngược và phần cài đặt. Ngày của từng sự kiện và hạn công việc giữ nguyên.
- Khi URL Apps Script còn trống, dịch vụ không hoạt động hoặc Apps Script chưa triển khai phiên bản mới, website vẫn lưu trên trình duyệt nhưng **chưa ghi lên Sheet**. Không coi dòng trạng thái này là đã đồng bộ.
- Website không tự nhận các thay đổi từ Sheet trong lúc trang đang mở; dùng **Tải từ Sheets**. Khi nhiều người sửa cùng một tab gần nhau, một người có thể phải tải lại và nhập lại thay đổi.

## Quyền truy cập và dữ liệu cá nhân

Chế độ **Bất kỳ ai**, chạy bằng quyền chủ Sheet, nghĩa là ai biết URL Apps Script **và mật khẩu `WEB_PASSWORD`** mới đọc/sửa được dữ liệu của bảy tab. URL nằm trong mã GitHub công khai và không phải khóa bí mật; mật khẩu mới là khóa. Không nhập thông tin riêng tư của khách nếu bạn không chấp nhận mức công khai này. Sao lưu Sheet hoặc xuất JSON định kỳ. Muốn hạn chế người sửa, cần thêm xác thực và máy chủ có kiểm soát quyền; GitHub Pages thuần tĩnh không thể giấu khóa ghi một cách an toàn.

Mã Apps Script cố định ID Sheet, chỉ cho phép bảy tab, kiểm tra cấu trúc và giới hạn kích thước yêu cầu; những giới hạn này không ngăn người khác cố ý sửa hoặc xóa dữ liệu trong phạm vi đã mở công khai. Không đăng khóa dịch vụ, client secret hay access token vào GitHub.

## Kiểm thử và sao lưu

Chạy `npm test` (hoặc từng tệp trong `tests/` bằng `node`) để kiểm tra mã không cần tài khoản Google. `tests/render-test.cjs` dựng giao diện với DOM giả để bắt lỗi hiển thị, nhưng không thay thế việc thử trên trình duyệt thật. Kiểm thử thật với Google Sheets chỉ thực hiện được sau khi bạn triển khai Apps Script và điền URL `/exec`.

Trong **Cài đặt**, bạn có thể xuất/khôi phục JSON và đặt lại dữ liệu. Các mục vẫn hỗ trợ xuất Excel/CSV; khách mời hỗ trợ nhập Excel/CSV. Khi sửa trực tiếp trong Sheet, giữ nguyên hàng tiêu đề và cột ID; ngày dùng `YYYY-MM-DD`, giờ `HH:MM`.
