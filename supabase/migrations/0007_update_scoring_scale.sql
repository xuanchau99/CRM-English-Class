-- Migration: 0007_update_scoring_scale

-- Update submit_exam_result to use a 10-point scale for score
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
    v_parsed_matching TEXT;
BEGIN
    -- Kiểm tra đề thi
    SELECT id INTO v_exam_id FROM public.exams 
    WHERE exam_code = p_exam_code AND is_active = true AND is_deleted = false;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exam is not active or does not exist';
    END IF;

    -- Tính toán tổng điểm của đề thi
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
        v_student_ans := NULL;
        v_is_correct := false;
        v_points_earned := 0;

        SELECT value->>'answer' INTO v_student_ans
        FROM jsonb_array_elements(p_answers) AS val
        WHERE (val->>'question_id')::UUID = q_record.id;

        IF v_student_ans IS NULL OR TRIM(v_student_ans) = '' OR v_student_ans = '[]' OR v_student_ans = '{}' THEN
            v_unanswered_count := v_unanswered_count + 1;
        ELSE
            -- Logic chấm điểm tuỳ theo type
            IF q_record.type IN ('single_choice', 'true_false', 'vocabulary', 'arrange_sentence') THEN
                IF TRIM(v_student_ans) = TRIM(q_record.correct_answer #>> '{}') THEN
                    v_is_correct := true;
                END IF;
            ELSIF q_record.type = 'multiple_choice' THEN
                -- So sánh array (không phân biệt thứ tự) bằng Postgres array manipulation
                IF (
                    SELECT ARRAY(SELECT btrim(x) FROM unnest(string_to_array(v_student_ans, ',')) x ORDER BY 1) =
                           ARRAY(SELECT btrim(x) FROM unnest(string_to_array(q_record.correct_answer #>> '{}', ',')) x ORDER BY 1)
                ) THEN
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
            ELSIF q_record.type = 'matching' THEN
                -- Student answer is a JSON array string. Correct answer is newline separated string.
                -- We need to extract the elements from student answer and join them with \n
                BEGIN
                    SELECT string_agg(el, e'\n') INTO v_parsed_matching
                    FROM jsonb_array_elements_text(v_student_ans::jsonb) AS el;
                    
                    -- Compare ignoring \r since some environments mix \r\n and \n
                    IF REPLACE(TRIM(v_parsed_matching), e'\r', '') = REPLACE(TRIM(q_record.correct_answer #>> '{}'), e'\r', '') THEN
                        v_is_correct := true;
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- If JSON parsing fails, just compare strings directly as fallback
                    IF TRIM(v_student_ans) = TRIM(q_record.correct_answer #>> '{}') THEN
                        v_is_correct := true;
                    END IF;
                END;
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

    -- Cập nhật lại điểm số tổng quát (score là thang 10)
    UPDATE public.submissions SET
        score = CASE WHEN v_total_points > 0 THEN ROUND((v_score / v_total_points) * 10, 2) ELSE 0 END,
        percentage = CASE WHEN v_total_points > 0 THEN ROUND((v_score / v_total_points) * 100, 2) ELSE 0 END,
        correct_count = v_correct_count,
        wrong_count = v_wrong_count,
        unanswered_count = v_unanswered_count
    WHERE id = v_submission_id;

    RETURN v_submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function check_student_submission
CREATE OR REPLACE FUNCTION public.check_student_submission(
    p_exam_code TEXT,
    p_student_name TEXT,
    p_class_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exam_id UUID;
    v_exists BOOLEAN;
BEGIN
    SELECT id INTO v_exam_id FROM public.exams WHERE exam_code = p_exam_code;
    
    IF v_exam_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.submissions
        WHERE exam_id = v_exam_id
          AND LOWER(TRIM(student_name)) = LOWER(TRIM(p_student_name))
          AND LOWER(TRIM(class_name)) = LOWER(TRIM(p_class_name))
    ) INTO v_exists;

    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
