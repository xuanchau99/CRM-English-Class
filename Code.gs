const SPREADSHEET_ID = '1I_fWLSj-LXyMBziTy38y-2AgbyCEgTloqKbHrEz3_T0'; // Replace with your Google Sheet ID

function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'getExams':
        const teacherId = e.parameter.teacherId || '';
        return createJsonResponse({ status: 'success', data: getExams(teacherId) });
      case 'getQuestions':
        const examId = e.parameter.examId;
        if (!examId) throw new Error('examId parameter is required for getQuestions.');
        return createJsonResponse({ status: 'success', data: getQuestions(examId) });
      case 'getGames':
        return createJsonResponse({ status: 'success', data: getGames() });
      case 'getSubmissions':
        return createJsonResponse({ status: 'success', data: getSubmissions() });
      case 'getSubmissionDetails':
        const submissionId = e.parameter.submissionId;
        if (!submissionId) throw new Error('submissionId parameter is required.');
        return createJsonResponse({ status: 'success', data: getSubmissionDetails(submissionId) });
      case 'healthCheck':
        return createJsonResponse({ status: 'OK', message: 'Apps Script is running.' });
      default:
        throw new Error('Invalid action for GET request: ' + action);
    }
  } catch (error) {
    console.error('Error in doGet:', error.message, error.stack);
    return createErrorResponse(error.message);
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const payload = JSON.parse(e.postData.contents);

  try {
    switch (action) {
      case 'login':
        return createJsonResponse(loginTeacher(payload));
      case 'saveExam':
        return createJsonResponse(saveExam(payload));
      case 'importQuestions':
        return createJsonResponse(importQuestions(payload));
      case 'submitResult':
        return createJsonResponse(submitResult(payload));
      case 'editQuestion':
        return createJsonResponse(editQuestion(payload));
      case 'deleteQuestion':
        return createJsonResponse(deleteQuestion(payload));
      case 'editExam':
        return createJsonResponse(editExam(payload));
      case 'deleteExam':
        return createJsonResponse(deleteExam(payload));
      case 'saveGame':
        return createJsonResponse(saveGame(payload));
      case 'deleteGame':
        return createJsonResponse(deleteGame(payload));
      case 'deleteSubmission':
        return createJsonResponse(deleteSubmission(payload));
      default:
        throw new Error('Invalid action for POST request: ' + action);
    }
  } catch (error) {
    console.error('Error in doPost:', error.message, error.stack);
    return createErrorResponse(error.message);
  }
}

// --- Sheet Helper Functions ---
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    // Add headers if the sheet is new
    switch (sheetName) {
      case 'Exams':
        sheet.appendRow(['exam_id', 'title', 'duration_minutes', 'shuffle_questions', 'shuffle_options', 'show_result', 'active', 'teacher_id', 'created_at']);
        break;
      case 'Teachers':
        sheet.appendRow(['username', 'password', 'name', 'phone']);
        break;
      case 'Questions':
        sheet.appendRow(['question_id', 'exam_id', 'type', 'level', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'accepted_answers', 'explanation', 'points', 'tags', 'active']);
        break;
      case 'Submissions':
        sheet.appendRow(['submission_id', 'exam_id', 'exam_title', 'student_id', 'student_name', 'class_name', 'score', 'total_points', 'percentage', 'correct_count', 'wrong_count', 'unanswered_count', 'manual_review_count', 'duration_seconds', 'submitted_at']);
        break;
      case 'SubmissionDetails':
        sheet.appendRow(['submission_id', 'question_id', 'question_type', 'question_text', 'student_answer', 'correct_answer', 'is_correct', 'need_manual_review', 'points', 'points_earned', 'explanation']);
        break;
      case 'ManagerGames':
        sheet.appendRow(['game_id', 'name', 'url', 'image_url', 'created_at']);
        break;
    }
  }
  return sheet;
}

function getRowsData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length === 0) return [];
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      rowObject[headers[j]] = row[j];
    }
    data.push(rowObject);
  }
  return data;
}

// --- API Functions ---

// Auto-add teacher_id column to Exams sheet if missing
function ensureExamsHasTeacherIdColumn() {
  const sheet = getSheet('Exams');
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return; // empty sheet
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  if (!headers.includes('teacher_id')) {
    // Insert teacher_id before created_at (or append at end)
    const createdAtIdx = headers.indexOf('created_at');
    const insertCol = createdAtIdx >= 0 ? createdAtIdx + 1 : lastCol + 1;
    sheet.insertColumnBefore(insertCol);
    sheet.getRange(1, insertCol).setValue('teacher_id');
  }
}

