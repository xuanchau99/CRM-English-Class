# Business Rules

Hệ thống có các quy tắc nghiệp vụ quan trọng về tính điểm (Grading) và Data Validation.

## 1. Validation Rules
- **Đề thi**: Mã đề thi (`exam_id`) phải là duy nhất.
- **Câu hỏi**: `question_id` phải là duy nhất trong cùng một `exam_id`.
- **Import Câu hỏi**: Bắt buộc phải có `question_id`, `exam_id`, `type`. Trường `correct_answer` bắt buộc với các dạng trắc nghiệm, điền khuyết; có thể tuỳ chọn ở dạng short answer.
- **Bài nộp (Submission)**: `submission_id` là duy nhất.

## 2. Auto Grading Engine (Tính điểm tự động)
Hệ thống tính điểm tự động bằng Frontend (JavaScript) thông qua hàm `EnglishExamUtils.gradeExam()` và chuẩn hoá bằng `normalizeAnswer`.
- **Normalization (`normalizeAnswer`)**: Xoá bỏ khoảng trắng thừa đầu cuối, đưa về chữ thường (lowercase), loại bỏ các dấu câu ở cuối câu (`.`, `?`, `!`).
- **MCQ / Single Choice / True False**: Khớp chính xác 100% (sau khi normalize) với `correct_answer`. Nhận full điểm, sai nhận 0.
- **Fill in the Blank**: Chấp nhận đáp án nếu giống `correct_answer` hoặc nằm trong mảng `accepted_answers`. (Tính điểm tuyệt đối).
- **Arrange Sentence**: Xử lý khớp chuỗi sau khi loại bỏ dấu cách thừa, dấu câu.
- **Matching (Nối từ)**: Tính điểm theo tỷ lệ. Ví dụ có 4 cặp, học sinh nối đúng 2 cặp sẽ được 50% số điểm của câu đó (Proportional matching credit). Data `correct_answer` được lưu dạng chuỗi JSON `{"key":"value"}`.
- **Short Answer**: Không chấm tự động, mặc định gán điểm là 0 và gán cờ `need_manual_review = TRUE`. Giáo viên phải chấm bằng tay.

## 3. Quản lý trạng thái làm bài (Draft / Caching)
- Khi học sinh đang làm bài, dữ liệu (answers, current index, thời gian còn lại) được lưu định kỳ xuống `localStorage` theo key `exam_draft_ID`.
- Tránh việc mất kết nối hay reload trang gây mất bài.

## 4. Concurrency & Fallback
- Nếu API endpoint (GAS) bị lỗi, hệ thống tự động fallback sang lưu trữ ở Local Storage (`mock_db`), giúp ứng dụng tiếp tục hoạt động offline.
