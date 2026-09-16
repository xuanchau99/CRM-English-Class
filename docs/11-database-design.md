# 11. Database Design (PostgreSQL)

Dưới đây là mô hình cơ sở dữ liệu dự kiến triển khai trên Supabase PostgreSQL. 

## Bảng `users` (Auth)
Tận dụng bảng `auth.users` của Supabase và mở rộng thêm bảng `public.profiles`.
- `id` (UUID, PK, FK -> auth.users.id)
- `username` (Text, Unique)
- `full_name` (Text)
- `phone` (Text)
- `avatar_url` (Text)
- `role` (Text, Default: 'teacher') - Phân quyền hệ thống
- `created_at` (Timestamptz)

## Bảng `exams`
- `id` (UUID, PK, Default: uuid_generate_v4())
- `exam_code` (Text, Unique) - Chuyển từ `exam_id` dạng chuỗi cũ.
- `title` (Text, Not Null)
- `duration_minutes` (Integer)
- `shuffle_questions` (Boolean, Default: false)
- `shuffle_options` (Boolean, Default: false)
- `show_result` (Boolean, Default: true)
- `is_active` (Boolean, Default: true)
- `teacher_id` (UUID, FK -> profiles.id)
- `created_at` (Timestamptz)
- `updated_at` (Timestamptz)
- `is_deleted` (Boolean, Default: false) - Hỗ trợ Soft Delete.

## Bảng `questions`
- `id` (UUID, PK)
- `question_code` (Text) - Giữ `question_id` cũ.
- `exam_id` (UUID, FK -> exams.id)
- `type` (Text, Not Null) - e.g. 'multiple_choice', 'matching', 'short_answer'.
- `level` (Text)
- `question_text` (Text)
- `options` (JSONB) - Lưu mảng đáp án thay vì chia 4 cột option_a, b, c, d.
- `correct_answer` (JSONB hoặc Text) - Tuỳ loại câu hỏi.
- `accepted_answers` (JSONB) - Array of string.
- `explanation` (Text)
- `points` (Numeric)
- `tags` (Text)
- `is_active` (Boolean, Default: true)
- `created_at` (Timestamptz)
- `is_deleted` (Boolean, Default: false)

> **Unique Constraint**: `(exam_id, question_code)` trong trường hợp `is_deleted = false`.

## Bảng `submissions`
- `id` (UUID, PK)
- `submission_code` (Text, Unique) - Giữ ID của Submissions cũ.
- `exam_id` (UUID, FK -> exams.id)
- `student_name` (Text)
- `class_name` (Text)
- `score` (Numeric)
- `total_points` (Numeric)
- `percentage` (Numeric)
- `correct_count` (Integer)
- `wrong_count` (Integer)
- `unanswered_count` (Integer)
- `manual_review_count` (Integer)
- `duration_seconds` (Integer)
- `submitted_at` (Timestamptz)
- `is_deleted` (Boolean, Default: false)

## Bảng `submission_details`
- `id` (UUID, PK)
- `submission_id` (UUID, FK -> submissions.id)
- `question_id` (UUID, FK -> questions.id)
- `student_answer` (JSONB)
- `is_correct` (Boolean)
- `need_manual_review` (Boolean, Default: false)
- `points_earned` (Numeric)
- `explanation` (Text)

## Bảng `games`
- `id` (UUID, PK)
- `game_code` (Text, Unique)
- `name` (Text)
- `url` (Text)
- `image_url` (Text)
- `created_at` (Timestamptz)
- `is_deleted` (Boolean, Default: false)

## Bảng `system_settings`
- `key` (Text, PK) - e.g. 'ai_api_keys'
- `value` (JSONB)
- `updated_at` (Timestamptz)