function getExams(teacherId) {
  ensureExamsHasTeacherIdColumn();
  const sheet = getSheet('Exams');
  const all = getRowsData(sheet);
  if (teacherId) {
    return all.filter(function(e) { return String(e.teacher_id) === String(teacherId); });
  }
  return all;
}

function loginTeacher(payload) {
  const sheet = getSheet('Teachers');
  const teachers = getRowsData(sheet);
  const teacher = teachers.find(function(t) {
    return String(t.username).trim() === String(payload.username).trim() &&
           String(t.password).trim() === String(payload.password).trim();
  });
  if (!teacher) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
  return { status: 'success', data: { username: teacher.username, name: teacher.name, phone: teacher.phone } };
}

function getQuestions(examId) {
  const sheet = getSheet('Questions');
  const allQuestions = getRowsData(sheet);
  return allQuestions.filter(q => String(q.exam_id) === String(examId));
}

function saveExam(examPayload) {
  ensureExamsHasTeacherIdColumn();
  const sheet = getSheet('Exams');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = [];
  
  // Check for duplicate exam_id
  const existingExams = getRowsData(sheet);
  if (existingExams.some(exam => exam.exam_id === examPayload.exam_id)) {
    throw new Error(`Exam with ID '${examPayload.exam_id}' already exists.`);
  }

  for (const header of headers) {
    let value = examPayload[header];
    if (value !== null && value !== undefined) {
      try {
        const strVal = String(value).trim().toLowerCase();
        if (strVal === 'true') value = true;
        if (strVal === 'false') value = false;
      } catch (e) {}
    }
    newRow.push(value !== undefined ? value : '');
  }
  sheet.appendRow(newRow);
  return { status: 'success', message: 'Exam saved successfully', exam_id: examPayload.exam_id };
}

function importQuestions(questionsPayload) {
  const sheet = getSheet('Questions');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existingQuestions = getRowsData(sheet);
  const appendedQuestions = [];
  const validTypes = ['multiple_choice', 'single_choice', 'true_false', 'fill_blank', 'arrange_sentence', 'vocabulary', 'matching', 'short_answer'];

  for (let i = 0; i < questionsPayload.length; i++) {
    const question = questionsPayload[i];
    const rowNum = i + 2; // Excel row number

    // Validate required fields
    if (!question.question_id) throw new Error(`Row ${rowNum}: 'question_id' is missing.`);
    if (!question.exam_id) throw new Error(`Row ${rowNum} (ID: ${question.question_id}): 'exam_id' is missing.`);
    if (!question.type) throw new Error(`Row ${rowNum} (ID: ${question.question_id}): 'type' is missing.`);
    const correctAnswerOptional = ['short_answer', 'matching'].includes(String(question.type).trim().toLowerCase());
    if (!correctAnswerOptional && (question.correct_answer === undefined || question.correct_answer === null || String(question.correct_answer).trim() === '')) {
      throw new Error(`Row ${rowNum} (ID: ${question.question_id}): 'correct_answer' is missing.`);
    }

    // Validate type
    if (validTypes.indexOf(question.type) === -1) {
      throw new Error(`Row ${rowNum} (ID: ${question.question_id}): Invalid question type '${question.type}'.`);
    }

    // Check for duplicate question_id within the same exam_id
    if (existingQuestions.some(q => q.exam_id === question.exam_id && q.question_id === question.question_id)) {
      throw new Error(`Duplicate question_id '${question.question_id}' found for exam '${question.exam_id}'.`);
    }
    // Check for duplicates within the payload itself
    if (questionsPayload.slice(0, i).some(q => q.exam_id === question.exam_id && q.question_id === question.question_id)) {
      throw new Error(`Row ${rowNum}: Duplicate question_id '${question.question_id}' found within the import file for exam '${question.exam_id}'.`);
    }

    const newRow = [];
    for (const header of headers) {
      let value = question[header];
      if (value !== null && value !== undefined) {
        try {
          const strVal = String(value).trim();
          if (strVal.toLowerCase() === 'true') value = true;
          else if (strVal.toLowerCase() === 'false') value = false;
          // Keep accepted_answers as string — do NOT parse to array
          // GAS appendRow converts JS arrays to Java arrays → shows as [Ljava.lang.Object;@...
        } catch (e) {}
      }
      newRow.push(value !== undefined ? value : '');
    }
    sheet.appendRow(newRow);
    appendedQuestions.push(question.question_id);
  }
  return { status: 'success', message: `${appendedQuestions.length} questions imported successfully`, imported_question_ids: appendedQuestions };
}

