# GAS Function Mapping

Dưới đây là mapping các function trên Google Apps Script (`Code.gs`).

## 1. `doGet(e)`
- **File**: `Code.gs`
- **Caller**: HTTP GET từ `script.js`
- **Input**: `e.parameter.action` (getExams, getQuestions, getGames, getSubmissions, getSubmissionDetails, getAiKeys, healthCheck)
- **Output**: JSON payload.
- **Sheet được đọc**: Tuỳ thuộc vào action.
- **Sheet được ghi**: Không.
- **Side effect**: Trả về dữ liệu GET.
- **Validation**: Kiểm tra `action` hợp lệ.
- **Auth**: Không (Mở công khai).
- **Trigger**: Web app HTTP GET.
- **Target được đề xuất**: Spring Boot REST Controller (GET).

## 2. `doPost(e)`
- **File**: `Code.gs`
- **Caller**: HTTP POST từ `script.js`
- **Input**: `e.parameter.action`, `e.postData.contents` (JSON payload)
- **Output**: JSON.
- **Sheet được đọc/ghi**: Tuỳ thuộc vào action.
- **Validation**: Bắt lỗi JSON parse và `action` hợp lệ.
- **Auth**: Không trực tiếp trong wrapper, phụ thuộc vào action logic.
- **Target được đề xuất**: Spring Boot REST Controller (POST).

## 3. `getExams(teacherId)`
- **File**: `Code.gs`
- **Caller**: `doGet` (action='getExams')
- **Input**: `teacherId`
- **Output**: Mảng các object Exam.
- **Sheet được đọc**: `Exams`, `Questions` (để đếm số câu).
- **Sheet được ghi**: `Exams` (thêm cột `teacher_id` nếu thiếu).
- **Validation**: Lọc theo `teacher_id` nếu có.
- **Auth**: None.
- **Target được đề xuất**: `ExamService.getExamsByTeacherId()`.
- **Lý do**: Lấy danh sách đề thi cần thiết.
- **Rủi ro**: Việc đếm số câu hỏi (N+1 vấn đề hoặc lặp toàn bộ mảng `Questions`) hiện đang load toàn bộ sheet `Questions`. Chuyển sang SQL cần join/group by.
- **Test case cần có**: Có/không có teacherId, xử lý count đúng khi có câu hỏi is_deleted.

## 4. `getQuestions(examId)`
- **File**: `Code.gs`
- **Caller**: `doGet` (action='getQuestions')
- **Input**: `examId`
- **Output**: Mảng câu hỏi.
- **Sheet được đọc**: `Questions`
- **Target được đề xuất**: `QuestionService.getQuestionsByExamId()`.

## 5. `saveExam(examPayload)`
- **File**: `Code.gs`
- **Caller**: `doPost` (action='saveExam')
- **Input**: `examPayload`
- **Output**: Success status & exam_id.
- **Sheet được ghi**: `Exams` (appendRow)
- **Validation**: Check duplicate `exam_id`. Parse string boolean.
- **Target được đề xuất**: `ExamService.createExam()`.
- **Rủi ro**: Thiếu transaction. Cần migration unique constraint `exam_id`.

## 6. `editExam(examPayload)`
- **File**: `Code.gs`
- **Caller**: `doPost`
- **Target được đề xuất**: `ExamService.updateExam()`.

## 7. `deleteExam(examPayload)`
- **File**: `Code.gs`
- **Sheet được ghi**: `Exams`, `Questions` (cập nhật cột `is_deleted` thành TRUE).
- **Side effect**: Cập nhật cờ `is_deleted` trên cả câu hỏi thuộc đề đó.
- **Target được đề xuất**: `ExamService.softDeleteExam()`.
- **Rủi ro**: Không cập nhật cờ `is_deleted` trên Submissions/SubmissionDetails.

## 8. `importQuestions(questionsPayload)`
- **File**: `Code.gs`
- **Input**: Array các question.
- **Sheet được ghi**: `Questions` (append nhiều row).
- **Validation**: Check required fields (`question_id`, `exam_id`, `type`, `correct_answer`), check valid types, check duplicate ID trong DB và trong payload.
- **Target được đề xuất**: `QuestionService.importQuestions()`.
- **Rủi ro**: Tốc độ chậm nếu insert từng dòng. Cần bulk insert trong Postgres. Chú ý GAS tự động format date nếu thiếu `created_at`.

## 9. `submitResult(submissionPayload)`
- **File**: `Code.gs`
- **Input**: `submissionPayload` (summary và details)
- **Sheet được ghi**: `Submissions` và `SubmissionDetails`.
- **Validation**: Duplicate check `submission_id`.
- **Target được đề xuất**: `SubmissionService.submit()`.
- **Rủi ro**: Thiếu transaction, dễ bị lỗi dữ liệu nửa chừng.

## 10. `loginTeacher(payload)`
- **File**: `Code.gs`
- **Input**: `username`, `password`
- **Sheet được đọc**: `Teachers`
- **Validation**: Check match username/password. Password đang lưu plain-text.
- **Target được đề xuất**: `AuthService.login()`.
- **Rủi ro**: Plaintext password. Cần chuyển sang bcrypt hoặc JWT auth.

*(Note: Các hàm khác như `saveGame`, `deleteGame`, `getGames`, `getSubmissions`, `getAiKeys`, `saveAiKeys` có logic tương tự CRUD).*
