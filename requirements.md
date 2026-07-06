Bạn là Senior Full-stack Web Agent chuyên thiết kế và xây dựng website kiểm tra tiếng Anh cho học sinh bằng HTML/CSS/JavaScript, có tích hợp Google Sheet hoặc Excel Online để lưu dữ liệu.

Hãy xây dựng cho tôi một web app có tên:

"English Exam Builder & Auto Grading System"

Mục tiêu:
Tạo một website cho giáo viên tạo bài kiểm tra, import câu hỏi từ Excel, lưu dữ liệu bài kiểm tra vào Google Sheet hoặc Excel Online, cho học sinh làm bài, tự động chấm điểm, hiển thị kết quả đúng/sai cho học sinh, sau đó gửi toàn bộ kết quả bài làm về Google Sheet hoặc Excel Online.

YÊU CẦU TỔNG QUAN:

1. Website phải dùng:
 - HTML
 - CSS
 - JavaScript thuần
 - Không phụ thuộc framework nếu không cần thiết
 - Giao diện đẹp, hiện đại, màu sắc nhẹ nhàng, dễ thương
 - Responsive cho laptop, tablet và màn hình lớn

2. Website gồm 2 chế độ chính:
 - Teacher/Admin Mode
 - Student Mode

====================================================
PHẦN 1: TEACHER / ADMIN MODE
====================================================

Admin Mode cần có các chức năng sau:

1. Tạo bài kiểm tra mới (một bài kiểm tra có nhiều câu hỏi, mỗi câu có thể có nhiều đáp án, mỗi bài kiểm tra lưu ở một sheet riêng để dễ quản lí)
 - Nhập tên bài kiểm tra
 - Nhập mã bài kiểm tra exam_id (tùy chọn, nếu không nhập thì hệ thống sẽ tạo ngẫu nhiên)
 - Nhập thời gian làm bài
 - Chọn lớp
 - Chọn mức độ: easy / medium / hard / mixed
 - Chọn có random câu hỏi hay không
 - Chọn có random đáp án hay không
 - Chọn có hiển thị kết quả sau khi nộp bài hay không
 - Có button copy link bài kiểm tra để gởi cho học sinh làm.

2. Import câu hỏi từ Excel
 - Cho phép upload file .xlsx hoặc .csv
 - Đọc dữ liệu câu hỏi từ file Excel
 - Preview dữ liệu trước khi lưu
 - Validate dữ liệu trước khi import
 - Báo lỗi rõ ràng nếu thiếu cột bắt buộc
 - Báo lỗi nếu question_id bị trùng
 - Báo lỗi nếu thiếu correct_answer
 - Báo lỗi nếu type không hợp lệ

3. Các loại câu hỏi cần hỗ trợ:
 - multiple_choice
 - true_false
 - fill_blank
 - arrange_sentence
 - vocabulary
 - matching
 - short_answer

4. Cấu trúc file Excel import câu hỏi gồm các cột:
 - question_id
 - exam_id
 - type
 - level
 - question_text
 - option_a
 - option_b
 - option_c
 - option_d
 - correct_answer
 - accepted_answers
 - explanation
 - points
 - tags
 - active

5. Quản lý ngân hàng câu hỏi
 - Hiển thị danh sách câu hỏi đã import
 - Có filter theo exam_id
 - Có filter theo type
 - Có filter theo level
 - Có ô search câu hỏi
 - Có nút edit câu hỏi
 - Có nút delete/disable câu hỏi
 - Có nút export câu hỏi ra Excel/CSV

6. Lưu dữ liệu bài kiểm tra
 - Lưu cấu hình bài kiểm tra vào sheet Exams
 - Lưu câu hỏi vào sheet Questions
 - Nếu dùng Google Sheet thì gọi Google Apps Script API
 - Nếu dùng Excel Online thì chuẩn bị cấu trúc để gọi backend/Microsoft Graph API
 - Không ghi đè dữ liệu cũ nếu không được yêu cầu

====================================================
PHẦN 2: STUDENT MODE
====================================================

Student Mode cần có các chức năng sau:

1. Màn hình bắt đầu bài kiểm tra
 - Học sinh nhập:
 - student_name
 - class_name
 - Chọn bài kiểm tra đang active
 - Bấm Start để bắt đầu

2. Load câu hỏi
 - Lấy danh sách câu hỏi theo exam_id
 - Chỉ lấy câu hỏi active = TRUE
 - Nếu shuffle_questions = TRUE thì random thứ tự câu hỏi
 - Nếu shuffle_options = TRUE thì random thứ tự đáp án của câu multiple_choice

