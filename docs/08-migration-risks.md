# Migration Risks

Khi chuyển đổi từ hệ thống cũ (Google Apps Script + Google Sheet + Vanilla JS) sang hệ thống mới, có một số rủi ro cần lưu ý:

## 1. Dữ liệu Đa hình (Polymorphic Data)
- Trường `correct_answer` trong sheet `Questions` lưu trữ nhiều định dạng khác nhau tùy theo `type` của câu hỏi. Ví dụ dạng "Matching" thì lưu JSON string. Khi chuyển sang PostgreSQL, cần thiết kế cột này là `JSONB` hoặc bảng liên kết rời để dễ xử lý, tránh lỗi parse.
- Trường `accepted_answers` cũng lưu theo dạng chuỗi cần parse sang mảng.

## 2. Dịch chuyển Logic Tính điểm (Grading Logic)
- Hiện tại, việc chấm điểm đang diễn ra 100% tại Frontend (`script.js`).
- Việc đưa logic tính điểm lên Backend để bảo mật hơn (tránh gian lận client-side) yêu cầu phải code lại chính xác các quy tắc chuẩn hoá chuỗi (`normalizeAnswer`), tính điểm tỷ lệ cho Matching. Nếu logic có sai lệch nhỏ so với hệ thống cũ, điểm của học sinh sẽ bị tính sai lệch.

## 3. Rủi ro về Soft Delete
- Hành động xóa Đề thi ở Code cũ đang làm thay đổi cờ `is_deleted = TRUE` ở `Exams` và tự động cập nhật cả sheet `Questions`.
- Cần chú ý trong hệ thống CSDL quan hệ:
  - Khi thực hiện soft-delete trên bảng mẹ (`exams`), có thể dùng JPA `@SQLDelete` và `@Where` hoặc thực hiện xoá cascade.
  - Tuy nhiên, dữ liệu ở `Submissions` và `SubmissionDetails` có thể không được đánh dấu xóa nhưng bị orphan. (Hệ thống cũ không thấy cascade delete cho Submissions khi xoá Exam).

## 4. Xử lý Timezone
- Google Apps Script sử dụng múi giờ GMT+7 được hardcode khi tự động sinh trường `created_at`.
- Khi chuyển đổi sang hệ thống mới (ví dụ Spring Boot / PostgreSQL), cần thống nhất lưu trữ chuẩn UTC trong DB, và chuyển đổi sang múi giờ hiển thị (GMT+7) ở Frontend.

## 5. Cập nhật Điểm Chấm Tay (Manual Review)
- Có cờ `need_manual_review` cho loại câu hỏi Short Answer. Nhưng trong GAS `Code.gs` chưa thấy hàm API nào để Update/Save điểm sau khi giáo viên chấm xong.
- Cần làm rõ xem logic này đã được code phía frontend hay chưa.
