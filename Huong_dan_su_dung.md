# Hướng Dẫn Sử Dụng Nền Tảng EnglishTools Teacher Portal

Chào mừng bạn đến với **EnglishTools** - nền tảng quản lý đề thi, ngân hàng câu hỏi, và bài trò chơi trực tuyến. Bộ tài liệu này hướng dẫn chi tiết cách thức vận hành hệ thống.

---

## 1. Hệ Thống Đăng Nhập
- Hệ thống hỗ trợ đa giáo viên bằng **Mã giáo viên (Teacher ID)** và **Mật khẩu**.
- Bạn sẽ chỉ thấy Đề thi (Exams) và thông tin của chính mình. Sự cô lập này giúp đảm bảo tính bảo mật khi nhiều giáo viên cùng dùng chung hệ thống.

---

## 2. Quản Lý Đề Thi (Exam Manager)
Tab **Quản lý Đề thi** là nơi bạn tạo và kết nối đề thi cho học sinh.

### Tạo / Cập nhật Đề thi
1. Click **"+ Create New Exam"**.
2. Nhập các thông tin: **Mã Đề (Exam ID)** (bắt buộc, không dấu hoặc khoảng trắng), **Tiêu đề**, **Thời lượng thi**, và gán **Trạng thái (Active/Inactive)**.
3. Khi lưu thành công, đề thi sẽ hiện lên bảng.

### Chia sẻ cho Học sinh (Copy Link)
Tại mỗi đề thi ở bảng có trạng thái **Active**:
- Hãy bấm nút **"🔗 Copy Link"** (Màu xanh dương đậm).
- Link được copy (VD: `student.html?exam_id=ENG_123`) vừa có thể dán vào Zalo/Facebook gửi cho học sinh.
- Mẹo: Khi học sinh bấm link này, hệ thống sẽ **Tự động chọn sẵn đề thi** cho học sinh đó, loại bỏ rủi ro học sinh chọn nhầm đề của lớp khác.

---

## 3. Ngân Hàng Câu Hỏi (Question Bank)
Bạn có thể tự nhập tay hoặc dùng Excel nhập liệu hàng loạt.

### Danh Sách Các Loại Câu Hỏi Hỗ Trợ
1. **Multiple Choice (`multiple_choice`)**: Trắc nghiệm - Học sinh có thể chọn 1 hay *nhiều* hộp kiểm vuông. Đáp án lưu dạng phân tách bởi dấu phẩy (vd: `A,B`).
2. **Single Choice (`single_choice`)** *(MỚI)*: Trắc nghiệm - Học sinh chỉ được quyền chọn *duy nhất 1* đáp án từ các nút hình tròn (Radio). Đáp án là 1 kí tự.
3. **True/False (`true_false`)**: Giống Single choice nhưng chỉ có 2 mức Chọn: Đúng và Sai.
4. **Vocabulary (`vocabulary`)**: Nhấn chọn 1 đáp án tròn (radio single-select). Dùng cho từ vựng.
5. **Fill in Blank (`fill_blank`)**: Điền vào chỗ trống. Hệ thống dùng `accepted_answers` có định dạng danh sách JSON (Vd: `["am", "'m"]`) để học sinh gõ chữ vào. Chấm điểm rà soát tự động theo mảng JSON.
6. **Arrange Sentence (`arrange_sentence`)**: Học sinh gõ lại cả câu hoàn chỉnh dựa trên từ gợi ý.
7. **Short Answer (`short_answer`)**: Câu hỏi tự luận ngắn. Hệ thống sẽ *không* bắt buộc phải có đáp án đúng; giáo viên có thể chấm tay nếu tự luận đặc thù.
8. **Matching (`matching`)**: Dạng kéo thả ghép nối theo cặp Key-Value. Chấp nhận JSON object ở `accepted_answers` như `{"Cat":"Meow", "Dog":"Bark"}`.

### Chỉnh sửa và Nhập Liệu Câu Hỏi
- **Click vào "Manage Questions"** ở bảng Exams để mở giao diện quản lý câu hỏi của đề đó.
- Nút **"Add Question"**: Tạo thêm từng câu hỏi lẻ bằng tay. Giao diện trực quan tích hợp Tooltips giải thích loại câu và ô đỏ báo lỗi điền sai.
- Nút **"Import Excel"**: Chọn File `.xlsx` mẫu. Nếu bạn chưa có file mẫu, hãy nhấp vào chữ **"Tải File Mẫu tại đây"**. Các cột thiết yếu nhất: `question_id`, `exam_id`, `type`, `question_text`. Nhập liệu tự động kiểm tra lỗi trước khi cho phép lưu.

---

## 4. Quản Lý Kết Quả Thi (Submissions)
Hệ thống cho phép giám sát bài kiểm tra dễ dàng:

1. Vào tab **Submissions Manager**.
2. Hệ thống thống kê có bao nhiêu học sinh làm bài thi nào, điểm số trung bình ra sao.
3. **Cơ chế chống Thi Hộ / Thi Nhiều Lần**: Nếu một học sinh dùng cùng Tên + Lớp + Chọn Đề Thi cũ, ứng dụng sẽ từ chối không cho phép thi tiếp.
4. **Bấm "🔄 Cho làm lại"**: Tính năng của riêng Giáo viên. Tại bảng chi tiết, nếu có học sinh gặp lý do bất khả kháng rớt mạng hoặc giáo viên cho thi lại -> Nhấp **🔄 Cho làm lại** -> Hồ sơ bài đó sẽ được Xoá Vĩnh Viễn để học sinh điền tên tiếp tục được vào làm lại.

---

## 5. Quản Lý Kho Trò Chơi (Game Manager)
Thêm các hoạt động giải trí hoặc liên kết bài học Quizizz, Gimkit, Wordwall dễ dàng:
- **Tạo Game**: Tab Game Manager > Thêm Game Mới. 
- Chỉ điền **Tên Game**, dán **Đường Link (URL)**, và tải một **Hình Ảnh Đại Diện (Image Box)**.
- Khi người dùng học sinh bấm vào menu **"Trò chơi"**, kho sẽ tập hợp dạng Game Card lật mở đẹp mắt, kích thích hứng thú vào trải nghiệm Game theo Link do Giáo viên trỏ sẵn.

---

Chúc bạn có những giờ giảng dạy trải nghiệm hiệu quả và mượt mà cùng **EnglishTools**!
