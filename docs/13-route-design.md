# 13. Route Design

Sử dụng React Router DOM để quản lý các tuyến đường.

## Auth Routes
- `/login`: Màn hình đăng nhập. Nếu đã có session, tự động redirect về `/admin`.

## Admin Routes (Bảo vệ bởi AuthGuard / PrivateRoute)
Các Route này dùng chung `AdminLayout`.
- `/admin`: Redirect đến `/admin/exams`.
- `/admin/exams`: Quản lý danh sách Đề thi (Tương đương Tab Exam Manager cũ).
- `/admin/exams/:examId/questions`: Quản lý câu hỏi cho một đề thi cụ thể.
- `/admin/results`: Quản lý danh sách Bài nộp (Tab Results Manager).
- `/admin/results/:submissionId`: Xem chi tiết bài nộp.
- `/admin/games`: Quản lý Games.
- `/admin/settings`: Cài đặt hệ thống (AI Keys).

## Student Routes (Public hoặc Pseudo-Auth)
Các Route này dùng chung `StudentLayout`.
- `/exam/:examId/start`: Màn hình nhập Tên / Lớp để bắt đầu thi.
- `/exam/:examId/take`: Màn hình làm bài (Yêu cầu phải có thông tin Tên/Lớp trong context hoặc LocalStorage / Session).
- `/result/:submissionId`: Xem kết quả tổng quan và chi tiết bài thi sau khi nộp.
