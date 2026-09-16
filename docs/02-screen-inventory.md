# Screen Inventory

Danh sách các màn hình (screens/views) trong hệ thống, được xử lý chủ yếu thông qua việc thay đổi DOM trong `index.html` và `student.html`.

## Teacher Panel (`index.html`)
- **Login Screen**: Màn hình đăng nhập dành cho giáo viên.
- **Admin Dashboard**: Chứa các tab quản lý.
  - **Tab - Exam Manager**: Danh sách đề thi, form tạo/sửa đề thi.
  - **Tab - Question Manager**: Giao diện chọn đề thi để xem câu hỏi, danh sách câu hỏi, form thêm/sửa câu hỏi, popup Import.
  - **Tab - Results Manager**: Danh sách bài thi học sinh, popup xem chi tiết kết quả.
  - **Tab - Game Manager**: Danh sách game, form thêm/sửa game.
- **Settings Screen**: Cấu hình AI API Keys, cấu hình Database Fallback (Mock DB).
- **Guide Screen**: Xem tài liệu hướng dẫn sử dụng.

## Student Portal (`student.html`)
- **Student Start Screen**: Form điền thông tin (Tên, Lớp) trước khi bắt đầu.
- **Exam Interface**: Màn hình làm bài chứa câu hỏi, progress bar, timer, các nút điều hướng (Next, Prev, Submit).
- **Result Summary Screen**: Màn hình hiển thị sau khi nộp bài chứa điểm, số câu đúng/sai, chi tiết từng câu hỏi.

## Testing
- **Automated Test Dashboard** (`test.html`): Bảng tóm tắt kết quả chạy test.
