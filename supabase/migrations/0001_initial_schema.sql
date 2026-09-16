-- Migration: 0001_initial_schema
-- Tạo các bảng cấu trúc hệ thống

-- Kích hoạt extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bảng profiles (Thông tin giáo viên/admin)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'teacher',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng exams (Đề thi)
CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_code TEXT UNIQUE,
    title TEXT NOT NULL,
    duration_minutes INTEGER,
    shuffle_questions BOOLEAN DEFAULT false,
    shuffle_options BOOLEAN DEFAULT false,
    show_result BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Bảng questions (Câu hỏi)
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_code TEXT,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    level TEXT,
    question_text TEXT,
    options JSONB,
    correct_answer JSONB,
    accepted_answers JSONB,
    explanation TEXT,
    points NUMERIC DEFAULT 1,
    tags TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Ràng buộc Unique cho question_code trong 1 đề thi (nếu chưa xoá)
CREATE UNIQUE INDEX idx_unique_question_code 
ON public.questions (exam_id, question_code) 
WHERE is_deleted = false;

-- Bảng submissions (Bài nộp tổng quan)
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_code TEXT UNIQUE,
    exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
    student_name TEXT,
    class_name TEXT,
    score NUMERIC DEFAULT 0,
    total_points NUMERIC DEFAULT 0,
    percentage NUMERIC DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    unanswered_count INTEGER DEFAULT 0,
    manual_review_count INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Bảng submission_details (Chi tiết từng câu)
CREATE TABLE public.submission_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    student_answer JSONB,
    is_correct BOOLEAN,
    need_manual_review BOOLEAN DEFAULT false,
    points_earned NUMERIC DEFAULT 0,
    explanation TEXT
);

-- Bảng games
CREATE TABLE public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_code TEXT UNIQUE,
    name TEXT,
    url TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false
);

-- Bảng system_settings
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
