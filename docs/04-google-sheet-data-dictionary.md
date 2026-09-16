# Google Sheet Data Dictionary

## 1. Sheet `Exams`
- **Mục đích**: Lưu trữ thông tin các bài kiểm tra.
- **Headers**: `exam_id`, `title`, `duration_minutes`, `shuffle_questions`, `shuffle_options`, `show_result`, `active`, `teacher_id`, `created_at`, `is_deleted`
- **Data types**: String, Integer, Boolean, Boolean, Boolean, Boolean, String, String, Boolean
- **Primary key dự kiến**: `exam_id`
- **Unique field**: `exam_id`
- **Foreign key dự kiến**: `teacher_id` (tham chiếu Teachers)
- **Formula**: TODO_REVIEW
- **Lookup**: TODO_REVIEW
- **Null**: `is_deleted` có thể null
- **Empty string**: Các trường không bắt buộc có thể rỗng
- **Timezone**: GMT+7 (được hardcode trong script GAS)
- **Dữ liệu lỗi**: Có thể duplicate `exam_id` nếu nhập tay vào Sheet
- **Target PostgreSQL table được đề xuất**: `exams`

## 2. Sheet `Teachers`
- **Mục đích**: Lưu thông tin giáo viên đăng nhập.
- **Headers**: `username`, `password`, `name`, `phone`
- **Data types**: String
- **Primary key dự kiến**: `username`
- **Unique field**: `username`
- **Foreign key dự kiến**: Không
- **Target PostgreSQL table được đề xuất**: `users` (hoặc `teachers`)

## 3. Sheet `Questions`
- **Mục đích**: Lưu câu hỏi của đề thi.
- **Headers**: `question_id`, `exam_id`, `type`, `level`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `accepted_answers`, `explanation`, `points`, `tags`, `active`, `created_at`, `is_deleted`
- **Data types**: String, Boolean, Integer
- **Primary key dự kiến**: `question_id`, `exam_id` (Composite)
- **Unique field**: `question_id` (trong phạm vi 1 exam_id)
- **Foreign key dự kiến**: `exam_id` (tham chiếu Exams)
- **Target PostgreSQL table được đề xuất**: `questions`

## 4. Sheet `Submissions`
- **Mục đích**: Lưu thông tin bài nộp của học sinh (tổng quan).
- **Headers**: `submission_id`, `exam_id`, `exam_title`, `student_id`, `student_name`, `class_name`, `score`, `total_points`, `percentage`, `correct_count`, `wrong_count`, `unanswered_count`, `manual_review_count`, `duration_seconds`, `submitted_at`, `is_deleted`
- **Primary key dự kiến**: `submission_id`
- **Foreign key dự kiến**: `exam_id`
- **Target PostgreSQL table được đề xuất**: `submissions`

## 5. Sheet `SubmissionDetails`
- **Mục đích**: Lưu chi tiết từng câu trả lời trong bài nộp.
- **Headers**: `submission_id`, `question_id`, `question_type`, `question_text`, `student_answer`, `correct_answer`, `is_correct`, `need_manual_review`, `points`, `points_earned`, `explanation`, `is_deleted`
- **Primary key dự kiến**: `submission_id`, `question_id` (Composite)
- **Foreign key dự kiến**: `submission_id`, `question_id`
- **Target PostgreSQL table được đề xuất**: `submission_details`

## 6. Sheet `ManagerGames`
- **Mục đích**: Quản lý game học tập.
- **Headers**: `game_id`, `name`, `url`, `image_url`, `created_at`, `is_deleted`
- **Primary key dự kiến**: `game_id`
- **Target PostgreSQL table được đề xuất**: `games`

## 7. Sheet `AI Keys`
- **Mục đích**: Lưu API keys.
- **Headers**: `Provider`, `ApiKey`
- **Primary key dự kiến**: `Provider`
- **Target PostgreSQL table được đề xuất**: `system_settings`