function submitResult(submissionPayload) {
  const submissionSheet = getSheet('Submissions');
  const submissionDetailSheet = getSheet('SubmissionDetails');

  const submissionSummary = submissionPayload.summary;
  const submissionDetails = submissionPayload.details;

  // Safety checks for completely empty sheets
  if (submissionSheet.getLastColumn() === 0) {
    submissionSheet.appendRow(['submission_id', 'exam_id', 'exam_title', 'student_id', 'student_name', 'class_name', 'score', 'total_points', 'percentage', 'correct_count', 'wrong_count', 'unanswered_count', 'manual_review_count', 'duration_seconds', 'submitted_at']);
  }
  if (submissionDetailSheet.getLastColumn() === 0) {
    submissionDetailSheet.appendRow(['submission_id', 'question_id', 'question_type', 'question_text', 'student_answer', 'correct_answer', 'is_correct', 'need_manual_review', 'points', 'points_earned', 'explanation']);
  }

  // Check for duplicate submission_id
  const existingSubmissions = getRowsData(submissionSheet);
  if (existingSubmissions.some(s => s.submission_id === submissionSummary.submission_id)) {
    return { status: 'success', message: 'Submission already exists (duplicate check)', submission_id: submissionSummary.submission_id };
  }

  // Append submission summary
  const summaryHeaders = submissionSheet.getRange(1, 1, 1, submissionSheet.getLastColumn()).getValues()[0];
  const summaryRow = [];
  for (const header of summaryHeaders) {
    summaryRow.push(submissionSummary[header] !== undefined ? submissionSummary[header] : '');
  }
  submissionSheet.appendRow(summaryRow);

  // Append submission details
  const detailHeaders = submissionDetailSheet.getRange(1, 1, 1, submissionDetailSheet.getLastColumn()).getValues()[0];
  for (const detail of submissionDetails) {
    const detailRow = [];
    for (const header of detailHeaders) {
      detailRow.push(detail[header] !== undefined ? detail[header] : '');
    }
    submissionDetailSheet.appendRow(detailRow);
  }

  return { status: 'success', message: 'Submission saved successfully', submission_id: submissionSummary.submission_id };
}

function editQuestion(qPayload) {
  const sheet = getSheet('Questions');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0]) === String(qPayload.question_id) && String(row[1]) === String(qPayload.exam_id)) {
      rowIndex = i + 1; // 1-based row index in Google Sheet
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error(`Question with ID '${qPayload.question_id}' and Exam ID '${qPayload.exam_id}' not found.`);
  }
  
  const updatedRow = [];
  for (const header of headers) {
    let value = qPayload[header];
    if (value !== null && value !== undefined) {
      try {
        const strVal = String(value).trim().toLowerCase();
        if (strVal === 'true') value = true;
        if (strVal === 'false') value = false;
      } catch (e) {}
    }
    updatedRow.push(value !== undefined ? value : '');
  }
  
  const range = sheet.getRange(rowIndex, 1, 1, headers.length);
  range.setValues([updatedRow]);
  return { status: 'success', message: 'Question updated successfully', question_id: qPayload.question_id };
}

function deleteQuestion(qPayload) {
  const sheet = getSheet('Questions');
  const rows = sheet.getDataRange().getValues();
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0]) === String(qPayload.question_id) && String(row[1]) === String(qPayload.exam_id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error(`Question with ID '${qPayload.question_id}' and Exam ID '${qPayload.exam_id}' not found.`);
  }
  
  sheet.deleteRow(rowIndex);
  return { status: 'success', message: 'Question deleted successfully', question_id: qPayload.question_id };
}

