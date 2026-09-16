# Feature Inventory

Danh sách các tính năng được tìm thấy trong source code:

## Teacher Panel (Admin)
- **Đăng nhập**: Giáo viên đăng nhập bằng username / password. Hỗ trợ offline fallback.
- **Quản lý Đề thi (Exam Manager)**:
  - Xem danh sách đề thi (có filter theo teacherId).
  - Tạo đề thi mới (ID, tiêu đề, thời gian, tuỳ chọn đảo câu hỏi, tuỳ chọn đảo đáp án, hiện kết quả, trạng thái).
  - Sửa thông tin đề thi.
  - Xóa đề thi (soft delete).
  - Bật/tắt trạng thái (active).
  - Copy/Sinh link làm bài cho học sinh.
  - In đề (Chưa rõ cách in, nhưng theo yêu cầu).
- **Quản lý Câu hỏi (Question Manager)**:
  - Xem danh sách câu hỏi theo đề thi.
  - Thêm, sửa, xóa (soft delete) câu hỏi.
  - Import câu hỏi từ file Excel/CSV (Hỗ trợ 8 loại: multiple_choice, single_choice, true_false, fill_blank, arrange_sentence, vocabulary, matching, short_answer).
  - Export câu hỏi (Dự kiến có qua thư viện xlsx).
- **Quản lý Kết quả (Results Manager)**:
  - Xem danh sách bài nộp của học sinh (Submissions).
  - Xem chi tiết từng bài nộp (Submission Details), bao gồm đánh giá đúng/sai từng câu.
  - Xóa bài nộp.
  - Chấm điểm tự động và gắn cờ cần chấm tay (manual review) cho câu short_answer.
- **Game Manager**:
  - Quản lý các game học tập: thêm, sửa, xoá game (name, url, image_url).
- **Settings**:
  - Cấu hình AI API Keys (Gemini, ChatGPT) cho hệ thống sinh/hỗ trợ câu hỏi.
- **Guide**: Xem hướng dẫn.

## Student Portal
- Nhập thông tin học sinh (Name, Class).
- Làm bài kiểm tra theo giới hạn thời gian (Timer).
- Giao diện trả lời đa dạng theo 8 loại câu hỏi.
- Cache bài làm đang dang dở (Lưu Draft vào LocalStorage).
- Nộp bài, hiển thị kết quả tổng quan và chi tiết ngay lập tức (nếu đề thi cho phép).

## Automated Test Suite (`test.html`)
- Chạy các test tự động cho grading engine và logic normalization của frontend.
