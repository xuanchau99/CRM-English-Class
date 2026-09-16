# 10. Target Architecture

## 1. Tổng quan Kiến trúc Mới
Ứng dụng sẽ được chuyển đổi sang kiến trúc Serverless/BaaS hiện đại, dựa trên hệ sinh thái của React và Supabase.

```text
[ Browser / Client ] 
    |
    | (HTTPS)
    v
[ Vercel Hosting ]  --- Phục vụ file tĩnh (ReactJS + Vite build)
    |
    | (REST API / GraphQL qua PostgREST của Supabase)
    v
[ Supabase ]
    |-- Supabase Auth (Quản lý User, JWT)
    |-- Supabase Data API (Tự động tạo từ Postgres)
    |-- PostgreSQL Database (Chứa dữ liệu Exams, Questions, Submissions)
    |-- PostgreSQL RPC/Functions (Chấm điểm tự động, tính toán phức tạp)
    |-- Supabase Edge Functions (Tích hợp AI API keys, xử lý file import nặng nếu cần)
```

## 2. Frontend (Client-side)
- **Framework**: ReactJS (Functional Components, Hooks).
- **Build Tool**: Vite (giúp build nhanh, HMR tốt).
- **Routing**: React Router DOM (Xử lý các tuyến đường cho Admin và Student).
- **State Management**: Context API (quản lý Auth State, Global Settings), React Query hoặc SWR (để cache và fetch dữ liệu từ Supabase mượt mà).
- **UI/UX**: Giữ nguyên CSS thuần (CSS variables, BEM) từ dự án cũ để đảm bảo không phá vỡ thiết kế, hoặc chuyển đổi từ từ sang TailwindCSS (nếu được phép, nhưng theo yêu cầu là ưu tiên giữ nguyên UI). Tách CSS thành các module.

## 3. Backend & Database (Supabase)
- Dữ liệu hoàn toàn lưu trên PostgreSQL thay vì Google Sheets.
- Bảo mật thông qua Row Level Security (RLS) policies. Thay vì phải code Backend API chặn quyền, PostgreSQL sẽ tự động chặn dựa trên JWT Role.
- Các nghiệp vụ chấm bài có thể chuyển thành PostgreSQL Functions hoặc giữ ở dạng Edge Function để bảo mật logic chấm điểm.

## 4. Hosting
- **Frontend**: Triển khai trên **Vercel** (cấu hình SPA fallback cho React Router).
- **Backend/DB**: Lưu trữ trên **Supabase Cloud** (hoặc Self-hosted tuỳ cấu hình).

## 5. Giải quyết các rủi ro từ kiến trúc cũ
- Không còn nghẽn cổ chai (Rate Limit) khi append từng dòng vào Google Sheets.
- Dữ liệu có ràng buộc toàn vẹn (Foreign Key, Unique Key).
- Không rò rỉ API không xác thực, mọi request thay đổi dữ liệu đều cần token từ Supabase Auth.
