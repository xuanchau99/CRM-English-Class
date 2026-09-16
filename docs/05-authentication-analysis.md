# Authentication Analysis

## Hiện tại (Google Apps Script)
- **Lưu trữ User**: Bảng `Teachers` (username, password, name, phone).
- **Mã hoá Password**: Hiện tại lưu trữ **Plain-text** (không mã hoá). Hàm `loginTeacher` so sánh chuỗi nguyên bản.
- **Xác thực phiên (Session)**: Frontend sau khi nhận response đăng nhập thành công sẽ lưu user object vào `sessionStorage('teacher_session')`. Không sử dụng cookie hay JWT.
- **Bảo vệ API (API Protection)**:
  - Tất cả các endpoint (`doGet`, `doPost`) đều là **Public**, ai biết URL cũng có thể gọi được.
  - Các hàm sửa, xoá (saveExam, deleteQuestion, etc.) đều không yêu cầu token hay credentials. Chỉ dựa vào frontend tự block nếu không có `sessionStorage`.
  - Một số hàm (vd `getExams`) có lọc theo `teacherId` gửi lên từ tham số, nhưng không xác thực xem `teacherId` đó có đúng của user đang request hay không.

## Đề xuất Migration (Backend Mới)
- **Lưu trữ**: Chuyển table sang PostgreSQL `users`.
- **Mã hoá**: Cần migrate mật khẩu cũ (tạo script hash mật khẩu plaintext thành bcrypt hoặc một cơ chế hash chuẩn).
- **Session/Token**: Chuyển sang sử dụng **JWT (JSON Web Token)** để bảo mật state. JWT được trả về khi login và lưu tại `localStorage` hoặc `HttpOnly Cookie`.
- **API Protection**: Sử dụng Spring Security để chặn mọi request sửa đổi (POST/PUT/DELETE) nếu không có valid JWT. Thêm Role-based access control (RBAC) nếu cần phân biệt Admin và Teacher.
- **Multi-tenant / Data Isolation**: Các request lấy đề thi cần lọc bắt buộc theo `userId` (Teacher) từ JWT, chứ không phải lấy từ parameter truyền lên.
