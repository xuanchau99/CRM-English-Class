-- Migration: 0005_exam_player_security
-- Các hàm RPC phục vụ cho học sinh (Student Player)

-- 1. Hàm lấy câu hỏi an toàn (giấu đáp án)
CREATE OR REPLACE FUNCTION public.get_student_questions(p_exam_code TEXT)
RETURNS TABLE (
    id UUID,
    question_code TEXT,
    type TEXT,
    level TEXT,
    question_text TEXT,
    options JSONB,
    points NUMERIC,
    order_index INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_code,
        q.type,
        q.level,
        q.question_text,
        q.options,
        q.points,
        q.order_index
    FROM public.questions q
    JOIN public.exams e ON q.exam_id = e.id
    WHERE e.exam_code = p_exam_code 
      AND e.is_active = true 
      AND e.is_deleted = false
      AND q.is_active = true
      AND q.is_deleted = false
    ORDER BY q.order_index ASC, q.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Hàm nộp bài và chấm điểm tự động an toàn
DROP FUNCTION IF EXISTS public.submit_exam_result(UUID, TEXT, TEXT, INTEGER, JSONB);
CREATE OR REPLACE FUNCTION public.submit_exam_result(
    p_exam_code TEXT,
    p_student_name TEXT,
    p_class_name TEXT,
    p_duration_seconds INTEGER,
    p_answers JSONB -- Dạng [{"question_id": "uuid", "answer": "text"}]
)
RETURNS UUID AS $$
DECLARE
    v_exam_id UUID;
    v_submission_id UUID;
    v_submission_code TEXT;
    v_total_points NUMERIC := 0;
    v_score NUMERIC := 0;
    v_correct_count INTEGER := 0;
    v_wrong_count INTEGER := 0;
    v_unanswered_count INTEGER := 0;
    
    q_record RECORD;
    v_is_correct BOOLEAN;
    v_student_ans TEXT;
    v_points_earned NUMERIC;
BEGIN
    -- Kiểm tra đề thi
    SELECT id INTO v_exam_id FROM public.exams 
    WHERE exam_code = p_exam_code AND is_active = true AND is_deleted = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exam is not active or does not exist';
    END IF;

    -- Tính toán tổng điểm của đề thi (chỉ lấy các câu hỏi đang active)
    SELECT COALESCE(SUM(points), 0) INTO v_total_points
    FROM public.questions
    WHERE exam_id = v_exam_id AND is_active = true AND is_deleted = false;

    -- Tạo mã submission ngẫu nhiên
    v_submission_code := 'SUB' || upper(substring(md5(random()::text) from 1 for 8));

    -- Tạo record submission ban đầu
    INSERT INTO public.submissions (
        submission_code, exam_id, student_name, class_name, duration_seconds, total_points
    )
    VALUES (
        v_submission_code, v_exam_id, p_student_name, p_class_name, p_duration_seconds, v_total_points
    )
    RETURNING id INTO v_submission_id;

    -- Bắt đầu vòng lặp chấm điểm
    FOR q_record IN 
        SELECT id, type, correct_answer, accepted_answers, points, explanation
        FROM public.questions 
        WHERE exam_id = v_exam_id AND is_active = true AND is_deleted = false
    LOOP
        -- Trích xuất câu trả lời của học sinh cho câu hỏi này từ p_answers (JSONB)
        v_student_ans := NULL;
        v_is_correct := false;
        v_points_earned := 0;

        SELECT value->>'answer' INTO v_student_ans
        FROM jsonb_array_elements(p_answers) AS val
        WHERE (val->>'question_id')::UUID = q_record.id;

        IF v_student_ans IS NULL OR TRIM(v_student_ans) = '' THEN
            v_unanswered_count := v_unanswered_count + 1;
        ELSE
            -- Logic chấm điểm tuỳ theo type
            IF q_record.type = 'multiple_choice' THEN
                IF TRIM(v_student_ans) = TRIM(q_record.correct_answer #>> '{}') THEN
                    v_is_correct := true;
                END IF;
            ELSIF q_record.type = 'fill_blank' THEN
                -- So sánh không phân biệt hoa thường
                IF LOWER(TRIM(v_student_ans)) = LOWER(TRIM(q_record.correct_answer #>> '{}')) THEN
                    v_is_correct := true;
                ELSE
                    -- Kiểm tra trong mảng accepted_answers
                    IF q_record.accepted_answers IS NOT NULL AND jsonb_typeof(q_record.accepted_answers) = 'array' THEN
                        IF EXISTS (
                            SELECT 1 FROM jsonb_array_elements_text(q_record.accepted_answers) AS acc_ans
                            WHERE LOWER(TRIM(v_student_ans)) = LOWER(TRIM(acc_ans))
                        ) THEN
                            v_is_correct := true;
                        END IF;
                    END IF;
                END IF;
            -- (Các type khác có thể mặc định false hoặc yêu cầu chấm tay)
            END IF;

            IF v_is_correct THEN
                v_correct_count := v_correct_count + 1;
                v_points_earned := q_record.points;
                v_score := v_score + v_points_earned;
            ELSE
                v_wrong_count := v_wrong_count + 1;
            END IF;
        END IF;

        -- Lưu chi tiết
        INSERT INTO public.submission_details (
            submission_id, question_id, student_answer, is_correct, points_earned, explanation
        ) VALUES (
            v_submission_id, q_record.id, to_jsonb(v_student_ans), v_is_correct, v_points_earned, q_record.explanation
        );

    END LOOP;

    -- Cập nhật lại điểm số tổng quát
    UPDATE public.submissions SET
        score = v_score,
        percentage = CASE WHEN v_total_points > 0 THEN ROUND((v_score / v_total_points) * 100, 2) ELSE 0 END,
        correct_count = v_correct_count,
        wrong_count = v_wrong_count,
        unanswered_count = v_unanswered_count
    WHERE id = v_submission_id;

    RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
