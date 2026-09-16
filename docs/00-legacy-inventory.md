# Legacy Inventory

## Overview
Dự án English Exam Builder là một hệ thống quản lý bài kiểm tra tiếng Anh được xây dựng trên nền tảng web truyền thống kết hợp với Google Apps Script và Google Sheets làm backend.

## Technology Stack
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript thuần (Vanilla JS).
- **Backend**: Google Apps Script (GAS) đóng vai trò là API endpoint xử lý các request GET/POST.
- **Database**: Google Sheets đóng vai trò như một cơ sở dữ liệu.
- **Thư viện ngoài (Frontend)**:
  - xlsx (Xử lý Excel)
  - marked (Render Markdown)
  - SortableJS (Kéo thả)
  - Font Awesome (Icons)

## File Inventory
Tổng số file chính trong repository: 13
- `index.html`: Giao diện Teacher Panel (Admin Mode).
- `student.html`: Giao diện Student Portal (Làm bài thi).
- `test.html`: Giao diện Automated Test Suite.
- `style.css`: File CSS chứa toàn bộ style của hệ thống (size: ~54KB, ~2300 dòng).
- `script.js`: File chứa toàn bộ logic frontend (size: ~335KB).
- `Code.gs`: File backend Google Apps Script.
- `replace.ps1`, `Huong_dan_su_dung.md`, `PHASE_1.md`, `requirements.md`, `task.md`, `sample_questions.csv`, `sample_questions_template.xlsx`.

## Architecture
- Client-Server thông qua HTTPS.
- GAS script chạy với hàm `doGet` và `doPost` nhận request từ `script.js` và thao tác dữ liệu xuống Google Sheets.
- Dữ liệu trả về dưới định dạng JSON.
- Có cơ chế Local Cache / Mock DB: Frontend lưu trữ dữ liệu mock trên localStorage nếu không gọi được API.