function editExam(examPayload) {
  const sheet = getSheet('Exams');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(examPayload.exam_id)) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error(`Exam with ID '${examPayload.exam_id}' not found.`);
  }
  
  const updatedRow = [];
  for (const header of headers) {
    let value = examPayload[header];
    if (value !== null && value !== undefined) {
      try {
        const strVal = String(value).trim().toLowerCase();
        if (strVal === 'true') value = true;
        if (strVal === 'false') value = false;
      } catch (e) {}
    }
    // If field is undefined, keep existing sheet cell value
    const valIndex = headers.indexOf(header);
    updatedRow.push(value !== undefined ? value : rows[rowIndex - 1][valIndex]);
  }
  
  const range = sheet.getRange(rowIndex, 1, 1, headers.length);
  range.setValues([updatedRow]);
  return { status: 'success', message: 'Exam updated successfully', exam_id: examPayload.exam_id };
}

function deleteExam(examPayload) {
  const examId = examPayload.exam_id;
  
  // 1. Delete Exam row
  const examSheet = getSheet('Exams');
  const examRows = examSheet.getDataRange().getValues();
  let examRowIndex = -1;
  for (let i = 1; i < examRows.length; i++) {
    if (String(examRows[i][0]) === String(examId)) {
      examRowIndex = i + 1;
      break;
    }
  }
  if (examRowIndex !== -1) {
    examSheet.deleteRow(examRowIndex);
  }
  
  // 2. Delete associated questions
  const qSheet = getSheet('Questions');
  const qRows = qSheet.getDataRange().getValues();
  for (let i = qRows.length - 1; i >= 1; i--) {
    if (String(qRows[i][1]) === String(examId)) {
      qSheet.deleteRow(i + 1);
    }
  }
  
  return { status: 'success', message: 'Exam and all its questions deleted successfully', exam_id: examId };
}

function getGames() {
  const sheet = getSheet('ManagerGames');
  return getRowsData(sheet);
}

function saveGame(gamePayload) {
  const sheet = getSheet('ManagerGames');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const existing = getRowsData(sheet);

  const isEdit = existing.some(g => String(g.game_id) === String(gamePayload.game_id));
  if (isEdit) {
    // Update existing row
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const idColIdx = headers.indexOf('game_id');
      if (String(rows[i][idColIdx]) === String(gamePayload.game_id)) {
        headers.forEach((h, j) => {
          if (gamePayload[h] !== undefined) sheet.getRange(i + 1, j + 1).setValue(gamePayload[h]);
        });
        break;
      }
    }
  } else {
    if (!gamePayload.game_id) gamePayload.game_id = 'GAME_' + Date.now();
    if (!gamePayload.created_at) gamePayload.created_at = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd'T'HH:mm:ssXXX");
    const newRow = headers.map(h => gamePayload[h] !== undefined ? gamePayload[h] : '');
    sheet.appendRow(newRow);
  }
  return { status: 'success', message: 'Game saved', game_id: gamePayload.game_id };
}

function deleteGame(payload) {
  const sheet = getSheet('ManagerGames');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idColIdx = headers.indexOf('game_id');
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][idColIdx]) === String(payload.game_id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Game deleted', game_id: payload.game_id };
    }
  }
  throw new Error(`Game '${payload.game_id}' not found.`);
}

function getSubmissions() {
  const sheet = getSheet('Submissions');
  return getRowsData(sheet);
}

function getSubmissionDetails(submissionId) {
  const sheet = getSheet('SubmissionDetails');
  const allDetails = getRowsData(sheet);
  return allDetails.filter(d => String(d.submission_id) === String(submissionId));
}

function deleteSubmission(payload) {
  const submissionId = payload.submission_id;
  if (!submissionId) throw new Error('submission_id is required.');

  const subSheet = getSheet('Submissions');
  const subRows = subSheet.getDataRange().getValues();
  let subRowIdx = -1;
  for (let i = 1; i < subRows.length; i++) {
    if (String(subRows[i][0]) === String(submissionId)) {
      subRowIdx = i + 1;
      break;
    }
  }
  if (subRowIdx !== -1) {
    subSheet.deleteRow(subRowIdx);
  }

  const detailsSheet = getSheet('SubmissionDetails');
  const detailsRows = detailsSheet.getDataRange().getValues();
  for (let i = detailsRows.length - 1; i >= 1; i--) {
    if (String(detailsRows[i][0]) === String(submissionId)) {
      detailsSheet.deleteRow(i + 1);
    }
  }

  return { status: 'success', message: 'Submission deleted successfully', submission_id: submissionId };
}

// --- Response Helpers ---
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message, statusCode = 500) {
  return ContentService.createTextOutput(JSON.stringify({ error: message, status: 'error' }))
    .setMimeType(ContentService.MimeType.JSON);
}
