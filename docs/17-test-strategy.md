# 17. Test Strategy

Chiến lược kiểm thử để đảm bảo hệ thống mới hoạt động chính xác 100% so với logic nghiệp vụ cũ.

## 1. Unit Testing (Vitest)
- **Logic Tính điểm**: Test kỹ hàm `normalizeAnswer` và các hàm tính điểm (MCQ, Matching, Arrange Sentence). Đảm bảo kết quả chuẩn hoá của chuỗi nhập vào giống hệt logic JS cũ.
- **Form Validators**: Kiểm thử các schema validation (Zod / Yup) khi Import file Excel (bắt lỗi thiếu ID, trùng lặp).

## 2. Integration Testing (React Testing Library)
- **Component Rendering**: Kiểm tra các component UI phức tạp như `ExamPlayer`, `QuestionForm` render đúng tuỳ thuộc vào `type` của câu hỏi.
- **Routing**: Đảm bảo điều hướng đúng nếu User chưa login (đẩy về `/login`) và đã login.

## 3. Database Testing (Supabase / pgTAP)
- **RLS Policies**: Viết bài test giả lập các roles (Teacher A, Teacher B, Anonymous) để thử `SELECT/INSERT/UPDATE` dữ liệu, đảm bảo không xem/sửa chéo dữ liệu của nhau.
- **RPC `submit_exam_result`**: Test tính nguyên tử của giao dịch (transaction) nộp bài.

## 4. End-to-End (E2E) Testing (Playwright)
Giả lập luồng người dùng thực:
1. Teacher đăng nhập -> Tạo đề thi -> Thêm 1 câu hỏi MCQ.
2. Student truy cập link đề thi -> Làm bài -> Nộp bài.
3. Teacher mở Results Manager kiểm tra điểm.

## 5. Đối chiếu Dữ liệu (Reconciliation)
- So sánh ngẫu nhiên 50 bài nộp cũ (trên Google Sheet) với dữ liệu mới import.
- Chạy lại Auto Grading Engine trên DB mới với `student_answer` cũ, đối chiếu `points_earned` để đảm bảo sai số = 0.
