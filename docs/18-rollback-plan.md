# 18. Rollback Plan

Kế hoạch ứng phó rủi ro và khôi phục khi quá trình triển khai hệ thống mới gặp sự cố nghiêm trọng.

## 1. Nguyên tắc cốt lõi
- **Không ghi đè, phá hủy hệ thống cũ**: Google Sheet, file `Code.gs` và thư mục Web tĩnh cũ sẽ KHÔNG BỊ XÓA hay can thiệp trong quá trình chuyển đổi.
- Hệ thống cũ tiếp tục hoạt động song song hoặc ở chế độ chờ (standby).

## 2. Điều kiện kích hoạt Rollback
- Lỗi Backend Supabase (Down time, cấu hình sai RLS) làm lộ lọt dữ liệu.
- Học sinh không thể submit bài (Lỗi RPC, nghẽn mạng do kiến trúc mới) trong kỳ thi quan trọng.
- Data Migration có sai sót logic khiến điểm số lịch sử bị lệch.
- Lỗi Frontend (Blank screen, Routing 404 trên Vercel).

## 3. Quy trình Rollback
1. **Thông báo**: Cập nhật thông báo hệ thống "Đang bảo trì" trên giao diện Vercel.
2. **Chuyển hướng Traffic (DNS / Domain)**: Trỏ lại domain hoặc cung cấp lại link web cũ (Ví dụ link github pages, google drive URL cũ) cho học sinh và giáo viên sử dụng tạm thời.
3. **Đóng băng Database Mới**: Tạm thời chặn ghi dữ liệu lên Supabase.
4. **Khôi phục Dữ liệu (Nếu có giao dịch phát sinh trên hệ thống mới)**: Dữ liệu (bài thi) đã nộp lên hệ thống mới trong thời gian ngắn sẽ được xuất (Export CSV) và merge tay về Google Sheet cũ.

## 4. Xử lý sau Sự cố
- Tìm nguyên nhân Root Cause.
- Fix bugs ở môi trường Staging.
- Review và thực hiện lại Cutover Plan khi hệ thống đã ổn định hoàn toàn.