3. Làm bài kiểm tra
 - Hiển thị từng câu hỏi hoặc danh sách câu hỏi
 - Có progress bar
 - Có số câu hiện tại / tổng số câu
 - Có timer đếm ngược
 - Khi hết giờ tự động submit bài
 - Có cảnh báo nếu học sinh chưa trả lời hết câu

4. Render từng loại câu hỏi:

 multiple_choice:
 - Hiển thị câu hỏi
 - Hiển thị option A/B/C/D
 - Học sinh chọn một đáp án

 true_false:
 - Hiển thị True / False

 fill_blank:
 - Hiển thị input để học sinh nhập đáp án

 arrange_sentence:
 - Hiển thị các từ bị xáo trộn
 - Cho phép kéo thả hoặc bấm để sắp xếp thành câu
 - Lấy câu trả lời cuối cùng dưới dạng chuỗi

 vocabulary:
 - Có thể là chọn nghĩa đúng hoặc chọn từ đúng
 - Dùng multiple choice style

 matching:
 - Hiển thị danh sách từ và nghĩa
 - Học sinh chọn cặp tương ứng
 - Lưu đáp án dưới dạng object hoặc chuỗi JSON

 short_answer:
 - Hiển thị textarea
 - Không tự chấm tuyệt đối nếu không có accepted_answers
 - Nếu có accepted_answers thì so sánh normalize

5. Lưu tạm bài làm
 - Lưu câu trả lời tạm vào localStorage
 - Nếu reload trang thì có thể khôi phục bài làm
 - Khi submit thành công thì clear draft

====================================================
PHẦN 3: GRADING AGENT
====================================================

Cần xây dựng Grading Agent trong JavaScript với các chức năng sau:

1. Chấm điểm tự động cho các loại câu hỏi:
 - multiple_choice
 - true_false
 - fill_blank
 - arrange_sentence
 - vocabulary
 - matching nếu format rõ ràng
 - short_answer nếu có accepted_answers

2. Hàm normalizeAnswer(value)
 - trim khoảng trắng
 - chuyển về lowercase
 - thay nhiều khoảng trắng thành một khoảng trắng
 - bỏ dấu câu cuối câu như . ! ?
 - xử lý null/undefined an toàn

3. Logic chấm:
 - Nếu đáp án rỗng thì sai
 - Nếu exact match sau normalize thì đúng
 - Nếu accepted_answers có nhiều đáp án thì đúng khi match một trong các đáp án
 - Với arrange_sentence, so sánh câu đã sắp xếp sau normalize
 - Với matching, so sánh từng pair đúng/sai
 - Với short_answer, nếu không có accepted_answers thì đánh dấu "need_manual_review"

4. Tính điểm:
 - points_earned = points nếu đúng
 - points_earned = 0 nếu sai
 - total_score = tổng points_earned
 - total_points = tổng points của đề
 - percentage = total_score / total_points * 100
 - correct_count
 - wrong_count
 - unanswered_count
 - manual_review_count

5. Tạo detail result cho từng câu:
 - question_id
 - question_type
 - question_text
 - student_answer
 - correct_answer
 - accepted_answers
 - is_correct
 - need_manual_review
 - points
 - points_earned
 - explanation

====================================================
PHẦN 4: RESULT DISPLAY AGENT
====================================================

Sau khi học sinh submit, cần hiển thị kết quả:

1. Summary:
 - Tên học sinh
 - Lớp
 - Tên bài kiểm tra
 - Điểm đạt được
 - Tổng điểm
 - Tỷ lệ %
 - Số câu đúng
 - Số câu sai
 - Số câu chưa trả lời
 - Thời gian làm bài

2. Detail:
 - Mỗi câu hiển thị:
 - Nội dung câu hỏi
 - Đáp án của học sinh
 - Đáp án đúng
 - Đúng/Sai
 - Điểm đạt
 - Giải thích

3. UI:
 - Câu đúng màu xanh
 - Câu sai màu đỏ
 - Câu cần chấm tay màu vàng/cam
 - Có nút "Review Answers"
 - Có nút "Back to Home"
 - Có nút "Download Result" nếu có thể

====================================================
PHẦN 5: RESULT SYNC AGENT
====================================================

Cần xây dựng Result Sync Agent với yêu cầu:

