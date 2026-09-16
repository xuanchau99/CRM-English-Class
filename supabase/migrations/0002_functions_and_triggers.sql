-- Migration: 0002_functions_and_triggers
-- Tạo các hàm và trigger

-- 1. Hàm tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger cho các bảng
CREATE TRIGGER set_updated_at_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_exams
BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_questions
BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_games
BEFORE UPDATE ON public.games
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_updated_at_system_settings
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();


-- 2. Hàm tự động tạo profile khi user mới đăng ký trên Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        'teacher'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger chạy khi có user mới
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. RPC submit_exam_result: Học sinh nộp bài (Khung sườn, logic tính điểm hoàn thiện sau)
CREATE OR REPLACE FUNCTION public.submit_exam_result(
    p_exam_id UUID,
    p_student_name TEXT,
    p_class_name TEXT,
    p_duration_seconds INTEGER,
    p_answers JSONB -- Dạng [{"question_id": "uuid", "answer": "text/json"}]
)
RETURNS UUID AS $$
DECLARE
    v_submission_id UUID;
BEGIN
    -- Kiểm tra đề thi có active không
    IF NOT EXISTS (SELECT 1 FROM public.exams WHERE id = p_exam_id AND is_active = true AND is_deleted = false) THEN
        RAISE EXCEPTION 'Exam is not active or does not exist';
    END IF;

    -- Insert vào bảng submissions (điểm sẽ là 0 ban đầu)
    INSERT INTO public.submissions (
        exam_id, student_name, class_name, duration_seconds
    )
    VALUES (
        p_exam_id, p_student_name, p_class_name, p_duration_seconds
    )
    RETURNING id INTO v_submission_id;

    -- (TODO: Chèn logic vòng lặp chấm điểm chi tiết và INSERT vào submission_details ở đây)

    RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
