-- Return matching column B as shuffled options without exposing answer fields.
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
        CASE WHEN q.type = 'matching' THEN (
            SELECT COALESCE(jsonb_agg(TRIM(item) ORDER BY random()), '[]'::JSONB)
            FROM regexp_split_to_table(q.correct_answer #>> '{}', E'\\r?\\n') AS item
            WHERE TRIM(item) <> ''
        ) ELSE q.options END,
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