1. Khi học sinh submit:
 - Chấm điểm trước ở frontend
 - Tạo submission_id duy nhất
 - Tạo object submission summary
 - Tạo array submission details
 - Gửi dữ liệu về Google Sheet hoặc Excel Online

2. Ghi dữ liệu vào các sheet:

Sheet Exams:
- exam_id
- title
- duration_minutes
- shuffle_questions
- shuffle_options
- show_result
- active
- created_at

Sheet Questions:
- question_id
- exam_id
- type
- level
- question_text
- option_a
- option_b
- option_c
- option_d
- correct_answer
- accepted_answers
- explanation
- points
- tags
- active

Sheet Submissions:
- submission_id
- exam_id
- exam_title
- student_id
- student_name
- class_name
- score
- total_points
- percentage
- correct_count
- wrong_count
- unanswered_count
- manual_review_count
- duration_seconds
- submitted_at

Sheet SubmissionDetails:
- submission_id
- question_id
- question_type
- question_text
- student_answer
- correct_answer
- is_correct
- need_manual_review
- points
- points_earned
- explanation

3. Error handling:
 - Nếu sync thành công thì hiển thị "Submitted successfully"
 - Nếu sync thất bại thì KHÔNG làm mất kết quả
 - Lưu pending submission vào localStorage
 - Có nút retry sync
 - Log lỗi rõ ràng
 - Không để lỗi sync làm mất màn hình kết quả

4. Yêu cầu quan trọng:
 - Result Sync failure không được làm fail toàn bộ bài làm
 - Học sinh vẫn phải nhìn thấy kết quả dù gửi sheet lỗi
 - Dữ liệu pending có thể gửi lại sau

====================================================
PHẦN 6: GOOGLE APPS SCRIPT BACKEND
====================================================

Nếu dùng Google Sheet, hãy tạo Google Apps Script backend gồm:

1. doGet(e)
 - action=getExams
 - action=getQuestions
 - action=healthCheck

2. doPost(e)
 - action=saveExam
 - action=importQuestions
 - action=submitResult

3. Các function cần có:
 - getExams()
 - getQuestions(examId)
 - saveExam(payload)
 - importQuestions(payload)
 - submitResult(payload)
 - appendSubmission(summary)
 - appendSubmissionDetails(details)
 - createJsonResponse(data)
 - createErrorResponse(error)

4. Apps Script phải:
 - Mở spreadsheet bằng SPREADSHEET_ID
 - Ghi vào đúng sheet name
 - Tự tạo header nếu sheet chưa có header
 - Trả JSON response
 - Có try/catch
 - Không crash im lặng
 - Log lỗi bằng console.error hoặc Logger.log

====================================================
PHẦN 7: DATA MODEL JSON
====================================================

Exam object:

{
 "exam_id": "ENG_THCS_001",
 "title": "English Test Unit 1",
 "duration_minutes": 15,
 "shuffle_questions": true,
 "shuffle_options": true,
 "show_result": true,
 "active": true,
 "created_at": "ISO_DATE"
}

Question object:

{
 "question_id": "Q001",
 "exam_id": "ENG_THCS_001",
 "type": "multiple_choice",
 "level": "easy",
 "question_text": "Choose the correct answer: She ___ apples.",
 "options": ["like", "likes", "liked", "liking"],
 "correct_answer": "likes",
 "accepted_answers": ["likes"],
 "explanation": "With She/He/It, the verb needs s/es.",
 "points": 1,
 "tags": "grammar,present-simple",
 "active": true
}

Submission summary object:

{
 "submission_id": "SUB_...",
 "exam_id": "ENG_THCS_001",
 "exam_title": "English Test Unit 1",
 "student_id": "ST001",
 "student_name": "Minh",
 "class_name": "7A",
 "score": 8,
 "total_points": 10,
 "percentage": 80,
 "correct_count": 8,
 "wrong_count": 2,
 "unanswered_count": 0,
 "manual_review_count": 0,
 "duration_seconds": 560,
 "submitted_at": "ISO_DATE"
}

Submission detail object:

{
 "submission_id": "SUB_...",
 "question_id": "Q001",
 "question_type": "multiple_choice",
 ...
}

====================================================
PHẦN 8: GHI CHÚ
====================================================
Trước khi viết code, hãy phân tích ngắn:
1. Kiến trúc hệ thống
2. Data flow
3. Cấu trúc Google Sheet
4. Các function chính
5. Luồng xử lý lỗi
 
Sau đó mới viết code đầy đủ.