# 15. GAS to Supabase Mapping

Dưới đây là mapping các hàm từ backend Google Apps Script cũ sang hệ thống backend Supabase mới.

| Function Cũ | Target Mới | Lý do / Loại Endpoint |
| --- | --- | --- |
| `loginTeacher()` | **Supabase Auth** (`signInWithPassword`) | Chuyển đổi từ plain-text sang JWT/Bcrypt an toàn. |
| `getExams()` | **Supabase Data API** (`supabase.from('exams').select()`) | Đọc danh sách trực tiếp, RLS tự động lọc theo JWT. |
| `saveExam()`, `editExam()`, `deleteExam()` | **Supabase Data API** (`insert`, `update` `is_deleted`) | Thao tác CRUD đơn giản bảo vệ qua RLS. |
| `getQuestions()` | **Supabase Data API** | RLS lọc dựa trên ID đề thi. |
| `importQuestions()` | **Postgres RPC** hoặc **Edge Function** | Cần batch insert và tính toán nguyên tử, validate số lượng lớn. |
| `editQuestion()`, `deleteQuestion()` | **Supabase Data API** | CRUD đơn giản. |
| `submitResult()` | **Postgres RPC** (`submit_exam_result`) | **Đặc biệt quan trọng**: Yêu cầu Transaction để insert vào cả `submissions` và `submission_details`. Nếu tính điểm ở backend, RPC sẽ query `correct_answer`, tính toán và trả về kết quả, đảm bảo tính nguyên tử và chống gian lận. |
| `getSubmissions()`, `getSubmissionDetails()` | **Supabase Data API** | CRUD đơn giản. |
| `getGames()`, `saveGame()`, `deleteGame()` | **Supabase Data API** | CRUD đơn giản. |
| `getAiKeys()`, `saveAiKeys()` | **Supabase Data API** hoặc **Edge Function** | CRUD cài đặt. Có thể bảo mật hơn qua Edge Function. |
