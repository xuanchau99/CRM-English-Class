# EnglishTools – Feature Implementation Checklist

## 1. Teacher Login System
- [ ] `Code.gs`: Thêm sheet `Teachers`, hàm `getTeacher(username, password)`
- [ ] `Code.gs`: Thêm case `login` vào `doPost`
- [ ] `script.js`: Thêm màn hình login trước khi vào Admin Mode
- [ ] `script.js`: Lưu session giáo viên (`teacher_id`, `name`) vào `sessionStorage`
- [ ] `script.js`: Mock DB login (kiểm tra `mock_teachers` localStorage)
- [ ] `script.js`: Hiển thị tên giáo viên + nút logout ở header

## 2. Add New Question Improvements
- [ ] Auto-generate `question_id` khi mở modal
- [ ] Khi chọn `type` → cập nhật placeholder, gợi ý, tooltip cho mọi ô
- [ ] Tooltip tiếng Việt giải thích từng ô (hiện icon ❓)
- [ ] Đánh dấu ô bắt buộc (*)
- [ ] UI đẹp hơn (pastel xanh-hồng, rounded corners)
- [ ] Empty state khi exam chưa có câu hỏi: hiện "No questions yet. Add your first question!" thay lỗi 404

## 3. Active Exams Improvements
- [ ] Nút "Manage Questions" tự fill `exam_id` vào Select Exam ID ở tab Question Manager
- [ ] Form Create New Exam: đánh dấu ô bắt buộc (*)

## 4. UI/UX Overhaul
- [ ] `style.css`: Pastel palette (xanh-hồng nhạt), bo góc lớn hơn, shadow mềm
- [ ] Admin header thanh lịch hơn

## 5. Exam Linked to Teacher
- [ ] Khi tạo/sửa exam: lưu `teacher_id` vào exam data
- [ ] Khi load exams: filter theo `teacher_id` của giáo viên đang đăng nhập (cloud & mock)
- [ ] `Code.gs`: `getExams` nhận param `teacherId` để filter
