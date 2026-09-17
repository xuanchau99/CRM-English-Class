-- MIGRATION DỮ LIỆU TỪ EXCEL CŨ (Chạy trong SQL Editor)

DO $$
DECLARE
  v_teacher_id UUID;
  v_exam_id UUID;
BEGIN
  -- Lấy ID của giáo viên đầu tiên
  SELECT id INTO v_teacher_id FROM public.profiles LIMIT 1;

  -- Đề thi: E5 U1
  INSERT INTO public.exams (exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result, is_active, teacher_id)
  VALUES ('ENG_317752', 'E5 U1', 15, true, true, true, true, v_teacher_id)
  ON CONFLICT (exam_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_exam_id;

  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q5256207490',
    'matching',
    'medium',
    'Nice to meet you.
What''s your favourite sport?
Where do you live?
What''s you favourite food?
Can you tell me about yourself?
What''s your favourite colour?
Where were you yesterday?
Do you like pizza?
Do you like sandwich?',
    NULL,
    '["Nice to meet you","too.\r\nMy favourite sport is table tennis.\r\nI live in the countryside.\r\nIt''s a sandwich.\r\nMy name is Mary. I''m in class 5C.\r\nIt''s Yellow.\r\nI was at the zoo.\r\nNo","I don''t. I like sandwich.\r\nYes","I do."]'::jsonb,
    '["Nice to meet you, too.\r\nMy favourite sport is table tennis.\r\nI live in the countryside.\r\nIt''s a sandwich.\r\nMy name is Mary. I''m in class 5C.\r\nIt''s Yellow.\r\nI was at the zoo.\r\nNo, I don''t. I like sandwich.\r\nYes, I do."]'::jsonb,
    'Nối các câu diễn đạt sự thật/thói quen tương ứng với ý nghĩa của chúng.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q5256205011',
    'arrange_sentence',
    'medium',
    'What''s your favourite animal?
My favourite sport is baseball.
I live in the city.
My favourite food is fish and chips.
She is in grade 5.
Can you tell me about yourself?
My hobby is playing sports.
I don''t like pizza, but I like sandwiches.
My favourite subject is English.
I love playing table tennis.',
    NULL,
    '["What''s your favourite animal?\r\nMy favourite sport is baseball.\r\nI live in the city.\r\nMy favourite food is fish and chips.\r\nShe is in grade 5.\r\nCan you tell me about yourself?\r\nMy hobby is playing sports.\r\nI don''t like pizza","but I like sandwiches.\r\nMy favourite subject is English.\r\nI love playing table tennis."]'::jsonb,
    '["What''s your favourite animal?\r\nMy favourite sport is baseball.\r\nI live in the city.\r\nMy favourite food is fish and chips.\r\nShe is in grade 5.\r\nCan you tell me about yourself?\r\nMy hobby is playing sports.\r\nI don''t like pizza, but I like sandwiches.\r\nMy favourite subject is English.\r\nI love playing table tennis."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010346150',
    'matching',
    'medium',
    'Nice to meet you.
What''s your favourite sport?
Where do you live?
What''s you favourite food?
Can you tell me about yourself?
What''s your favourite colour?
Where were you yesterday?
Do you like pizza?
Do you like sandwich?',
    NULL,
    '["Nice to meet you","too.\r\nMy favourite sport is table tennis.\r\nI live in the countryside.\r\nIt''s a sandwich.\r\nMy name is Mary. I''m in class 5C.\r\nIt''s Yellow.\r\nI was at the zoo.\r\nNo","I don''t. I like sandwich.\r\nYes","I do."]'::jsonb,
    '["Nice to meet you, too.\r\nMy favourite sport is table tennis.\r\nI live in the countryside.\r\nIt''s a sandwich.\r\nMy name is Mary. I''m in class 5C.\r\nIt''s Yellow.\r\nI was at the zoo.\r\nNo, I don''t. I like sandwich.\r\nYes, I do."]'::jsonb,
    'Nối các câu diễn đạt sự thật/thói quen tương ứng với ý nghĩa của chúng.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010346821',
    'arrange_sentence',
    'medium',
    'What''s your favourite animal?',
    NULL,
    '["What''s your favourite animal?"]'::jsonb,
    '["What''s your favourite animal?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010349822',
    'arrange_sentence',
    'medium',
    'My favourite sport is baseball.',
    NULL,
    '["My favourite sport is baseball."]'::jsonb,
    '["My favourite sport is baseball."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010348543',
    'arrange_sentence',
    'medium',
    'I live in the city.',
    NULL,
    '["I live in the city."]'::jsonb,
    '["I live in the city."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q101034154',
    'arrange_sentence',
    'medium',
    'My favourite food is fish and chips.',
    NULL,
    '["My favourite food is fish and chips."]'::jsonb,
    '["My favourite food is fish and chips."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010349095',
    'arrange_sentence',
    'medium',
    'She is in grade 5.',
    NULL,
    '["She is in grade 5."]'::jsonb,
    '["She is in grade 5."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010348996',
    'arrange_sentence',
    'medium',
    'Can you tell me about yourself?',
    NULL,
    '["Can you tell me about yourself?"]'::jsonb,
    '["Can you tell me about yourself?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010344107',
    'arrange_sentence',
    'medium',
    'My hobby is playing sports.',
    NULL,
    '["My hobby is playing sports."]'::jsonb,
    '["My hobby is playing sports."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010348928',
    'arrange_sentence',
    'medium',
    'I don''t like pizza, but I like sandwiches.',
    NULL,
    '["I don''t like pizza","but I like sandwiches."]'::jsonb,
    '["I don''t like pizza, but I like sandwiches."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1010341209',
    'arrange_sentence',
    'medium',
    'My favourite subject is English.',
    NULL,
    '["My favourite subject is English."]'::jsonb,
    '["My favourite subject is English."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q10103452810',
    'arrange_sentence',
    'medium',
    'I love playing table tennis.',
    NULL,
    '["I love playing table tennis."]'::jsonb,
    '["I love playing table tennis."]'::jsonb,
    '',
    1,
    '',
    true
  );

  -- Đề thi: E4 U1
  INSERT INTO public.exams (exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result, is_active, teacher_id)
  VALUES ('ENG_828390', 'E4 U1', 15, true, true, true, true, v_teacher_id)
  ON CONFLICT (exam_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_exam_id;

  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114118810',
    'arrange_sentence',
    'medium',
    'What time is it?',
    NULL,
    '["What time is it?"]'::jsonb,
    '["What time is it?"]'::jsonb,
    'Sắp xếp theo trật tự: S + trạng từ chỉ tần suất + V + O + cụm thời gian.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114118671',
    'arrange_sentence',
    'medium',
    'What time do you get up?',
    NULL,
    '["What time do you get up?"]'::jsonb,
    '["What time do you get up?"]'::jsonb,
    'Sắp xếp theo trật tự: S + trạng từ chỉ tần suất + V + O + cụm thời gian.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114113602',
    'arrange_sentence',
    'medium',
    'I have breakfast at six thirty.',
    NULL,
    '["I have breakfast at six thirty."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114118073',
    'arrange_sentence',
    'medium',
    'What time do you go to school?',
    NULL,
    '["What time do you go to school?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114112514',
    'arrange_sentence',
    'medium',
    'I get up at six o''clock.',
    NULL,
    '["I get up at six o''clock."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114113525',
    'arrange_sentence',
    'medium',
    'It''s five forty- five.',
    NULL,
    '["It''s five forty- five."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114113466',
    'arrange_sentence',
    'medium',
    'What time do you go to bed?',
    NULL,
    '["What time do you go to bed?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114116547',
    'arrange_sentence',
    'medium',
    'What time do you have dinner?',
    NULL,
    '["What time do you have dinner?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114119728',
    'arrange_sentence',
    'medium',
    'I have dinner at six thirty.',
    NULL,
    '["I have dinner at six thirty."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114119639',
    'arrange_sentence',
    'medium',
    'What time do you have breakfast?',
    NULL,
    '["What time do you have breakfast?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141171810',
    'arrange_sentence',
    'medium',
    'What time is it, Mai?',
    NULL,
    '["What time is it","Mai?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141191111',
    'arrange_sentence',
    'medium',
    'It is seven o''clock.',
    NULL,
    '["It is seven o''clock."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141138812',
    'arrange_sentence',
    'medium',
    'I do my homework and go to bed at nine forty- five.',
    NULL,
    '["I do my homework and go to bed at nine forty- five."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141197613',
    'arrange_sentence',
    'medium',
    'She is from Britain.',
    NULL,
    '["She is from Britain."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141161314',
    'arrange_sentence',
    'medium',
    'Where are you from?',
    NULL,
    '["Where are you from?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141130315',
    'arrange_sentence',
    'medium',
    'Where is he from?',
    NULL,
    '["Where is he from?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q4114112716',
    'arrange_sentence',
    'medium',
    'He is from America.',
    NULL,
    '["He is from America."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141167917',
    'arrange_sentence',
    'medium',
    'I''m from Viet Nam.',
    NULL,
    '["I''m from Viet Nam."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141182218',
    'arrange_sentence',
    'medium',
    'Where''s she from?',
    NULL,
    '["Where''s she from?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q41141139419',
    'arrange_sentence',
    'medium',
    'Mary is from Australia.',
    NULL,
    '["Mary is from Australia."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );

  -- Đề thi: E5 U2
  INSERT INTO public.exams (exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result, is_active, teacher_id)
  VALUES ('ENG_966821', 'E5 U2', 15, true, true, true, true, v_teacher_id)
  ON CONFLICT (exam_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_exam_id;

  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941456210',
    'matching',
    'medium',
    'Do you
It''s 
I live in a
What''s your',
    NULL,
    '["live in that tower?\r\n60 Hoa Binh street. \r\nFlat in Lotus tower.\r\nAddress?"]'::jsonb,
    '["live in that tower?\r\n60 Hoa Binh street. \r\nFlat in Lotus tower.\r\nAddress?"]'::jsonb,
    'Nối các câu diễn đạt sự thật/thói quen tương ứng với ý nghĩa của chúng.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941453281',
    'arrange_sentence',
    'medium',
    'He lives at fifteen Green street.',
    NULL,
    '["He lives at fifteen Green street."]'::jsonb,
    '["He lives at fifteen Green street."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941457262',
    'arrange_sentence',
    'medium',
    'My address is 116 Hung Vuong street.',
    NULL,
    '["My address is 116 Hung Vuong street."]'::jsonb,
    '["My address is 116 Hung Vuong street."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941455953',
    'arrange_sentence',
    'medium',
    'I live in a house in the countryside.',
    NULL,
    '["I live in a house in the countryside."]'::jsonb,
    '["I live in a house in the countryside."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941451904',
    'arrange_sentence',
    'medium',
    'Her address is 07 Green strret.',
    NULL,
    '["Her address is 07 Green strret."]'::jsonb,
    '["Her address is 07 Green strret."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q194145155',
    'arrange_sentence',
    'medium',
    'Do you live in this flat?',
    NULL,
    '["Do you live in this flat?"]'::jsonb,
    '["Do you live in this flat?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941459846',
    'arrange_sentence',
    'medium',
    'His address is 83 Oxford street.',
    NULL,
    '["His address is 83 Oxford street."]'::jsonb,
    '["His address is 83 Oxford street."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941453767',
    'arrange_sentence',
    'medium',
    'My friend lives in a building in the city.',
    NULL,
    '["My friend lives in a building in the city."]'::jsonb,
    '["My friend lives in a building in the city."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941451468',
    'arrange_sentence',
    'medium',
    'I live in a flat in ThongNhat building.',
    NULL,
    '["I live in a flat in ThongNhat building."]'::jsonb,
    '["I live in a flat in ThongNhat building."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q1941455829',
    'arrange_sentence',
    'medium',
    'My address is 95 George street.',
    NULL,
    '["My address is 95 George street."]'::jsonb,
    '["My address is 95 George street."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414552510',
    'arrange_sentence',
    'medium',
    'What''s your address?',
    NULL,
    '["What''s your address?"]'::jsonb,
    '["What''s your address?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414559711',
    'arrange_sentence',
    'medium',
    'Do you live in that house?',
    NULL,
    '["Do you live in that house?"]'::jsonb,
    '["Do you live in that house?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414534912',
    'arrange_sentence',
    'medium',
    'It''s 23 LeLoi street.',
    NULL,
    '["It''s 23 LeLoi street."]'::jsonb,
    '["It''s 23 LeLoi street."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414519013',
    'arrange_sentence',
    'medium',
    'Mary lives in flat 15.',
    NULL,
    '["Mary lives in flat 15."]'::jsonb,
    '["Mary lives in flat 15."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414571314',
    'arrange_sentence',
    'medium',
    'It''s about 1 kilometre from here.',
    NULL,
    '["It''s about 1 kilometre from here."]'::jsonb,
    '["It''s about 1 kilometre from here."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414592915',
    'arrange_sentence',
    'medium',
    'Do they live in that tower?',
    NULL,
    '["Do they live in that tower?"]'::jsonb,
    '["Do they live in that tower?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414587516',
    'arrange_sentence',
    'medium',
    'It is about 8 kilometre from my home.',
    NULL,
    '["It is about 8 kilometre from my home."]'::jsonb,
    '["It is about 8 kilometre from my home."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414559517',
    'arrange_sentence',
    'medium',
    'I live in flat 15, Lotus building.',
    NULL,
    '["I live in flat 15","Lotus building."]'::jsonb,
    '["I live in flat 15, Lotus building."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414518618',
    'arrange_sentence',
    'medium',
    'It is about 8 kilometre from my home.',
    NULL,
    '["It is about 8 kilometre from my home."]'::jsonb,
    '["It is about 8 kilometre from my home."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414534619',
    'arrange_sentence',
    'medium',
    'What''s the address of your best friend?',
    NULL,
    '["What''s the address of your best friend?"]'::jsonb,
    '["What''s the address of your best friend?"]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414579620',
    'arrange_sentence',
    'medium',
    'It''s 53 George street, Sydney.',
    NULL,
    '["It''s 53 George street","Sydney."]'::jsonb,
    '["It''s 53 George street, Sydney."]'::jsonb,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q19414519421',
    'matching',
    'medium',
    'Do you live near the school?
What''s your address?
Is it far from here?
Where do you live?',
    NULL,
    '["Yes I do. I live about 1 kilometre from here.\r\nIt''s 38 Dien Bien street.\r\nYes it is. It''s about 10 kilometres from here.\r\nI live in that buildign over there."]'::jsonb,
    '["Yes I do. I live about 1 kilometre from here.\r\nIt''s 38 Dien Bien street.\r\nYes it is. It''s about 10 kilometres from here.\r\nI live in that buildign over there."]'::jsonb,
    'Nối các câu diễn đạt sự thật/thói quen tương ứng với ý nghĩa của chúng.',
    1,
    '',
    true
  );

  -- Đề thi: E3 U1
  INSERT INTO public.exams (exam_code, title, duration_minutes, shuffle_questions, shuffle_options, show_result, is_active, teacher_id)
  VALUES ('ENG_751706', 'E3 U1', 15, true, true, true, true, v_teacher_id)
  ON CONFLICT (exam_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id INTO v_exam_id;

  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q759206200',
    'arrange_sentence',
    'medium',
    'Hello. I''m Linh.',
    NULL,
    '["Hello. I''m Linh."]'::jsonb,
    '["Hello. I''m Linh."]'::jsonb,
    'Sắp xếp theo trật tự: S + trạng từ chỉ tần suất + V + O + cụm thời gian.',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592063391',
    'arrange_sentence',
    'medium',
    'Hi Lucy, I''m Mai.',
    NULL,
    '["Hi Lucy","I''m Mai."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592066932',
    'arrange_sentence',
    'medium',
    'How are you?',
    NULL,
    '["How are you?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592067093',
    'arrange_sentence',
    'medium',
    'Fine, thank you.',
    NULL,
    '["Fine","thank you."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592068844',
    'arrange_sentence',
    'medium',
    'How are you, Nam?',
    NULL,
    '["How are you","Nam?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592066025',
    'arrange_sentence',
    'medium',
    'Good bye, Ben.',
    NULL,
    '["Good bye","Ben."]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q7592062656',
    'arrange_sentence',
    'medium',
    'Bye, Mai',
    NULL,
    '["Bye","Mai"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );
  INSERT INTO public.questions (exam_id, question_code, type, level, question_text, options, correct_answer, accepted_answers, explanation, points, tags, is_active)
  VALUES (
    v_exam_id,
    'Q759206767',
    'arrange_sentence',
    'medium',
    'Hi Minh, How are you?',
    NULL,
    '["Hi Minh","How are you?"]'::jsonb,
    NULL,
    '',
    1,
    '',
    true
  );

END;
$$;
