# 16. Migration Plan

Kế hoạch Migrate chi tiết hệ thống từ Legacy sang Kiến trúc React + Supabase.

## Giai đoạn 1: Chuẩn bị & Database (Phase 2, 3)
1. **Khởi tạo Codebase**: Tạo project React Vite mới. Cấu hình ESLint, Prettier, React Router, TailwindCSS/CSS Modules.
2. **Setup Supabase Project**: Khởi tạo project trên Supabase Cloud.
3. **Database Schema & Migrations**: Chuyển các định nghĩa Table (exams, questions, etc.) thành file `.sql` migration.
4. **Row Level Security (RLS)**: Viết các policy bảo vệ dữ liệu. Viết RPC `submit_exam_result`.

## Giai đoạn 2: Phát triển Backend Core & Auth (Phase 4)
1. **Auth Module**: Setup Supabase Auth. Xây dựng trang Login mới.
2. Áp dụng JWT Token vào các luồng gọi API (Supabase JS Client).

## Giai đoạn 3: Phát triển Teacher Panel (Phase 5, 6, 8, 9)
Tiến hành migrate từng Vertical Slice của phần Admin:
1. **Exam Manager**: Danh sách, Tạo, Sửa, Bật/Tắt đề.
2. **Question Manager**: Danh sách câu hỏi, CRUD câu hỏi, Tính năng Import Excel.
3. **Results Manager**: Danh sách bài thi, Chi tiết kết quả.
4. **Game Manager & Settings**.

## Giai đoạn 4: Phát triển Student Portal (Phase 7)
1. Xây dựng luồng Start thi (nhập thông tin).
2. Xây dựng Exam Player, Countdown Timer, Draft Cache.
3. Tích hợp RPC `submit_exam_result` và màn hình Result Summary.

## Giai đoạn 5: Testing & Data Migration (Phase 10, 11)
1. Xuất dữ liệu từ Google Sheets thành CSV.
2. Chạy migration script để import dữ liệu cũ vào Supabase Postgres (xử lý JSON string cẩn thận).
3. E2E Testing toàn bộ luồng.

## Giai đoạn 6: Triển khai (Phase 12)
1. Triển khai frontend lên Vercel.
2. Cấu hình Environment Variables (Supabase URL, Anon Key).
3. Chạy Staging, Review và lập kế hoạch Cutover.
