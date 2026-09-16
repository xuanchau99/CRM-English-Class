# 14. Role Permission Matrix (RLS)

Dựa trên nghiệp vụ, hệ thống cần tối thiểu các Roles sau:
1. **Teacher**: Người ra đề (Tương đương Admin cũ). Quản lý dữ liệu của chính mình tạo ra.
2. **Student**: Người học (Không có tài khoản Supabase Auth, hoạt động ở chế độ Anonymous).

Sử dụng Postgres Row Level Security (RLS) để phân quyền.

| Bảng (Resource) | Role | Select | Insert | Update | Delete | Điều kiện (Policy) |
| --- | --- | --- | --- | --- | --- | --- |
| `exams` | Teacher | Yes | Yes | Yes | Yes (Soft) | `auth.uid() = teacher_id` |
| | Student | Yes | No | No | No | `is_active = true AND is_deleted = false` |
| `questions` | Teacher | Yes | Yes | Yes | Yes (Soft) | Thuộc `exam` mà teacher sở hữu. |
| | Student | Yes | No | No | No | Thuộc `exam` hợp lệ. |
| `submissions` | Teacher | Yes | No | Yes (Chấm tay)| Yes (Soft) | Thuộc `exam` mà teacher sở hữu. |
| | Student | Yes | Yes | No | No | Chỉ SELECT / INSERT bài của chính mình (kiểm tra qua `submission_code` trên session). |
| `submission_details`| Teacher | Yes | No | Yes (Chấm tay)| Yes (Soft) | Thuộc `submission` hợp lệ. |
| | Student | Yes | Yes | No | No | Thuộc bài của chính mình. |
| `games` | Teacher | Yes | Yes | Yes | Yes (Soft) | (Global hoặc thuộc quyền) |
| | Student | Yes | No | No | No | `is_deleted = false` |
| `system_settings` | Teacher | Yes | Yes | Yes | No | Admin config (Có thể giới hạn lại sau). |
| | Student | No | No | No | No | Không quyền. |

> **Lưu ý**: Đối với Student (truy cập Public), không dùng Auth JWT để xác định nhân danh. Ta có thể cấp quyền `INSERT` ẩn danh (Anon Key) với điều kiện chặt chẽ trong Postgres (hoặc dùng RPC) để ngăn chặn spam, hoặc yêu cầu Student nhập mã học sinh tạo một Pseudo-Session.
