# 12. Component Design (React)

Cấu trúc Component sẽ tuân thủ nguyên tắc "Container / Presentational Component" và tái sử dụng code thông qua Custom Hooks.

## 1. Layouts
- `AdminLayout`: Chứa Header, User Info, Navigation Tabs. Hiển thị thông báo Global (Toasts/Modals).
- `StudentLayout`: Chứa Header đơn giản, dùng cho màn hình làm bài và xem kết quả.
- `AuthLayout`: Dành cho trang Login.

## 2. Core Components (Dùng chung)
- **UI Base**:
  - `Button`, `Input`, `Checkbox`, `Select`, `Modal`, `ToastProvider` (thay thế cho bento-toast cũ), `ConfirmDialog`.
  - `DataTable`: Hỗ trợ hiển thị dạng bảng (cho Exam, Question, Submissions), có phân trang hoặc sort cơ bản.
  - `Loader`: Thay thế cho `global-db-loader`.

## 3. Feature Components

### Admin / Exam Manager
- `ExamManagerPage`: Container chính chứa logic fetch/xoá/toggle exams.
- `ExamList`: Bảng hiển thị danh sách đề thi.
- `ExamFormModal`: Form tạo / sửa thông tin đề thi (tiêu đề, duration, shuffle,...).

### Admin / Question Manager
- `QuestionManagerPage`: Container.
- `QuestionList`: Bảng hiển thị câu hỏi, kéo thả sắp xếp (SortableJS / dnd-kit).
- `QuestionForm`: Động, form fields sẽ thay đổi phụ thuộc vào thuộc tính `type` của câu hỏi (MCQ có 4 input, Fill Blank có accepted_answers,...).
- `ImportQuestionsModal`: Giao diện Dropzone cho file Excel, preview kết quả và thông báo lỗi theo từng hàng.

### Admin / Results Manager
- `ResultsManagerPage`: Chứa danh sách Submissions.
- `SubmissionDetailModal`: Pop-up xem chi tiết (render lại các câu hỏi và đánh dấu đúng/sai tương tự màn hình Result của Student).
- `ManualReviewForm`: (Tính năng bổ sung dựa trên khoảng trống cũ) - Cập nhật điểm chấm tay.

### Student Portal
- `StudentStartForm`: Nhập tên / Lớp.
- `ExamPlayer`: Giao diện làm bài chính.
  - `ExamTimer`: Đếm ngược thời gian.
  - `QuestionCard`: Hiển thị 1 câu hỏi, tự động map theo type (`MCQQuestion`, `MatchingQuestion`, `ArrangeSentenceQuestion`).
  - `ExamNavigator`: Nút Next / Prev / Submit.
- `ResultSummary`: Hiển thị dashboard kết quả bài làm.
