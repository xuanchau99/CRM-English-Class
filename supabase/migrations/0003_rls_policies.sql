-- Migration: 0003_rls_policies
-- Thiết lập Row Level Security (RLS)

-- Bật RLS trên tất cả các bảng
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. Policies cho bảng profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Policies cho bảng exams
-- Student / Anonymous: Chỉ xem đề active và chưa xoá
CREATE POLICY "Anyone can view active exams" ON public.exams FOR SELECT USING (is_active = true AND is_deleted = false);
-- Teacher: Xem, thêm, sửa đề của mình
CREATE POLICY "Teachers can view their own exams" ON public.exams FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert their own exams" ON public.exams FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teachers can update their own exams" ON public.exams FOR UPDATE USING (auth.uid() = teacher_id);

-- 3. Policies cho bảng questions
-- Student: Chỉ xem câu hỏi của đề active
CREATE POLICY "Anyone can view questions of active exams" ON public.questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.exams WHERE id = public.questions.exam_id AND is_active = true AND is_deleted = false)
    AND is_deleted = false
);
-- Teacher: Quản lý câu hỏi trong đề của mình
CREATE POLICY "Teachers can manage questions of their exams" ON public.questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.exams WHERE id = public.questions.exam_id AND teacher_id = auth.uid())
);

-- 4. Policies cho bảng submissions
-- Teacher: Quản lý bài làm của học sinh thi đề của mình
CREATE POLICY "Teachers can view submissions of their exams" ON public.submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.exams WHERE id = public.submissions.exam_id AND teacher_id = auth.uid())
);
CREATE POLICY "Teachers can update submissions of their exams" ON public.submissions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.exams WHERE id = public.submissions.exam_id AND teacher_id = auth.uid())
);
-- Student: Việc tạo bài thi thông qua RPC (SECURITY DEFINER) bypass RLS nên không cần quyền INSERT trực tiếp ở đây.
-- Việc học sinh xem điểm của chính mình thông qua UUID của submission. (URL: /result/<uuid>)
CREATE POLICY "Students can view their own submission via unique ID" ON public.submissions FOR SELECT USING (is_deleted = false);

-- 5. Policies cho bảng submission_details
-- Teacher: Tương tự submissions
CREATE POLICY "Teachers can manage submission details of their exams" ON public.submission_details FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.submissions s
        JOIN public.exams e ON s.exam_id = e.id
        WHERE s.id = public.submission_details.submission_id AND e.teacher_id = auth.uid()
    )
);
-- Student: Xem chi tiết bài của mình
CREATE POLICY "Students can view details of their submission" ON public.submission_details FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.submissions WHERE id = public.submission_details.submission_id AND is_deleted = false)
);

-- 6. Policies cho bảng games
CREATE POLICY "Anyone can view games" ON public.games FOR SELECT USING (is_deleted = false);
CREATE POLICY "Teachers can manage games" ON public.games FOR ALL USING (auth.uid() IS NOT NULL);

-- 7. Policies cho bảng system_settings
CREATE POLICY "Only authenticated teachers can view/manage settings" ON public.system_settings FOR ALL USING (auth.uid() IS NOT NULL);
