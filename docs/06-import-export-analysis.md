# Import / Export Analysis

## 1. Cơ chế Import
- **Nguồn dữ liệu**: File Excel (`.xlsx`) hoặc CSV.
- **Thư viện sử dụng (Frontend)**: `xlsx` (SheetJS)
- **Luồng xử lý**:
  1. Người dùng chọn file Excel.
  2. Javascript đọc file qua `FileReader` và dùng thư viện `xlsx` để chuyển đổi sang JSON mảng (Array of Objects).
  3. Frontend sẽ thực hiện validation trực tiếp:
     - Gọi hàm `validateQuestionRow` (được tìm thấy trong `test.html`).
     - Kiểm tra bắt buộc các trường `question_id`, `exam_id`, `type`, v.v.
     - Kiểm tra Duplicate ID trong cùng file.
  4. Nếu hợp lệ, danh sách JSON được gửi lên Backend qua endpoint `doPost` (action=`importQuestions`).
  5. Backend thực hiện lại các bước validation (để đảm bảo không có duplicate ID trong DB).
  6. Backend Append vào Google Sheet (từng dòng thông qua một vòng lặp).

## 2. Cơ chế Export
- Chưa thấy tính năng gọi rõ API export ở Backend (không có action=`exportExams`).
- Khả năng hệ thống thực hiện export phía Frontend bằng cách gọi hàm fetch danh sách câu hỏi từ `getQuestions`, sau đó dùng thư viện `xlsx` để build file Excel ngay trên trình duyệt và cho user tải về.
- Cần review lại file `script.js` chi tiết để khẳng định chắc chắn (TODO_REVIEW).

## 3. Rủi ro của cơ chế hiện tại
- **Hiệu năng Insert**: Apps Script `appendRow` trong vòng lặp rất chậm. Nếu file có 100 câu, nó tốn rất nhiều API calls tới Google Sheet => Rate Limit, Timeout.
- **Data Parsing**: Phụ thuộc nhiều vào Frontend parse kiểu Boolean hoặc Chuỗi (ví dụ `accepted_answers`).

## 4. Đề xuất Migration
- **Backend xử lý**: Client chỉ tải file lên Backend (Multipart file).
- Backend (Spring Boot/Node.js) sử dụng thư viện (Apache POI) đọc file Excel.
- Validate hàng loạt và Insert batch (Sử dụng `saveAll` trong JPA hoặc JDBC Batch Insert) giúp tăng hiệu năng rõ rệt.
- Trả về danh sách lỗi cụ thể theo dòng nếu validation thất bại.
