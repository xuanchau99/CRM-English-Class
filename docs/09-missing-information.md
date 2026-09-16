# Missing Information

Trong quá trình khảo sát (Phase 0), có một số thông tin và chức năng chưa được xác định rõ ràng, cần tìm hiểu thêm hoặc TODO review:

## 1. Logic Manual Review (Chấm tay)
- Hệ thống có khả năng tự động gán cờ `need_manual_review = TRUE` cho các câu hỏi dạng Short Answer và lưu xuống DB (`SubmissionDetails`).
- **Vấn đề**: Không tìm thấy API function nào trên Google Apps Script (như `updateSubmissionScore` hoặc tương tự) để giáo viên cập nhật lại điểm sau khi chấm. Vậy hệ thống có thực sự cho phép lưu lại điểm chấm tay lên Cloud chưa, hay chỉ có trên UI (hoặc Local DB)?

## 2. In Đề Thi (Print Exam)
- Không có đoạn CSS hay module cụ thể nào xử lý layout in đề thi (Mặc dù có CSS, nhưng chưa rõ có class `@media print` hay template HTML đặc thù nào cho việc in ra PDF không).
- Cần check kỹ lại mã `script.js` xem hàm `printExam()` được viết như thế nào.

## 3. Sinh Link Làm Bài
- Hệ thống routing ở Frontend (`student.html`) xử lý Query parameters (ví dụ: `?exam_id=...`) như thế nào để biết là học sinh đang làm đề nào? (Frontend xử lý hoàn toàn qua `URLSearchParams`?).

## 4. Export Tính Năng
- Chưa thấy endpoint ở Google Apps Script phục vụ cho tính năng Export đề thi / danh sách câu hỏi.
- Việc này có thể chỉ được diễn ra ở Frontend, dùng JS build thành file `.xlsx` thông qua thư viện.

*(Ghi chú: Sẽ xem xét chi tiết hơn ở các Phase Refactoring Frontend / Build Backend)*
