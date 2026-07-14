const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzmrkmQbjI-cEpYn86kwbK8-lyT1fDUMeKwFtCbR7E_MSIXdV2V6cBl7ysuSXw8kBVI5A/exec';

let questionsToImport = [];
let loadedQuestions = []; // Cached questions for the active admin exam
let aiStagingQuestions = [];
let aiApiKeys = window.aiApiKeys = { gemini: '', chatgpt: '' };

// Helper to escape single quotes in strings for onclick handlers
const escapeSingleQuotes = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/'/g, "\\'");
};

// Helper for UTC+7 ISO String
const getUTC7ISOString = () => {
    const date = new Date();
    // Offset by +7 hours
    const utc7Date = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return utc7Date.toISOString().replace('Z', '+07:00');
};


document.addEventListener('DOMContentLoaded', () => {
    let currentIsMobile = window.innerWidth <= 768;
    window.addEventListener('resize', () => {
        const newIsMobile = window.innerWidth <= 768;
        if (newIsMobile !== currentIsMobile) {
            currentIsMobile = newIsMobile;
            if (window.currentExamState && window.currentExamState.exam && document.getElementById('exam-interface').style.display !== 'none') {
                if (typeof loadExamInterface === 'function') loadExamInterface();
            }
        }
    });

    // Inject Toast Container
    let toastContainer = document.createElement('div');
    toastContainer.className = 'bento-toast-container';
    toastContainer.id = 'bento-toast-container';
    document.body.appendChild(toastContainer);

    // Inject Confirm Modal
    let confirmModal = document.createElement('div');
    confirmModal.className = 'bento-confirm-modal';
    confirmModal.id = 'bento-confirm-modal';
    confirmModal.innerHTML = `
        <div class="bento-confirm-content">
            <div class="bento-confirm-header">
                <div class="bento-confirm-icon">&#9888;</div>
                <h3 class="bento-confirm-title" id="bento-confirm-title">Confirm Action</h3>
            </div>
            <div class="bento-confirm-body" id="bento-confirm-body">Are you sure?</div>
            <div class="bento-confirm-actions">
                <button class="btn-secondary" id="bento-confirm-cancel">Cancel</button>
                <button class="btn-danger" id="bento-confirm-ok">Yes, Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);

    window.showToast = function (message, type = 'info') {
        let tContainer = document.getElementById('bento-toast-container');
        if (!tContainer) return;
        const t = document.createElement('div');
        t.className = `bento-toast bento-toast-${type}`;
        let icon = '&#8505;';
        if (type === 'success') icon = '&#10003;';
        if (type === 'error') icon = '&#10007;';
        t.innerHTML = `<i>${icon}</i> <span>${message}</span>`;
        tContainer.appendChild(t);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            t.classList.add('bento-toast-show');
        }));

        const removeToast = () => {
            t.classList.remove('bento-toast-show');
            setTimeout(() => t.remove(), 400);
        };
        t.addEventListener('click', removeToast);
        setTimeout(removeToast, 4000);
    };

    window.showConfirm = function (title, message, onConfirm) {
        const modal = document.getElementById('bento-confirm-modal');
        if (!modal) {
            if (confirm(title + "\n" + message)) if (onConfirm) onConfirm();
            return;
        }
        document.getElementById('bento-confirm-title').innerText = title;
        document.getElementById('bento-confirm-body').innerHTML = message;

        const okBtn = document.getElementById('bento-confirm-ok');
        const cancelBtn = document.getElementById('bento-confirm-cancel');

        const cleanup = () => {
            modal.classList.remove('active');

            // Clean up lock state and styles defensively before cloning
            okBtn.dataset.spamLocked = 'false';
            cancelBtn.dataset.spamLocked = 'false';
            okBtn.style.pointerEvents = '';
            okBtn.style.opacity = '';
            okBtn.style.cursor = '';
            cancelBtn.style.pointerEvents = '';
            cancelBtn.style.opacity = '';
            cancelBtn.style.cursor = '';

            okBtn.replaceWith(okBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        };

        okBtn.addEventListener('click', () => { cleanup(); if (onConfirm) onConfirm(); });
        cancelBtn.addEventListener('click', () => { cleanup(); });

        modal.classList.add('active');
    };

    // Override Alert
    window.alert = function (msg) {
        if (!msg) return;
        let type = 'info';
        let s = msg.toString().toLowerCase();
        if (s.includes('thành công') || s.includes('success')) type = 'success';
        if (s.includes('lỗi') || s.includes('error') || s.includes('thất bại') || s.includes('fail')) type = 'error';
        if (window.showToast) window.showToast(msg, type);
    };


    const appContainer = document.getElementById('app-container');

    // Global Overlay Loader Helpers
    window.showLoader = function (message = 'Đang xử lý dữ liệu...') {
        let loader = document.getElementById('global-db-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-db-loader';
            loader.className = 'global-loader';
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <div class="loader-text" id="global-db-loader-text"></div>
            `;
            document.body.appendChild(loader);
        }
        document.getElementById('global-db-loader-text').textContent = message;
        loader.style.display = 'flex';
    };

    window.hideLoader = function () {
        const loader = document.getElementById('global-db-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    };

    // Initialize Mock DB if not set
    initializeMockDbIfEmpty();
    // Update db status indicator
    updateDbStatusIndicator();

    /**
     * Database Access Interface (Local / API Fallback)
     */
    const db = {
        async getExams() {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            const session = JSON.parse(sessionStorage.getItem('teacher_session') || 'null');
            const teacherId = session ? session.username : '';
            if (useMock) {
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const activeExams = exams.filter(e => e.active === true || e.active === 'TRUE');
                const filtered = activeExams.filter(e => e.is_deleted !== true && e.is_deleted !== 'TRUE' && e.is_deleted !== 1 && e.is_deleted !== '1');
                return teacherId ? filtered.filter(e => !e.teacher_id || String(e.teacher_id) === teacherId) : filtered;
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const url = teacherId ? `${endpoint}?action=getExams&teacherId=${encodeURIComponent(teacherId)}` : `${endpoint}?action=getExams`;
                const response = await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now());
                const result = await response.json();
                if (result.status === 'success') {
                    localStorage.setItem('mock_exams', JSON.stringify(result.data));
                    return result.data.filter(e => e.is_deleted !== true && e.is_deleted !== 'TRUE' && e.is_deleted !== 1 && e.is_deleted !== '1');
                }
                throw new Error(result.error || 'Failed to load exams.');
            } catch (error) {
                console.warn('API connection failed, falling back to Local Database:', error);
                localStorage.setItem('use_mock_db', 'true');
                updateDbStatusIndicator();
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const activeExams = exams.filter(e => e.active === true || e.active === 'TRUE');
                const filtered = activeExams.filter(e => e.is_deleted !== true && e.is_deleted !== 'TRUE' && e.is_deleted !== 1 && e.is_deleted !== '1');
                return teacherId ? filtered.filter(e => !e.teacher_id || String(e.teacher_id) === teacherId) : filtered;
            }
        },

        async login(username, password) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const teachers = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
                const teacher = teachers.find(t => String(t.username).trim() === String(username).trim() && String(t.password).trim() === String(password).trim());
                if (!teacher) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
                return { username: teacher.username, name: teacher.name, phone: teacher.phone, avatar: teacher.avatar };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=login', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();
                if (result.status === 'success') return result.data;
                throw new Error(result.error || 'Đăng nhập thất bại.');
            } catch (error) {
                // Fallback to mock on API error
                const teachers = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
                const teacher = teachers.find(t => String(t.username).trim() === String(username).trim() && String(t.password).trim() === String(password).trim());
                if (teacher) return { username: teacher.username, name: teacher.name };
                throw new Error(error.message || 'Đăng nhập thất bại.');
            }
        },

        async getQuestions(examId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const allQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                let data = allQs.filter(q => String(q.exam_id) === String(examId) && q.is_deleted !== true && q.is_deleted !== 'TRUE' && q.is_deleted !== 1 && q.is_deleted !== '1');
                data.forEach(q => {
                    if (q.type === 'matching' && typeof q.correct_answer === 'string' && q.correct_answer.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(q.correct_answer);
                            q.question_text = Object.keys(parsed).join('\n');
                            q.correct_answer = Object.values(parsed).join('\n');
                        } catch (e) { }
                    }
                });
                return data;
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(`${endpoint}?action=getQuestions&examId=${examId}&_t=${Date.now()}`);
                const result = await response.json();
                if (result.status === 'success') {
                    // Update cache for this exam
                    const allQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                    const filteredQs = allQs.filter(q => String(q.exam_id) !== String(examId));
                    const newCache = filteredQs.concat(result.data);
                    localStorage.setItem('mock_questions', JSON.stringify(newCache));
                    let data = result.data.filter(q => q.is_deleted !== true && q.is_deleted !== 'TRUE' && q.is_deleted !== 1 && q.is_deleted !== '1');
                    data.forEach(q => {
                        if (q.type === 'matching' && typeof q.correct_answer === 'string' && q.correct_answer.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(q.correct_answer);
                                q.question_text = Object.keys(parsed).join('\n');
                                q.correct_answer = Object.values(parsed).join('\n');
                            } catch (e) { }
                        }
                    });
                    return data;
                }
                throw new Error(result.error || 'Failed to load questions.');
            } catch (error) {
                console.warn('API connection failed, falling back to Local Database for questions:', error);
                localStorage.setItem('use_mock_db', 'true');
                updateDbStatusIndicator();
                const allQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                return allQs.filter(q => String(q.exam_id) === String(examId) && q.is_deleted !== true && q.is_deleted !== 'TRUE' && q.is_deleted !== 1 && q.is_deleted !== '1');
            }
        },

        async saveExam(examData) {
            // Auto-attach teacher_id from session
            const session = JSON.parse(sessionStorage.getItem('teacher_session') || 'null');
            if (session && !examData.teacher_id) examData.teacher_id = session.username;

            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                if (exams.some(e => e.exam_id === examData.exam_id)) {
                    throw new Error(`Mã bài kiểm tra '${examData.exam_id}' đã tồn tại.`);
                }
                exams.push(examData);
                localStorage.setItem('mock_exams', JSON.stringify(exams));
                return { status: 'success', message: 'Exam saved locally' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=saveExam', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(examData)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to save exam on Server.');
            } catch (error) {
                console.warn('API save failed, attempting mock save:', error);
                // Also write to mock
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                if (exams.some(e => e.exam_id === examData.exam_id)) {
                    throw new Error(`Mã bài kiểm tra '${examData.exam_id}' đã tồn tại.`);
                }
                exams.push(examData);
                localStorage.setItem('mock_exams', JSON.stringify(exams));
                throw new Error(`Lỗi kết nối Server! Đã lưu bài kiểm tra vào bộ nhớ máy (Local). Bạn có thể kiểm tra danh sách.`);
            }
        },

        async importQuestions(questions) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const existing = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                // Verify duplicate question_id within exam
                questions.forEach(q => {
                    if (existing.some(eq => eq.exam_id === q.exam_id && eq.question_id === q.question_id)) {
                        throw new Error(`Trùng mã câu hỏi (question_id) '${q.question_id}' trong đề thi '${q.exam_id}'.`);
                    }
                });
                const updated = existing.concat(questions);
                localStorage.setItem('mock_questions', JSON.stringify(updated));
                return { status: 'success', message: `Đã import thành công ${questions.length} câu hỏi vào Local Database.` };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=importQuestions', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(questions)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Import failed.');
            } catch (error) {
                console.error(error);
                throw new Error(`Lỗi kết nối API: ${error.message}.`);
            }
        },

        async editQuestion(question) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const existing = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                const idx = existing.findIndex(q => q.question_id === question.question_id && q.exam_id === question.exam_id);
                if (idx === -1) throw new Error('Không tìm thấy câu hỏi để sửa.');
                existing[idx] = question;
                localStorage.setItem('mock_questions', JSON.stringify(existing));
                return { status: 'success', message: 'Updated question locally.' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=editQuestion', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(question)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to edit question.');
            } catch (error) {
                console.error(error);
                throw new Error(`Lỗi cập nhật: ${error.message}`);
            }
        },

        async deleteQuestion(questionId, examId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const existing = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                const idx = existing.findIndex(q => q.question_id === questionId && q.exam_id === examId);
                if (idx !== -1) {
                    existing[idx].is_deleted = true;
                    localStorage.setItem('mock_questions', JSON.stringify(existing));
                }
                return { status: 'success', message: 'Deleted question locally.' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=deleteQuestion', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ question_id: questionId, exam_id: examId })
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to delete question.');
            } catch (error) {
                console.error(error);
                throw new Error(`Lỗi xóa: ${error.message}`);
            }
        },

        async editExam(examData) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const idx = exams.findIndex(e => e.exam_id === examData.exam_id);
                if (idx === -1) throw new Error('Không tìm thấy bài kiểm tra.');
                exams[idx] = examData;
                localStorage.setItem('mock_exams', JSON.stringify(exams));
                return { status: 'success', message: 'Exam updated locally' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=editExam', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(examData)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to edit exam on cloud.');
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async deleteExam(examId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                // Soft delete exam
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const idx = exams.findIndex(e => e.exam_id === examId);
                if (idx !== -1) exams[idx].is_deleted = true;
                localStorage.setItem('mock_exams', JSON.stringify(exams));

                // Soft delete questions
                const questions = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                questions.forEach(q => {
                    if (q.exam_id === examId) q.is_deleted = true;
                });
                localStorage.setItem('mock_questions', JSON.stringify(questions));

                return { status: 'success', message: 'Exam and questions deleted locally' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=deleteExam', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ exam_id: examId })
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to delete exam on cloud.');
            } catch (error) {
                console.error(error);
                throw error;
            }
        },

        async submitResult(result) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const subs = JSON.parse(localStorage.getItem('mock_submissions') || '[]');
                subs.push(result.summary);
                localStorage.setItem('mock_submissions', JSON.stringify(subs));

                const details = JSON.parse(localStorage.getItem('mock_submission_details') || '[]');
                const newDetails = details.concat(result.details);
                localStorage.setItem('mock_submission_details', JSON.stringify(newDetails));
                return { status: 'success', message: 'Submission saved locally' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=submitResult', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(result)
                });
                const resultData = await response.json();
                if (resultData.status === 'success') return resultData;
                throw new Error(resultData.error || 'Submission response error.');
            } catch (error) {
                console.error(error);
                throw new Error(`Lỗi kết nối Server!`);
            }
        },

        async getSubmissions() {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const subs = JSON.parse(localStorage.getItem('mock_submissions') || '[]');
                return subs.filter(s => s.is_deleted !== true && s.is_deleted !== 'TRUE' && s.is_deleted !== 1 && s.is_deleted !== '1');
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=getSubmissions&_t=' + Date.now());
                const result = await response.json();
                if (result.status === 'success') return result.data.filter(s => s.is_deleted !== true && s.is_deleted !== 'TRUE' && s.is_deleted !== 1 && s.is_deleted !== '1');
                throw new Error(result.error || 'Failed to fetch submissions.');
            } catch (error) {
                console.warn('API fetch submissions failed, using local storage:', error);
                const subs = JSON.parse(localStorage.getItem('mock_submissions') || '[]');
                return subs.filter(s => s.is_deleted !== true && s.is_deleted !== 'TRUE' && s.is_deleted !== 1 && s.is_deleted !== '1');
            }
        },

        async getSubmissionDetails(submissionId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const allDetails = JSON.parse(localStorage.getItem('mock_submission_details') || '[]');
                return allDetails.filter(d => String(d.submission_id) === String(submissionId));
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(`${endpoint}?action=getSubmissionDetails&submissionId=${submissionId}&_t=${Date.now()}`);
                const result = await response.json();
                if (result.status === 'success') return result.data;
                throw new Error(result.error || 'Failed to fetch submission details.');
            } catch (error) {
                console.warn('API fetch submission details failed, using local storage:', error);
                const allDetails = JSON.parse(localStorage.getItem('mock_submission_details') || '[]');
                return allDetails.filter(d => String(d.submission_id) === String(submissionId));
            }
        },

        async deleteSubmission(submissionId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const subs = JSON.parse(localStorage.getItem('mock_submissions') || '[]');
                const idx = subs.findIndex(s => String(s.submission_id) === String(submissionId));
                if (idx !== -1) subs[idx].is_deleted = true;
                localStorage.setItem('mock_submissions', JSON.stringify(subs));

                const details = JSON.parse(localStorage.getItem('mock_submission_details') || '[]');
                details.forEach(d => {
                    if (String(d.submission_id) === String(submissionId)) d.is_deleted = true;
                });
                localStorage.setItem('mock_submission_details', JSON.stringify(details));

                return { status: 'success', message: 'Deleted submission locally.' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=deleteSubmission', {
                    method: 'POST',
                    mode: 'cors',
                    redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ submission_id: submissionId })
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to delete submission.');
            } catch (error) {
                console.error(error);
                throw new Error(`Lỗi xóa bài làm: ${error.message}`);
            }
        },

        async getGames() {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                return games.filter(g => g.is_deleted !== true && g.is_deleted !== 'TRUE' && g.is_deleted !== 1 && g.is_deleted !== '1');
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=getGames&_t=' + Date.now());
                const result = await response.json();
                if (result.status === 'success') return result.data.filter(g => g.is_deleted !== true && g.is_deleted !== 'TRUE' && g.is_deleted !== 1 && g.is_deleted !== '1');
                throw new Error(result.error || 'Failed to fetch games.');
            } catch (error) {
                console.warn('getGames API failed, using mock:', error);
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                return games.filter(g => g.is_deleted !== true && g.is_deleted !== 'TRUE' && g.is_deleted !== 1 && g.is_deleted !== '1');
            }
        },

        async saveGame(game) {
            if (!game.game_id) game.game_id = 'GAME_' + Date.now();
            if (!game.created_at) game.created_at = getUTC7ISOString();
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                const idx = games.findIndex(g => g.game_id === game.game_id);
                if (idx >= 0) games[idx] = game; else games.push(game);
                localStorage.setItem('mock_games', JSON.stringify(games));
                return { status: 'success', game_id: game.game_id };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=saveGame', {
                    method: 'POST', mode: 'cors', redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(game)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to save game.');
            } catch (error) {
                // Fallback to mock
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                const idx = games.findIndex(g => g.game_id === game.game_id);
                if (idx >= 0) games[idx] = game; else games.push(game);
                localStorage.setItem('mock_games', JSON.stringify(games));
                return { status: 'success', game_id: game.game_id };
            }
        },

        async deleteGame(gameId) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                const idx = games.findIndex(g => g.game_id === gameId);
                if (idx !== -1) games[idx].is_deleted = true;
                localStorage.setItem('mock_games', JSON.stringify(games));
                return { status: 'success' };
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=deleteGame', {
                    method: 'POST', mode: 'cors', redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ game_id: gameId })
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to delete game.');
            } catch (error) {
                const games = JSON.parse(localStorage.getItem('mock_games') || '[]');
                const idx = games.findIndex(g => g.game_id === gameId);
                if (idx !== -1) games[idx].is_deleted = true;
                localStorage.setItem('mock_games', JSON.stringify(games));
                return { status: 'success' };
            }
        },

        async getAiKeys() {
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=getAiKeys&_t=' + Date.now());
                const result = await response.json();
                if (result.status === 'success') return result.data;
                return {};
            } catch (error) {
                console.warn('Failed to fetch AI keys', error);
                return {};
            }
        },

        async saveAiKeys(payload) {
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=saveAiKeys', {
                    method: 'POST', mode: 'cors', redirect: 'follow',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (result.status === 'success') return result;
                throw new Error(result.error || 'Failed to save AI keys.');
            } catch (error) {
                throw new Error(`Lỗi lưu API Keys: ${error.message}`);
            }
        }
    };
    window.db = db;

    /**
     * UI Mode Loading
     */
    function loadLoginScreen() {
        const session = JSON.parse(sessionStorage.getItem('teacher_session') || 'null');
        if (session) { loadAdminMode(); return; }

        appContainer.innerHTML = `
            <div id="login-screen">
                <div class="login-card">
                    <div class="login-logo">
                        <span class="app-icon">📚</span>
                        <h2>EnglishTools</h2>
                        <p>Đăng nhập để quản lý bài kiểm tra</p>
                    </div>
                    <div class="login-field">
                        <label for="login-username">👤 Tên đăng nhập</label>
                        <input type="text" id="login-username" placeholder="username" autocomplete="username">
                    </div>
                    <div class="login-field">
                        <label for="login-password">🔑 Mật khẩu</label>
                        <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
                    </div>
                    <button class="login-btn" id="login-submit-btn">🚀 Đăng nhập</button>
                    <div class="login-error" id="login-error-msg"></div>
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <button type="button" id="reset-db-btn" style="background: none; border: none; color: var(--primary); font-size: 0.85rem; text-decoration: underline; cursor: pointer; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <span>🔄</span> Khôi phục Server (Tắt Offline Mode)
                        </button>
                    </div>
                </div>
            </div>
        `;

        const doLogin = async () => {
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            const errorEl = document.getElementById('login-error-msg');
            const btn = document.getElementById('login-submit-btn');

            if (!username || !password) {
                errorEl.textContent = '⚠️ Vui lòng nhập đầy đủ thông tin.';
                errorEl.style.display = 'block';
                return;
            }

            if (btn.disabled) return;
            
            btn.disabled = true;
            btn.textContent = 'Đang đăng nhập...';
            errorEl.style.display = 'none';

            try {
                const teacher = await db.login(username, password);
                sessionStorage.setItem('teacher_session', JSON.stringify(teacher));
                loadAdminMode();
            } catch (err) {
                errorEl.textContent = '❌ ' + err.message;
                errorEl.style.display = 'block';
                btn.disabled = false;
                btn.textContent = '🚀 Đăng nhập';
            }
        };

        document.getElementById('login-submit-btn').onclick = doLogin;
        document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
        document.getElementById('login-username').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

        const resetBtn = document.getElementById('reset-db-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                localStorage.setItem('use_mock_db', 'false');
                updateDbStatusIndicator();
                alert('Đã khôi phục kết nối Server thành công! Bạn có thể thử đăng nhập lại.');
            };
        }
    }

    function loadAdminMode() {
        // Fetch AI Keys in background
        db.getAiKeys().then(keys => {
            aiApiKeys = keys || {};
            if (aiApiKeys.gemini) populateAiModels(aiApiKeys.gemini);
        });

        const session = JSON.parse(sessionStorage.getItem('teacher_session') || 'null');
        const teacherName = session ? session.name : 'Admin';
        const teacherAvatar = session ? session.avatar : 'Admin';

        appContainer.innerHTML = `
            <div class="teacher-info-bar">
                <div class="teacher-avatar"><img src="${teacherAvatar}" alt="${teacherName}"></div>
                <span>Hello, <strong>${teacherName}</strong></span>
                <button class="logout-btn" id="logout-btn">🚪 Logout</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2>Admin Mode</h2>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="open-guide-btn" class="btn-secondary" style="font-weight: 800; border: 2px solid var(--border-color); display: flex; align-items: center; gap: 0.5rem; background-color: var(--info-light); color: var(--info);">📖 Guide</button>
                    <button id="open-settings-btn" class="btn-secondary" style="font-weight: 800; border: 2px solid var(--border-color); display: flex; align-items: center; gap: 0.5rem;">⚙️ Settings</button>
                </div>
            </div>
            
            <div id="admin-content">
                <!-- Tabs Navigation - Pill Style -->
                <div class="admin-tabs">
                    <button id="tab-exams-btn" class="admin-tab-btn active">📝 Exam Manager</button>
                    <button id="tab-questions-btn" class="admin-tab-btn">❓ Question Manager</button>
                    <button id="tab-submissions-btn" class="admin-tab-btn">📊 Results Manager</button>
                    <button id="tab-games-btn" class="admin-tab-btn">🎮 Game Manager</button>
                </div>

                <!-- Tab 1: Exam Manager -->
                <div id="tab-exams-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3>All Exams</h3>
                        <button id="open-create-exam-btn" class="btn-primary">+ Create New Exam</button>
                    </div>
                    <div id="exams-table-container" class="data-table-container">
                        <p class="loading-message">Loading exams list...</p>
                    </div>
                </div>

                <!-- Tab 2: Question Manager -->
                <div id="tab-questions-content" style="display: none;">
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="margin-top: 0;">Import Questions from Excel/CSV</h3>
                        <form id="import-questions-form" style="display: flex; gap: 1rem; align-items: flex-end; padding: 0; background: none; border: none; margin-bottom: 1rem;">
                            <div style="flex: 1;">
                                <label for="exam-file" style="font-weight: 700; margin-bottom: 0.25rem; display: block; font-size: 0.9rem;">Upload File (.xlsx, .csv):</label>
                                <input type="file" id="exam-file" name="exam-file" accept=".xlsx, .csv" required style="padding: 0.4rem;">
                            </div>
                            <button type="submit" class="btn-primary" style="margin-bottom: 3px;">Preview File</button>
                            <button type="button" id="download-sample-btn" class="btn-secondary" style="margin-bottom: 3px; white-space: nowrap;">📥 Download Sample</button>
                        </form>

                        <div id="import-preview-container" style="display: none; border: 2px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: #fff; margin-bottom: 1rem;">
                            <h4>Import Preview</h4>
                            <div id="preview-table-container" class="data-table-container" style="max-height: 250px; overflow-y: auto;"></div>
                            <button id="confirm-import-btn" class="btn-primary" style="margin-top: 1rem;">Confirm Import</button>
                        </div>
                    </div>

                    <!-- AI Question Generator Card -->
                    <div class="bento-card" style="margin-bottom: 1.5rem; background: var(--bg-item); border: 1px solid var(--border-color); border-radius: var(--radius); padding: 1.5rem; box-shadow: var(--shadow-sm); box-sizing: border-box; text-align: left;">
                        <!-- Card Header: Title left, Provider + Model right -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
                            <div>
                                <h3 style="margin: 0; color: var(--primary); display: flex; align-items: center; gap: 0.5rem;">✨ AI Question Generator</h3>
                                <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0.25rem 0 0 0;">Tự động soạn câu hỏi tiếng Anh thông minh theo chủ đề và dạng bài tập tùy chọn.</p>
                            </div>
                            <div style="display: flex; align-items: flex-end; gap: 0.75rem; flex-shrink: 0;">
                                <div>
                                    <label for="ai-provider-select" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.2rem; color: var(--text-muted);">AI Provider:</label>
                                    <select id="ai-provider-select" style="border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.4rem 0.6rem; background: white; font-family: var(--font); font-size: 0.85rem; font-weight: 600; min-width: 120px;">
                                        <option value="gemini" selected>Gemini AI</option>
                                        <option value="chatgpt">ChatGPT</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="ai-model-select" style="font-weight: 700; font-size: 0.8rem; display: block; margin-bottom: 0.2rem; color: var(--text-muted);">AI Model:</label>
                                    <select id="ai-model-select" style="border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.4rem 0.6rem; background: white; font-family: var(--font); font-size: 0.85rem; font-weight: 600; min-width: 180px;">
                                        <option value="gemini-3.1-flash-lite" selected>Gemini 3.1 Flash Lite (Default)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; margin-top: 1.25rem; margin-bottom: 1rem; align-items: start;">
                            <div>
                                <label for="ai-prompt-topic" style="font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 0.25rem; color: var(--text-main);">Chủ đề học tập hoặc Đoạn văn mẫu:</label>
                                <textarea id="ai-prompt-topic" placeholder="Ví dụ: Relative clauses, Conditional sentences, hoặc dán một đoạn văn tiếng Anh để tạo câu hỏi đọc hiểu..." style="width: 100%; height: 140px; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem; box-sizing: border-box; font-family: var(--font); resize: vertical; line-height: 1.4;"></textarea>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                                    <div>
                                        <label for="ai-level-select" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.25rem; color: var(--text-main);">Độ khó:</label>
                                        <select id="ai-level-select" style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem; box-sizing: border-box; background: white; font-family: var(--font); font-size: 0.85rem; font-weight: 600;">
                                            <option value="easy">Easy</option>
                                            <option value="medium" selected>Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label for="ai-quantity-input" style="font-weight: 700; font-size: 0.85rem; display: block; margin-bottom: 0.25rem; color: var(--text-main);">Số lượng câu:</label>
                                        <input type="number" id="ai-quantity-input" value="5" min="1" max="15" style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem; box-sizing: border-box; font-family: var(--font); font-size: 0.85rem; font-weight: 600;">
                                    </div>
                                </div>
                                <div>
                                    <label style="font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 0.25rem; color: var(--text-main);">Các dạng bài tập (Chọn nhiều):</label>
                                    <div id="ai-types-checkboxes" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; font-size: 0.85rem; overflow-y: auto; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.5rem; background: white; box-sizing: border-box;">
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-single" value="single_choice" checked> <label for="ait-single" style="cursor:pointer; font-weight:600;">Single Choice</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-multi" value="multiple_choice"> <label for="ait-multi" style="cursor:pointer; font-weight:600;">Multiple Choice</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-tf" value="true_false"> <label for="ait-tf" style="cursor:pointer; font-weight:600;">True / False</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-fill" value="fill_blank"> <label for="ait-fill" style="cursor:pointer; font-weight:600;">Fill Blank</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-arrange" value="arrange_sentence"> <label for="ait-arrange" style="cursor:pointer; font-weight:600;">Arrange Sentence</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-vocab" value="vocabulary"> <label for="ait-vocab" style="cursor:pointer; font-weight:600;">Vocabulary</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-matching" value="matching"> <label for="ait-matching" style="cursor:pointer; font-weight:600;">Matching</label></div>
                                        <div style="display: flex; align-items: center; gap: 0.25rem;"><input type="checkbox" id="ait-short" value="short_answer"> <label for="ait-short" style="cursor:pointer; font-weight:600;">Short Answer</label></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
                            <button id="ai-generate-btn" class="btn-primary" style="background: linear-gradient(135deg, var(--primary) 0%, #a855f7 100%);"><img src="images/ai.png" alt="AI" width="25" height="25" style="vertical-align: middle;"> Generate Questions by AI</button>
                        </div>
                    </div>

                    <!-- AI Preview Modal -->
                    <div id="ai-preview-modal" class="modal">
                        <div class="modal-content" style="max-width: 900px; width: 95vw; max-height: 90vh; display: flex; flex-direction: column; padding: 0;">
                            <div class="modal-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: white; position: sticky; top: 0; z-index: 10;">
                                <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--text-main);">
                                    <span>📋 AI Generated Questions (<span id="ai-staging-count">0</span> questions)</span>
                                </h3>
                                <button class="modal-close" onclick="closeAiPreviewModal()" style="position: relative; right: 0; top: 0;">&times;</button>
                            </div>
                            
                            <div style="padding: 1.5rem; flex: 1; overflow-y: auto; background: var(--bg-main);">
                                <div id="ai-staging-list" style="display: flex; flex-direction: column; gap: 1rem;">
                                    <!-- Interactive edit cards will be rendered here -->
                                </div>
                            </div>

                            <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); background: var(--primary-light); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <label for="ai-import-exam-select" style="font-weight: 700; color: var(--primary); font-size: 0.95rem; white-space: nowrap;">Target Exam:</label>
                                    <select id="ai-import-exam-select" style="border: 2px solid var(--primary); border-radius: var(--radius-sm); padding: 0.4rem; font-family: var(--font); font-weight: 600; background: white;">
                                        <option value="">-- Select Exam --</option>
                                    </select>
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button id="ai-generate-more-btn" class="btn-secondary" style="background: white; border: 2px solid var(--primary); color: var(--primary); font-weight: bold;">➕ Generate More</button>
                                    <button id="ai-commit-btn" class="btn-primary" style="font-weight: bold; background: var(--primary);">💾 Import to Exam</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr style="border: 1px solid var(--border-color); margin: 1.5rem 0;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Question Bank Search & Filters</h3>
                        <button id="manual-add-question-btn" class="btn-primary" style="background-color: var(--secondary); box-shadow: 0 4px 12px rgba(107, 203, 119, 0.2);">+ Add Question Manually</button>
                    </div>

                    <div class="filter-container">
                        <div class="filter-group">
                            <label for="qbm-exam-select">Select Exam ID:</label>
                            <select id="qbm-exam-select">
                                <option value="">-- Choose Exam --</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="qbm-type-select">Type:</label>
                            <select id="qbm-type-select">
                                <option value="">All Types</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="single_choice">Single Choice</option>
                                <option value="true_false">True / False</option>
                                <option value="fill_blank">Fill Blank</option>
                                <option value="arrange_sentence">Arrange Sentence</option>
                                <option value="vocabulary">Vocabulary</option>
                                <option value="matching">Matching</option>
                                <option value="short_answer">Short Answer</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="qbm-level-select">Level:</label>
                            <select id="qbm-level-select">
                                <option value="">All Levels</option>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="qbm-search-input">Search Text:</label>
                            <input type="text" id="qbm-search-input" placeholder="Search question text...">
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                            <button id="load-questions-btn" class="btn-primary">Search</button>
                            <button id="export-questions-btn" class="btn-secondary">Export Excel</button>
                        </div>
                    </div>
                    
                    <div id="question-bank-container" class="data-table-container">
                        <p class="info-message">Select an exam and click Search to display its questions.</p>
                    </div>
                </div>

                <!-- Tab 3: Submissions Manager -->
                <div id="tab-submissions-content" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 id="submissions-title" style="margin: 0;">Student Submissions Dashboard</h3>
                        <button id="back-to-submissions-summary-btn" class="btn-secondary" style="display: none;">⬅️ Back to Exam List</button>
                    </div>
                    <div id="submissions-table-container" class="data-table-container">
                        <p class="loading-message">Loading submissions summary...</p>
                    </div>
                </div>

                <!-- Tab 4: Game Manager -->
                <div id="tab-games-content" style="display: none;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">🎮 Game Manager</h3>
                        <button id="open-create-game-btn" class="btn-primary">+ New Game</button>
                    </div>
                    <div id="games-grid-container">
                        <p class="loading-message">Loading games...</p>
                    </div>
                </div>
            </div>
        `;

        // Pill Tab Switching Logic
        const allTabBtns = document.querySelectorAll('.admin-tab-btn');
        const allTabContents = ['tab-exams-content', 'tab-questions-content', 'tab-submissions-content', 'tab-games-content']
            .map(id => document.getElementById(id));

        const tabExamsBtn = document.getElementById('tab-exams-btn');
        const tabQuestionsBtn = document.getElementById('tab-questions-btn');
        const tabSubmissionsBtn = document.getElementById('tab-submissions-btn');
        const tabGamesBtn = document.getElementById('tab-games-btn');
        const tabExamsContent = document.getElementById('tab-exams-content');
        const tabQuestionsContent = document.getElementById('tab-questions-content');
        const tabSubmissionsContent = document.getElementById('tab-submissions-content');
        const tabGamesContent = document.getElementById('tab-games-content');

        // --- URL Hash State Persistence ---
        // Helper: parse hash to get {tab, examId}
        function getHashState() {
            const hash = window.location.hash.slice(1); // remove '#'
            const params = new URLSearchParams(hash);
            return { tab: params.get('tab') || 'exams', examId: params.get('examId') || '' };
        }

        function setHashState(tab, examId) {
            const params = new URLSearchParams();
            params.set('tab', tab);
            if (examId) params.set('examId', examId);
            history.replaceState(null, '', '#' + params.toString());
        }

        const switchTab = (activeBtn, activeContent, tabKey) => {
            allTabBtns.forEach(btn => btn.classList.remove('active'));
            allTabContents.forEach(c => { if (c) c.style.display = 'none'; });
            activeBtn.classList.add('active');
            activeContent.style.display = 'block';
            const currentExam = document.getElementById('qbm-exam-select')?.value || '';
            setHashState(tabKey, tabKey === 'questions' ? currentExam : '');
        };

        tabExamsBtn.addEventListener('click', () => {
            switchTab(tabExamsBtn, tabExamsContent, 'exams');
            loadExamsList();
        });

        tabQuestionsBtn.addEventListener('click', () => {
            switchTab(tabQuestionsBtn, tabQuestionsContent, 'questions');
            populateExamsDropdown();
        });

        tabSubmissionsBtn.addEventListener('click', () => {
            switchTab(tabSubmissionsBtn, tabSubmissionsContent, 'submissions');
            loadSubmissionsExams();
        });

        tabGamesBtn.addEventListener('click', () => {
            switchTab(tabGamesBtn, tabGamesContent, 'games');
            loadGamesList();
        });

        // Save examId to hash when exam dropdown changes in Question Manager
        const qbmExamSelect = document.getElementById('qbm-exam-select');
        if (qbmExamSelect) {
            qbmExamSelect.addEventListener('change', () => {
                const currentHash = getHashState();
                if (currentHash.tab === 'questions') {
                    setHashState('questions', qbmExamSelect.value);
                }
            });
        }

        // Restore state from hash on load
        const hashState = getHashState();
        if (hashState.tab === 'questions') {
            switchTab(tabQuestionsBtn, tabQuestionsContent, 'questions');
            populateExamsDropdown().then(() => {
                if (hashState.examId) {
                    // Use requestAnimationFrame to ensure DOM is flushed after populateExamsDropdown
                    requestAnimationFrame(() => {
                        const sel = document.getElementById('qbm-exam-select');
                        if (sel) {
                            sel.value = hashState.examId;
                            // Verify value was set (option must exist in dropdown)
                            if (sel.value === hashState.examId) {
                                loadQuestionBank();
                            }
                        }
                    });
                }
            }).catch(() => { });
        } else if (hashState.tab === 'submissions') {
            switchTab(tabSubmissionsBtn, tabSubmissionsContent, 'submissions');
            loadSubmissionsExams();
        } else if (hashState.tab === 'games') {
            switchTab(tabGamesBtn, tabGamesContent, 'games');
            loadGamesList();
        } else {
            // Default: exams tab
            loadExamsList();
        }


        // Settings Button modal trigger
        document.getElementById('open-settings-btn').addEventListener('click', showSettingsModal);

        // Guide Button modal trigger
        const guideBtn = document.getElementById('open-guide-btn');
        if (guideBtn) guideBtn.addEventListener('click', showGuideModal);

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.showConfirm('Sign Out', 'Are you sure you want to logout?', () => {
                    sessionStorage.removeItem('teacher_session');
                    loadLoginScreen();
                });
            });
        }

        // Create Exam Button trigger
        document.getElementById('open-create-exam-btn').addEventListener('click', () => showExamModal(null));

        // Question manual add button trigger
        document.getElementById('manual-add-question-btn').addEventListener('click', () => {
            const currentExamId = document.getElementById('qbm-exam-select').value;
            if (!currentExamId) {
                alert('Please select an Exam ID first in the filters to add a question directly to that exam!');
                return;
            }
            showEditModal({ exam_id: currentExamId });
        });

        // Question search/filters event binds
        document.getElementById('load-questions-btn').addEventListener('click', loadQuestionBank);
        document.getElementById('qbm-type-select').addEventListener('change', renderFilteredQuestionBank);
        document.getElementById('qbm-level-select').addEventListener('change', renderFilteredQuestionBank);
        document.getElementById('qbm-search-input').addEventListener('input', renderFilteredQuestionBank);

        const exportBtn = document.getElementById('export-questions-btn');
        exportBtn.addEventListener('click', () => {
            const examId = document.getElementById('qbm-exam-select').value;
            if (!examId || loadedQuestions.length === 0) {
                alert('Please search/load questions for an exam first before exporting.');
                return;
            }
            exportQuestionsToExcel(loadedQuestions, examId);
        });

        const importQuestionsForm = document.getElementById('import-questions-form');
        importQuestionsForm.addEventListener('submit', handleFileSelectAndPreview);

        const downloadSampleBtn = document.getElementById('download-sample-btn');
        if (downloadSampleBtn) {
            downloadSampleBtn.addEventListener('click', exportSampleTemplate);
        }

        // Initially load based on hash state (handled above in tab restoration logic)
        initAiQuestionGenerator();
    }

    const MD_GUIDE_CONTENT = `# Hướng Dẫn Sử Dụng Nền Tảng EnglishTools Teacher Portal

Chào mừng bạn đến với **EnglishTools** - nền tảng quản lý đề thi, ngân hàng câu hỏi, và bài trò chơi trực tuyến. Bộ tài liệu này hướng dẫn chi tiết cách thức vận hành hệ thống.

---

## 1. Hệ Thống Đăng Nhập
- Hệ thống hỗ trợ đa giáo viên bằng **Mã giáo viên (Teacher ID)** và **Mật khẩu**.
- Bạn sẽ chỉ thấy Đề thi (Exams) và thông tin của chính mình. Sự cô lập này giúp đảm bảo tính bảo mật khi nhiều giáo viên cùng dùng chung hệ thống.

---

## 2. Quản Lý Đề Thi (Exam Manager)
Tab **Quản lý Đề thi** là nơi bạn tạo và kết nối đề thi cho học sinh.

### Tạo / Cập nhật Đề thi
1. Click **"+ Create New Exam"**.
2. Nhập các thông tin: **Mã Đề (Exam ID)** (bắt buộc, không dấu hoặc khoảng trắng), **Tiêu đề**, **Thời lượng thi**, và gán **Trạng thái (Active/Inactive)**.
3. Khi lưu thành công, đề thi sẽ hiện lên bảng.

### Chia sẻ cho Học sinh (Copy Link)
Tại mỗi đề thi ở bảng có trạng thái **Active**:
- Hãy bấm nút **"🔗 Link"** (Màu xanh dương đậm).
- Link được copy (VD: \`student.html?exam_id=ENG_123\`) vừa có thể dán vào Zalo/Facebook gửi cho học sinh.
- Mẹo: Khi học sinh bấm link này, hệ thống sẽ **Tự động chọn sẵn đề thi** cho học sinh đó, loại bỏ rủi ro học sinh chọn nhầm đề của lớp khác.

---

## 3. Ngân Hàng Câu Hỏi (Question Bank)
Bạn có thể tự nhập tay hoặc dùng Excel nhập liệu hàng loạt.

### Danh Sách Các Loại Câu Hỏi Hỗ Trợ
1. **Multiple Choice (\`multiple_choice\`)**: Trắc nghiệm - Học sinh có thể chọn 1 hay *nhiều* hộp kiểm vuông. Đáp án lưu dạng phân tách bởi dấu phẩy (vd: \`A,B\`).
2. **Single Choice (\`single_choice\`)** *(MỚI)*: Trắc nghiệm - Học sinh chỉ được quyền chọn *duy nhất 1* đáp án từ các nút hình tròn (Radio). Đáp án là 1 kí tự.
3. **True/False (\`true_false\`)**: Giống Single choice nhưng chỉ có 2 mức Chọn: Đúng và Sai.
4. **Vocabulary (\`vocabulary\`)**: Nhấn chọn 1 đáp án tròn (radio single-select). Dùng cho từ vựng.
5. **Fill in Blank (\`fill_blank\`)**: Điền vào chỗ trống. Hệ thống dùng \`accepted_answers\` có định dạng danh sách JSON (Vd: \`["am", "'m"]\`) để học sinh gõ chữ vào. Chấm điểm rà soát tự động theo mảng JSON.
6. **Arrange Sentence (\`arrange_sentence\`)**: Học sinh gõ lại cả câu hoàn chỉnh dựa trên từ gợi ý.
7. **Short Answer (\`short_answer\`)**: Câu hỏi tự luận ngắn. Hệ thống sẽ *không* bắt buộc phải có đáp án đúng; giáo viên có thể chấm tay nếu tự luận đặc thù.
8. **Matching (\`matching\`)**: Dạng kéo thả ghép nối. Cột trái (câu hỏi) nhập ở Question Text, cột phải (câu trả lời) nhập ở Correct Answer. Mỗi câu 1 dòng. Cả 2 cột phải có số dòng bằng nhau.

### Chỉnh sửa và Nhập Liệu Câu Hỏi
- **Click vào "Manage Questions"** ở bảng Exams để mở giao diện quản lý câu hỏi của đề đó.
- Nút **"Add Question"**: Tạo thêm từng câu hỏi lẻ bằng tay. Giao diện trực quan tích hợp Tooltips giải thích loại câu và ô đỏ báo lỗi điền sai.
- Nút **"Import Excel"**: Chọn File \`.xlsx\` mẫu. Nếu bạn chưa có file mẫu, hãy nhấp vào chữ **"Download Sample"**. Các cột thiết yếu nhất: \`question_id\`, \`exam_id\`, \`type\`, \`question_text\`. Nhập liệu tự động kiểm tra lỗi trước khi cho phép lưu.

---

## 4. Quản Lý Kết Quả Thi (Submissions)
Hệ thống cho phép giám sát bài kiểm tra dễ dàng:

1. Vào tab **Submissions Manager**.
2. Hệ thống thống kê có bao nhiêu học sinh làm bài thi nào, điểm số trung bình ra sao.
3. **Cơ chế chống Thi Hộ / Thi Nhiều Lần**: Nếu một học sinh dùng cùng Tên + Lớp + Chọn Đề Thi cũ, ứng dụng sẽ từ chối không cho phép thi tiếp.
4. **Bấm "🔄 Cho làm lại"**: Tính năng của riêng Giáo viên. Tại bảng chi tiết, nếu có học sinh gặp lý do bất khả kháng rớt mạng hoặc giáo viên cho thi lại -> Nhấp **🔄 Cho làm lại** -> Hồ sơ bài đó sẽ được Xoá Vĩnh Viễn để học sinh điền tên tiếp tục được vào làm lại.

---

## 5. Quản Lý Kho Trò Chơi (Game Manager)
Thêm các hoạt động giải trí hoặc liên kết bài học Quizizz, Gimkit, Wordwall dễ dàng:
- **Tạo Game**: Tab Game Manager > + New Game. 
- Chỉ điền **Tên Game**, dán **Đường Link (URL)**, và tải một **Hình Ảnh Đại Diện (Image Box)**.
- Khi người dùng học sinh bấm vào menu **"Trò chơi"**, kho sẽ tập hợp dạng Game Card lật mở đẹp mắt, kích thích hứng thú vào trải nghiệm Game theo Link do Giáo viên trỏ sẵn.

---

Chúc bạn có những giờ giảng dạy trải nghiệm hiệu quả và mượt mà cùng **EnglishTools**!`;

    window.closeGuideModal = function () {
        const modal = document.getElementById('guide-modal');
        if (modal) modal.remove();
    };

    async function showGuideModal() {
        let modal = document.getElementById('guide-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'guide-modal';
        modal.className = 'modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 850px; width: 95vw; max-height: 90vh; overflow-y: auto; padding-top: 0;">
                <div class="modal-header" style="position: sticky; top: 0; background: #ffffff; z-index: 10; padding-top: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;"><span style="font-size:1.5rem">📖</span> Hướng Dẫn Sử Dụng EnglishTools</h3>
                    <button class="modal-close" onclick="closeGuideModal()">&times;</button>
                </div>
                <div id="guide-markdown-content" style="padding-bottom: 2rem; line-height: 1.6; font-size: 0.95rem; font-family: var(--font);">
                    <!-- Content will be injected here -->
                </div>
                <div style="text-align: center; margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <button class="btn-primary" onclick="closeGuideModal()">Đã Hiểu</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        const contentDiv = document.getElementById('guide-markdown-content');

        try {
            // First attempt to fetch the fresh file from network exactly as it is saved on disk.
            const response = await fetch('Huong_dan_su_dung.md');
            if (response.ok) {
                const freshText = await response.text();
                renderMarkdown(freshText, contentDiv);
                return;
            }
        } catch (e) {
            console.warn("Could not fetch MD file via network, falling back to embedded robust cache.", e);
        }

        // Final fallback if fetch failed (usually due to CORS on file:// origin logic)
        renderMarkdown(MD_GUIDE_CONTENT, contentDiv);
    }

    function renderMarkdown(mdText, container) {
        if (typeof marked !== 'undefined') {
            container.innerHTML = marked.parse(mdText);
            // Quick styles for markdown block
            container.querySelectorAll('h1, h2, h3').forEach(el => { el.style.color = 'var(--primary)'; el.style.marginTop = '1.5em'; el.style.marginBottom = '0.5em'; });
            container.querySelectorAll('h1').forEach(el => el.style.borderBottom = '2px solid var(--border-color)');
            container.querySelectorAll('ul, ol').forEach(el => el.style.paddingLeft = '1.5rem');
            container.querySelectorAll('li').forEach(el => el.style.marginBottom = '0.5rem');
            container.querySelectorAll('code').forEach(el => { el.style.background = 'var(--secondary-light)'; el.style.padding = '0.2rem 0.4rem'; el.style.borderRadius = 'var(--radius-sm)'; el.style.color = '#c026d3'; el.style.fontWeight = 'bold'; });
            container.querySelectorAll('strong').forEach(el => el.style.color = 'var(--text-main)');
        } else {
            container.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${mdText}</pre>`;
        }
    }

    function showSettingsModal() {
        const savedApiEndpoint = localStorage.getItem('api_endpoint') || '';
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'settings-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h3>⚙️ Database & API Settings</h3>
                    <button class="modal-close" onclick="closeSettingsModal()">&times;</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <label for="api-url-input" style="font-weight:700;">Google Apps Script URL (Web App):</label>
                    <input type="text" id="api-url-input" value="${savedApiEndpoint}" placeholder="https://script.google.com/macros/s/..." style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box;">
                    
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                        <button id="save-api-url-btn" class="btn-primary" style="flex:1;">Save URL & Use Cloud</button>
                        <button id="test-connection-btn" class="btn-secondary" style="flex:1;">Test Connection</button>
                    </div>
                    
                    <hr style="border: 0.5px solid var(--border-color); margin: 0.5rem 0;">
                    <label for="gemini-key-input" style="font-weight:700;">Google Gemini API Key:</label>
                    <input type="password" id="gemini-key-input" value="${aiApiKeys.gemini || ''}" placeholder="AIzaSy..." style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box;">
                    
                    <label for="chatgpt-key-input" style="font-weight:700; margin-top: 0.5rem; display: block;">ChatGPT API Key:</label>
                    <input type="password" id="chatgpt-key-input" value="${aiApiKeys.chatgpt || ''}" placeholder="sk-..." style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box;">

                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <button id="save-ai-keys-btn" class="btn-primary" style="flex:1; background: linear-gradient(135deg, var(--primary) 0%, #a855f7 100%); border: none; font-weight: bold;">Save AI Keys to Cloud</button>
                    </div>

                    <hr style="border: 0.5px solid var(--border-color); margin: 0.5rem 0;">
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button id="use-mock-btn" class="btn-secondary" style="flex:1;">Toggle Offline Mode</button>
                        <button id="reset-db-btn" class="btn-secondary" style="flex:1; background-color: var(--accent-light); color: var(--accent); border-color: rgba(255, 107, 107, 0.2);">Reset Mock DB</button>
                    </div>
                    <p id="api-status-msg" style="margin-top: 0.5rem; font-weight: bold; text-align: center;"></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        const apiInput = document.getElementById('api-url-input');
        const saveApiBtn = document.getElementById('save-api-url-btn');
        const testBtn = document.getElementById('test-connection-btn');
        const mockBtn = document.getElementById('use-mock-btn');
        const resetBtn = document.getElementById('reset-db-btn');
        const statusMsg = document.getElementById('api-status-msg');

        const geminiInput = document.getElementById('gemini-key-input');
        const chatgptInput = document.getElementById('chatgpt-key-input');
        const saveAiKeysBtn = document.getElementById('save-ai-keys-btn');

        saveAiKeysBtn.addEventListener('click', async () => {
            const geminiVal = geminiInput.value.trim();
            const chatgptVal = chatgptInput.value.trim();

            saveAiKeysBtn.disabled = true;
            saveAiKeysBtn.textContent = 'Saving...';
            statusMsg.textContent = 'Đang lưu API Keys...';
            statusMsg.style.color = '#2563eb';

            try {
                await db.saveAiKeys({ gemini: geminiVal, chatgpt: chatgptVal });
                aiApiKeys.gemini = geminiVal;
                aiApiKeys.chatgpt = chatgptVal;

                statusMsg.textContent = 'AI Keys Saved to Cloud!';
                statusMsg.style.color = '#15803d';
                // Trigger dynamic registry models reload if applicable
                populateAiModels(aiApiKeys.gemini);
            } catch (err) {
                statusMsg.textContent = 'Lỗi lưu AI Keys: ' + err.message;
                statusMsg.style.color = '#b45309';
            } finally {
                saveAiKeysBtn.disabled = false;
                saveAiKeysBtn.textContent = 'Save AI Keys to Cloud';
            }
        });

        saveApiBtn.addEventListener('click', () => {
            const val = apiInput.value.trim();
            if (val) {
                localStorage.setItem('api_endpoint', val);
                localStorage.setItem('use_mock_db', 'false');
                statusMsg.textContent = 'Saved Cloud API URL!';
                statusMsg.style.color = '#15803d';
            } else {
                localStorage.removeItem('api_endpoint');
                localStorage.setItem('use_mock_db', 'true');
                statusMsg.textContent = 'Removed API URL. Switched to Local DB Mode.';
                statusMsg.style.color = '#b45309';
            }
            updateDbStatusIndicator();
            loadExamsList();
        });

        testBtn.addEventListener('click', async () => {
            const val = apiInput.value.trim();
            if (!val) {
                statusMsg.textContent = 'Please enter a URL to test.';
                statusMsg.style.color = 'red';
                return;
            }
            statusMsg.textContent = 'Testing connection...';
            statusMsg.style.color = 'var(--text-muted)';
            try {
                const res = await fetch(val + '?action=healthCheck');
                const data = await res.json();
                if (data.status === 'OK') {
                    statusMsg.textContent = 'Success! Connected to Google Apps Script.';
                    statusMsg.style.color = '#15803d';
                } else {
                    statusMsg.textContent = 'Connection test failed: Response was not OK.';
                    statusMsg.style.color = 'red';
                }
            } catch (err) {
                statusMsg.textContent = 'Connection failed: ' + err.message;
                statusMsg.style.color = 'red';
            }
        });

        mockBtn.addEventListener('click', () => {
            const currentMock = localStorage.getItem('use_mock_db') === 'true';
            localStorage.setItem('use_mock_db', (!currentMock).toString());
            updateDbStatusIndicator();
            statusMsg.textContent = !currentMock
                ? 'Switched to Local Offline Database Mode!'
                : 'Switched to Cloud API Mode!';
            statusMsg.style.color = !currentMock ? '#b45309' : '#15803d';
            loadExamsList();
        });

        resetBtn.addEventListener('click', () => {
            window.showConfirm('Factory Reset', 'Are you sure you want to clear all Local Storage database entries? This will delete all local mock data.', () => {
                localStorage.removeItem('mock_exams');
                localStorage.removeItem('mock_questions');
                localStorage.removeItem('mock_submissions');
                localStorage.removeItem('mock_submission_details');
                initializeMockDbIfEmpty();
                alert('Mock database reset to default questions.');
                closeSettingsModal();
                loadExamsList();
            });
        });
    }

    window.closeSettingsModal = function () {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.remove();
    };

    async function loadExamsList() {
        const container = document.getElementById('exams-table-container');
        if (!container) return;

        showLoader('Loading exams...');
        container.innerHTML = '<p class="loading-message">Loading exams...</p>';
        try {
            // Fetch exams and questions in parallel for performance
            const [examsResponse] = await Promise.all([
                db.getExams()
            ]);
            const exams = examsResponse.sort((a, b) => new Date(b.created_at || parseInt((b.exam_id || '').split('_').pop()) || 0) - new Date(a.created_at || parseInt((a.exam_id || '').split('_').pop()) || 0));

// Khôi phục bộ đếm câu hỏi cho trường hợp sử dụng Mock LocalStorage
            const questionCountMap = {};
            try {
                const cachedQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                cachedQs.forEach(q => {
                    if (q.is_deleted === true || q.is_deleted === 'TRUE' || q.is_deleted === '1') return;
                    const eid = String(q.exam_id || '');
                    if (eid) questionCountMap[eid] = (questionCountMap[eid] || 0) + 1;
                });
            } catch (_) { }

            if (exams.length === 0) {
                container.innerHTML = '<p class="info-message">No exams found. Click "Create New Exam" to create one!</p>';
                hideLoader();
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Exam ID</th>
                            <th>Title</th>
                            <th>Duration</th>
                            <th style="text-align:center;">Questions</th>
                            <th>Active</th>
                            <th>Created At</th>
                            <th style="white-space:nowrap;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            exams.forEach((exam, idx) => {
                const isActive = exam.active === true || exam.active === 'TRUE' || exam.active === '1' || exam.active === 1;
                const formattedDate = exam.created_at ? new Date(exam.created_at).toLocaleString('vi-VN') : 'Unknown';
                const examStr = JSON.stringify(exam);
                
                // Use backend count if available, otherwise try local cache fallback
                const qCount = exam.question_count !== undefined ? exam.question_count : (questionCountMap[String(exam.exam_id)] || 0);

                table += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${exam.exam_id}</strong></td>
                        <td>${exam.title}</td>
                        <td>${exam.duration_minutes} mins</td>
                        <td style="text-align:center;">
                            <span style="font-weight:800; font-size:1rem; color:${qCount > 0 ? 'var(--primary)' : 'var(--text-muted)'};">${qCount}</span>
                        </td>
                        <td>
                            <span class="badge" style="background-color: ${isActive ? 'var(--secondary-light)' : 'var(--accent-light)'}; color: ${isActive ? '#15803d' : '#b91c1c'}; border: 1px solid ${isActive ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)'}; font-weight:800; display:inline-block; text-align:center;">
                                ${isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="font-size:0.85rem; color:var(--text-muted);">${formattedDate}</td>
                        <td style="white-space:nowrap;">
                            <div style="display:flex; gap:0.25rem; flex-wrap:nowrap;">
                                <button class="edit-btn" title="Edit Exam" onclick='showExamModal(${examStr})'><i class="fa fa-pen" style="color:#6366f1;"></i></button>
                                <button class="edit-btn" title="Copy Link" style="background-color:var(--secondary); color:white;" onclick="copyStudentLink('${exam.exam_id}')"><i class="fa fa-link"></i> Link</button>
                                <button class="edit-btn" title="Manage Questions" style="background-color:var(--primary); color:white;" onclick="manageExamQuestions('${exam.exam_id}')"><i class="fa fa-list-check"></i> Questions</button>
                                <button class="edit-btn" title="Print Exam" style="background-color:#002860; color:white;" onclick="showPrintExamModal('${exam.exam_id}')"><i class="fa fa-print"></i></button>
                                <button class="delete-btn" title="Delete Exam" onclick="deleteExam('${exam.exam_id}')"><i class="fa fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            table += '</tbody></table></div>';
            container.innerHTML = table;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-message">Error loading exams list: ${e.message}</p>`;
        } finally {
            hideLoader();
        }
    }

    window.copyStudentLink = function (examId) {
        const origin = window.location.origin;
        let pathname = window.location.pathname;
        if (pathname.endsWith('index.html') || pathname.endsWith('/')) {
            pathname = pathname.substring(0, pathname.lastIndexOf('/')) + '/student.html';
        } else if (!pathname.includes('student.html')) {
            pathname = pathname + (pathname.endsWith('/') ? '' : '/') + 'student.html';
        }

        const link = `${origin}${pathname}?examId=${examId}`;

        navigator.clipboard.writeText(link).then(() => {
            alert(`Copied student exam link:\n${link}`);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert(`Failed to copy link. You can copy this URL:\n${link}`);
        });
    };

    window.manageExamQuestions = async function (examId) {
        window.currentViewingExamId = examId; // Save context for auto reload

        // Switch to Questions tab using pill-style approach
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        ['tab-exams-content', 'tab-questions-content', 'tab-submissions-content', 'tab-games-content']
            .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const tabQuestionsBtn = document.getElementById('tab-questions-btn');
        const tabQuestionsContent = document.getElementById('tab-questions-content');
        if (tabQuestionsBtn) tabQuestionsBtn.classList.add('active');
        if (tabQuestionsContent) tabQuestionsContent.style.display = 'block';

        // Populate dropdown and WAIT for it to finish
        await populateExamsDropdown();

        const select = document.getElementById('qbm-exam-select');
        if (select) {
            select.value = examId;
            loadQuestionBank();
        }

        // Update URL hash so reload restores this view
        const hashParams = new URLSearchParams();
        hashParams.set('tab', 'questions');
        hashParams.set('examId', examId);
        history.replaceState(null, '', '#' + hashParams.toString());
    };

    window.deleteExam = async function (examId) {
        window.showConfirm('Delete Exam', `Are you sure you want to delete exam "${examId}"`, async () => {
            showLoader('Deleting exam and related questions...');
            try {
                await db.deleteExam(examId);
                alert('Exam and all its questions deleted successfully!');
                loadExamsList();
            } catch (e) {
                alert('Failed to delete exam: ' + e.message);
            } finally {
                hideLoader();
            }
        });
    };

    // ─── GAME MANAGER ──────────────────────────────────────────
    window.showPrintExamModal = function (examId) {
        // Remove existing if any
        if (document.getElementById('print-exam-modal')) document.getElementById('print-exam-modal').remove();

        const modal = document.createElement('div');
        modal.id = 'print-exam-modal';
        modal.className = 'modal';
        modal.style.zIndex = '99999'; // ensure it's not hidden
        modal.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <div class="modal-header">
                    <h2>🖨️ Print Exam: ${examId}</h2>
                    <button class="modal-close" onclick="document.getElementById('print-exam-modal').remove()">&times;</button>
                </div>
                <div class="modal-body" style="text-align:center;">
                    <p style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.95rem;">
                        Tùy chỉnh in ấn và xáo trộn câu hỏi cho mã đề <strong>${examId}</strong>.
                    </p>
                    <div style="display:flex; gap:10px; margin-bottom: 1.5rem; text-align: left;">
                        <div style="flex:1;">
                            <label style="font-weight:bold; display:block; margin-bottom: 0.5rem; color:var(--text-main); font-size:0.9rem;">Số lượng mã đề in:</label>
                            <input type="number" id="print-copies-qty" value="1" min="1" max="20" style="width: 100%; padding: 0.5rem; border: 2px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; font-family: var(--font);">
                        </div>
                        <div style="flex:1;">
                            <label style="font-weight:bold; display:block; margin-bottom: 0.5rem; color:var(--text-main); font-size:0.9rem;">Cỡ chữ (pt):</label>
                            <input type="number" id="print-font-size" value="11" min="8" max="18" step="0.5" style="width: 100%; padding: 0.5rem; border: 2px solid var(--border-color); border-radius: var(--radius-sm); font-size: 1rem; font-family: var(--font);">
                        </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <button class="btn-primary" onclick="executePrintExam('${examId}', false)">🖨️ In cho Học Sinh (Tách mã đề, Không đáp án)</button>
                        <button class="btn-secondary" onclick="executePrintExam('${examId}', true)" style="background:#b45309; color:white;">🖨️ In cho Giáo Viên (Có Khoanh Đáp Án)</button>
                        <button class="btn-secondary" onclick="document.getElementById('print-exam-modal').remove()">Hủy</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));
    };

    window.executePrintExam = async function (examId, withAnswers) {
        const qtyInput = document.getElementById('print-copies-qty');
        const numCopies = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

        const fontInput = document.getElementById('print-font-size');
        const fontSize = fontInput ? parseFloat(fontInput.value) || 11 : 11;

        const modal = document.getElementById('print-exam-modal');
        if (modal) modal.remove();

        showLoader('Đang tạo bản in. Vui lòng chờ...');
        try {
            const allQuestions = await db.getQuestions(examId);
            const activeQ = allQuestions.filter(q => q.active === 'TRUE' || q.active === true || String(q.active) === '1');

            if (activeQ.length === 0) {
                alert('Không có câu hỏi nào trong đề thi này để in.');
                return;
            }

            let htmlStr = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Exam - ${examId}</title>
                <style>
                    body { font-family: 'Times New Roman', Times, serif; font-size: ${fontSize}pt; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 0; }
                    .print-container { max-width: 210mm; margin: 0 auto; padding: 15mm; }
                    .header { text-align: center; margin-bottom: 15px; }
                    .header h2, .header h3 { margin: 4px 0; font-weight: bold; }
                    .student-info { margin-bottom: 20px; font-weight: bold; }
                    .student-info table { width: 100%; border-collapse: collapse; }
                    .student-info td { padding: 6px 0; }
                    .page-break { page-break-before: always; }
                    .question { margin-bottom: 12px; page-break-inside: avoid; }
                    .question-text { font-weight: bold; margin-bottom: 5px; }
                    .options { margin-left: 15px; display: flex; flex-wrap: wrap; gap: 5px; }
                    .option-line { flex: 1 1 23%; min-width: 140px; }
                    .correct-ans { font-weight: bold; text-decoration: underline; }
                    .mark-correct { font-weight: bold; font-size: 1.05em; color: black; }
                    @media print {
                        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                        .print-container { padding: 0; margin: 0; width: 100%; max-width: 100%; }
                        .header { margin-top: 5mm; }
                    }
                </style>
            </head>
            <body>
            <div class="print-container">
            `;

            for (let c = 1; c <= numCopies; c++) {
                if (c > 1) {
                    htmlStr += `<div class="page-break"></div>`;
                }

                // Shuffle questions for this copy
                const shuffledQ = shuffleArray([...activeQ]);

                htmlStr += `
                <div class="header">
                    <h2 style="text-transform: uppercase;">BÀI KIỂM TRA TIẾNG ANH</h2>
                    <h3>Mã đề: ${examId} - Đề số 0${c} ${withAnswers ? '<span style="font-style:italic;">(Bản có Đáp án)</span>' : ''}</h3>
                </div>
                <div class="student-info">
                    <table>
                        <tr>
                            <td style="width: 50%;">Họ và tên: ..............................................................</td>
                            <td style="width: 25%;">Lớp: .........................</td>
                            <td style="width: 25%;">Điểm: ........./10</td>
                        </tr>
                        <tr>
                            <td colspan="3" style="padding-top:10px;">Lời phê của giáo viên: ....................................................................................................</td>
                        </tr>
                    </table>
                </div>
                <hr style="border: 0; border-bottom: 1.5px solid #000; margin-bottom: 15px;">
                <div class="questions-list">
                `;

                shuffledQ.forEach((q, index) => {
                    const qText = decodeUtf8Mangle(String(q.question_text || ''));
                    htmlStr += `<div class="question">`;
                    const displayQText = (q.type === 'arrange_sentence') ? 'Arrange the words to make a correct sentence:' : qText;
                    htmlStr += `<div class="question-text">Câu ${index + 1}: ${displayQText}</div>`;

                    const optA = decodeUtf8Mangle(q.option_a);
                    const optB = decodeUtf8Mangle(q.option_b);
                    const optC = decodeUtf8Mangle(q.option_c);
                    const optD = decodeUtf8Mangle(q.option_d);
                    const corAns = decodeUtf8Mangle(q.correct_answer);

                    const renderOption = (letter, optText) => {
                        if (!optText) return '';
                        let isCorrect = withAnswers && String(optText).trim() === String(corAns).trim();
                        let prefix = isCorrect ? `<span class="mark-correct">[✓] ${letter}.</span>` : `${letter}.`;
                        return `<div class="option-line ${isCorrect ? 'correct-ans' : ''}">${prefix} ${optText}</div>`;
                    };

                    if (q.type === 'multiple_choice' || q.type === 'single_choice' || q.type === 'vocabulary') {
                        htmlStr += `<div class="options">`;
                        htmlStr += renderOption('A', optA);
                        htmlStr += renderOption('B', optB);
                        htmlStr += renderOption('C', optC);
                        htmlStr += renderOption('D', optD);
                        htmlStr += `</div>`;
                    } else if (q.type === 'true_false') {
                        htmlStr += `<div class="options">`;
                        htmlStr += renderOption('A', 'TRUE');
                        htmlStr += renderOption('B', 'FALSE');
                        htmlStr += `</div>`;
                    } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
                        if (withAnswers) {
                            htmlStr += `<div class="options" style="font-style:italic;">Đáp án: <span class="correct-ans">${corAns || q.accepted_answers}</span></div>`;
                        } else {
                            htmlStr += `<div class="options" style="display:block; margin-top:10px;">.............................................................................</div>`;
                        }
                    } else if (q.type === 'matching') {
                        if (withAnswers) {
                            htmlStr += `<div class="options" style="font-style:italic;">Đáp án nối: <span class="correct-ans">${corAns}</span></div>`;
                        } else {
                            htmlStr += `<div class="options" style="display:block; margin-top:5px;">(Học sinh nối/điền đáp án thích hợp)</div>`;
                        }
                    } else if (q.type === 'arrange_sentence') {
                        const targetSentence = (q.question_text && q.question_text.length > 2) ? q.question_text : (q.correct_answer || '');
                        const words = decodeUtf8Mangle(String(targetSentence)).trim().split(/\s+/).filter(w => w !== '');
                        const shuffled = [...words].sort(() => Math.random() - 0.5);
                        htmlStr += `<div class="options" style="display:block; margin-top:5px;">Từ gợi ý: <strong>${shuffled.join(' / ')}</strong></div>`;
                        if (withAnswers) {
                            htmlStr += `<div class="options" style="font-style:italic; margin-top:2px;">Đáp án: <span class="correct-ans">${decodeUtf8Mangle(String(targetSentence))}</span></div>`;
                        } else {
                            htmlStr += `<div class="options" style="display:block; margin-top:10px;">.............................................................................</div>`;
                        }
                    }

                    htmlStr += `</div>`;
                });

                htmlStr += `</div>`; // closes questions-list
            }

            htmlStr += `
            </div>
            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                    }, 500);
                }
            </script>
            </body>
            </html>
            `;

            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(htmlStr);
                printWindow.document.close();
            } else {
                alert('Trình duyệt đã chặn Pop-up (Bảng In). Vui lòng cấp quyền cho trang web để tiếp tục in bài kiểm tra!');
            }

        } catch (e) {
            console.error(e);
            alert('Lỗi tạo tập tin in ảo: ' + e.message);
        } finally {
            hideLoader();
        }
    };

    async function loadGamesList() {
        const container = document.getElementById('games-grid-container');
        if (!container) return;

        // Bind create game button before any return statement
        const createBtn = document.getElementById('open-create-game-btn');
        if (createBtn) createBtn.onclick = () => showGameModal(null);

        container.innerHTML = '<p class="loading-message">Loading games...</p>';
        try {
            const gamesResp = await db.getGames();
            const games = gamesResp.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            if (games.length === 0) {
                container.innerHTML = `
                    <div class="empty-questions-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon" style="color:var(--text-muted);"><line x1="6" y1="12" x2="10" y2="12"></line><line x1="8" y1="10" x2="8" y2="14"></line><line x1="15" y1="13" x2="15.01" y2="13"></line><line x1="18" y1="11" x2="18.01" y2="11"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect></svg>
                        <p>No games yet.</p>
                        <button class="btn-primary" onclick="showGameModal(null)" style="margin-top:0.5rem;">+ New Game</button>
                    </div>`;
                return;
            }
            container.innerHTML = '<div class="game-grid">' + games.map(g => {
                const safeJson = JSON.stringify(g).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                return `
                <div class="game-card">
                    <div class="game-card-img">
                        ${g.image_url ? `<img src="${g.image_url}" alt="${(g.name || '').replace(/"/g, '&quot;')}" onerror="this.parentElement.innerHTML='🎮'">` : '🎮'}
                    </div>
                    <div class="game-card-body">
                        <p class="game-card-title">${(g.name || 'Game').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        <p class="game-card-url" title="${(g.url || '').replace(/"/g, '&quot;')}">🔗 ${(g.url || 'N/A').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                        <div class="game-card-actions">
                            <button class="btn-copy-url" onclick="copyGameUrl('${(g.url || '').replace(/'/g, "\\'")}')"><i class="fa fa-copy"></i> Copy URL</button>
                            <a class="btn-play-game" href="${(g.url || '').replace(/"/g, '&quot;')}" target="_blank" rel="noopener">▶️ Open</a>
                        </div>
                        <div class="game-card-actions" style="margin-top:0.3rem;">
                            <button class="btn-secondary" style="flex:1;font-size:0.8rem;" onclick="showGameModal(${safeJson})"><i class="fa fa-pen" style="color:#6366f1;"></i> Edit</button>
                            <button class="delete-btn" style="flex:1;font-size:0.8rem;" onclick="deleteGameEntry('${g.game_id}')"><i class="fa fa-trash"></i> Delete</button>
                        </div>
                    </div>
                </div>
            `}).join('') + '</div>';
        } catch (err) {
            container.innerHTML = `<p class="error-message">Error loading game: ${err.message}</p>`;
        }
    }

    window.copyGameUrl = function (url) {
        navigator.clipboard.writeText(url).then(() => alert('Copied URL: ' + url)).catch(() => prompt('Copy URL:', url));
    };

    window.deleteGameEntry = async function (gameId) {
        window.showConfirm('Delete Game', 'Are you sure you want to delete this game?', async () => {
            showLoader('Deleting game...');
            try {
                await db.deleteGame(gameId);
                loadGamesList();
            } catch (e) { alert('Error deleting: ' + e.message); }
            finally { hideLoader(); }
        });
    };

    window.showGameModal = function (game) {
        const isEdit = game && game.game_id;
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'game-modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:480px;">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Edit Game' : '+ New Game'}</h3>
                    <button class="modal-close" onclick="document.getElementById('game-modal').remove()">&times;</button>
                </div>
                <form id="game-form" style="background:none;border:none;padding:0;display:flex;flex-direction:column;gap:0;">
                    <div class="modal-section">
                        <p class="modal-section-title">🎮 Game Info</p>
                        <div style="display:flex;flex-direction:column;gap:0.75rem;">
                            <div>
                                <label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:0.25rem;">Game Name <span class="required-star">*</span></label>
                                <input id="game-name" type="text" value="${isEdit ? (game.name || '') : ''}" placeholder="VD: Kahoot Vocabulary" required
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:0.25rem;">Game URL <span class="required-star">*</span></label>
                                <input id="game-url" type="url" value="${isEdit ? (game.url || '') : ''}" placeholder="https://kahoot.it/..." required
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:0.25rem;">Image URL</label>
                                <input id="game-image" type="url" value="${isEdit ? (game.image_url || '') : ''}" placeholder="https://...image.png"
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                                <p style="font-size:0.78rem;color:var(--text-muted);margin:0.25rem 0 0;">Leave empty if no image — use 🎮 emoji instead.</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions" style="margin-top:0.5rem;">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('game-modal').remove()">Cancel</button>
                        <button type="submit" class="btn-primary">${isEdit ? '💾 Save' : '+ Add'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        document.getElementById('game-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const gameData = {
                game_id: isEdit ? game.game_id : '',
                name: document.getElementById('game-name').value.trim(),
                url: document.getElementById('game-url').value.trim(),
                image_url: document.getElementById('game-image').value.trim()
            };
            if (!gameData.name || !gameData.url) { alert('Please enter game name and URL.'); return; }
            showLoader('Saving game...');
            try {
                await db.saveGame(gameData);
                document.getElementById('game-modal').remove();
                loadGamesList();
            } catch (err) { alert('Lỗi: ' + err.message); }
            finally { hideLoader(); }
        });
    };

    window.showExamModal = function (exam) {
        const isEdit = exam !== null;
        const generatedId = isEdit ? exam.exam_id : 'ENG_' + Date.now().toString().slice(-6);
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'exam-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>${isEdit ? 'Edit Exam Details' : 'Create New Exam'}</h3>
                    <button class="modal-close" onclick="closeExamModal()">&times;</button>
                </div>
                <form id="exam-form" style="background: none; border: none; padding: 0;">
                    <label for="modal-exam-id">Exam ID:</label>
                    <input type="text" id="modal-exam-id" name="exam_id" value="${generatedId}" readonly required style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box; background-color:#f3f4f6;">
                    
                    <label for="modal-exam-title">Exam Title:</label>
                    <input type="text" id="modal-exam-title" name="title" value="${isEdit ? exam.title : ''}" required style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box;">
                    
                    <label for="modal-exam-duration">Duration (minutes):</label>
                    <input type="number" id="modal-exam-duration" name="duration_minutes" value="${isEdit ? exam.duration_minutes : '15'}" min="1" required style="width:100%; border:2px solid var(--border-color); border-radius:var(--radius-sm); padding:0.6rem; box-sizing:border-box;">
                    
                    <div class="checkbox-wrapper" style="margin-top:1rem;">
                        <input type="checkbox" id="modal-exam-shuffle-q" name="shuffle_questions" ${(isEdit ? (exam.shuffle_questions === true || exam.shuffle_questions === 'TRUE') : true) ? 'checked' : ''}>
                        <label for="modal-exam-shuffle-q">Shuffle Questions</label>
                    </div>
                    
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="modal-exam-shuffle-opt" name="shuffle_options" ${(isEdit ? (exam.shuffle_options === true || exam.shuffle_options === 'TRUE') : true) ? 'checked' : ''}>
                        <label for="modal-exam-shuffle-opt">Shuffle MCQ Options</label>
                    </div>
                    
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="modal-exam-show-res" name="show_result" ${(isEdit ? (exam.show_result === true || exam.show_result === 'TRUE') : true) ? 'checked' : ''}>
                        <label for="modal-exam-show-res">Show Result After Submission</label>
                    </div>
                    
                    <div class="checkbox-wrapper">
                        <input type="checkbox" id="modal-exam-active" name="active" ${(isEdit ? (exam.active === true || exam.active === 'TRUE') : true) ? 'checked' : ''}>
                        <label for="modal-exam-active">Is Active (Accepting Responses)</label>
                    </div>

                    <div class="modal-actions" style="margin-top:1.5rem;">
                        <button type="button" class="btn-secondary" onclick="closeExamModal()">Cancel</button>
                        <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Create Exam'}</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        let isSavingExam = false;
        const form = document.getElementById('exam-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSavingExam) return;
            isSavingExam = true;

            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
            }

            const fd = new FormData(form);
            const data = {};
            fd.forEach((val, key) => {
                data[key] = val;
            });
            data.shuffle_questions = document.getElementById('modal-exam-shuffle-q').checked;
            data.shuffle_options = document.getElementById('modal-exam-shuffle-opt').checked;
            data.show_result = document.getElementById('modal-exam-show-res').checked;
            data.active = document.getElementById('modal-exam-active').checked;
            data.duration_minutes = parseInt(data.duration_minutes) || 15;

            showLoader('Đang lưu thông tin đề thi...');
            try {
                if (isEdit) {
                    await db.editExam(data);
                    alert('Exam details updated successfully!');
                } else {
                    data.created_at = getUTC7ISOString();
                    await db.saveExam(data);
                    alert('New exam created successfully!');
                }
                closeExamModal();
                loadExamsList();
            } catch (err) {
                alert('Operation failed: ' + err.message);
            } finally {
                isSavingExam = false;
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = '';
                }
                hideLoader();
            }
        });
    };

    window.closeExamModal = function () {
        const modal = document.getElementById('exam-modal');
        if (modal) modal.remove();
    };

    function loadStudentMode() {
        appContainer.innerHTML = `
            <div id="student-content" style="max-width: 550px; margin: 2rem auto; padding: 2rem; background: white; border-radius: var(--radius); box-shadow: var(--shadow); border: 2px solid var(--border-color); animation: fadeIn 0.4s ease;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <span style="font-size: 4rem; display: block; margin-bottom: 0.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">🎒</span>
                    <h2 style="margin: 0; color: var(--primary); font-weight: 800; font-size: 1.8rem; letter-spacing: -0.5px;">Bắt đầu Bài kiểm tra</h2>
                    <p style="color: var(--text-muted); margin: 0.5rem 0 0 0; font-size: 0.95rem; font-weight: 600;">Vui lòng điền đầy đủ thông tin để tham gia phòng thi.</p>
                </div>
                
                <form id="student-start-form" style="background: none; border: none; padding: 0; display: flex; flex-direction: column; gap: 1.25rem;">
                    <div>
                        <label for="student_name" style="font-weight: 800; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-main);">Họ và tên Học sinh:</label>
                        <input type="text" id="student_name" name="student_name" required placeholder="Ví dụ: Nguyễn Văn A" style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 1rem; box-sizing: border-box; font-family: var(--font); transition: var(--transition);">
                    </div>
                    
                    <div>
                        <label for="class_name" style="font-weight: 800; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-main);">Lớp học:</label>
                        <input type="text" id="class_name" name="class_name" required placeholder="Ví dụ: 7A1" style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 1rem; box-sizing: border-box; font-family: var(--font); transition: var(--transition);">
                    </div>
                    
                    <div id="exam-selection-group">
                        <label for="exam-select" style="font-weight: 800; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-main);">Chọn bài kiểm tra:</label>
                        <select id="exam-select" name="exam_id" required style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 1rem; box-sizing: border-box; font-family: var(--font); background-color: white; transition: var(--transition);">
                            <option value="">-- Click để chọn đề thi --</option>
                        </select>
                    </div>

                    <div id="url-exam-info" style="display: none; background-color: var(--primary-light); border: 2px solid var(--primary); border-radius: var(--radius-sm); padding: 1rem; margin-top: 0.25rem;">
                        <p style="margin: 0; color: var(--primary); font-weight: 800; font-size: 0.95rem;">🎯 Bài kiểm tra đã chỉ định:</p>
                        <p id="url-exam-title" style="margin: 0.25rem 0 0 0; color: var(--text-main); font-weight: 700; font-size: 1.1rem;"></p>
                    </div>

                    <button type="submit" class="btn-primary" style="padding: 0.9rem 1.5rem; font-size: 1.1rem; font-weight: 800; border-radius: var(--radius-sm); margin-top: 1rem; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border: none; box-shadow: 0 4px 15px rgba(77, 150, 255, 0.3); transition: var(--transition);">👉 Vào Phòng Thi</button>
                </form>
                
                <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                    💡 <strong>Lưu ý:</strong>
                    <ul style="margin: 0.25rem 0 0 0; padding-left: 1.25rem;">
                        <li>Hệ thống sẽ lưu nháp bài làm tự động đề phòng mất kết nối hoặc sập nguồn máy tính.</li>
                        <li>Khi hết giờ làm bài, hệ thống sẽ tự động nộp bài kiểm tra ngay lập tức.</li>
                    </ul>
                </div>
            </div>
        `;

        // Check URL params
        const urlParams = new URLSearchParams(window.location.search);
        const urlExamId = urlParams.get('exam_id') || urlParams.get('examId');

        if (urlExamId) {
            populateStudentExamsDropdown().then(() => {
                const selectEl = document.getElementById('exam-select');
                // Select the option explicitly
                selectEl.value = urlExamId;

                if (selectEl.selectedIndex > 0) { // Found a match
                    document.getElementById('exam-selection-group').style.display = 'none';
                    document.getElementById('url-exam-info').style.display = 'block';
                    document.getElementById('url-exam-title').textContent = selectEl.options[selectEl.selectedIndex].textContent.replace(` (${urlExamId})`, '');
                } else {
                    // Invalid param, show dropdown
                    document.getElementById('exam-selection-group').style.display = 'block';
                }
            });
        } else {
            populateStudentExamsDropdown();
        }

        document.getElementById('student-start-form').addEventListener('submit', handleStartExam);
    }

    /**
     * Dropdown Population
     */
    async function populateExamsDropdown() {
        const select = document.getElementById('qbm-exam-select');
        const aiSelect = document.getElementById('ai-import-exam-select');
        if (!select) return;

        select.innerHTML = '<option value="">Loading exams...</option>';
        select.disabled = true;

        if (aiSelect) {
            aiSelect.innerHTML = '<option value="">Loading exams...</option>';
            aiSelect.disabled = true;
        }

        try {
            const exams = await db.getExams();
            if (exams.length > 0) {
                select.innerHTML = '<option value="">-- Select Exam ID --</option>';
                if (aiSelect) aiSelect.innerHTML = '<option value="">-- Chọn Đề thi --</option>';

                exams.forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.exam_id;
                    option.textContent = `${exam.title} (${exam.exam_id})`;
                    select.appendChild(option);

                    if (aiSelect) {
                        const aiOption = option.cloneNode(true);
                        aiSelect.appendChild(aiOption);
                    }
                });
            } else {
                select.innerHTML = '<option value="">No exams found</option>';
                if (aiSelect) aiSelect.innerHTML = '<option value="">Không tìm thấy đề thi</option>';
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
            select.innerHTML = '<option value="">Error loading exams</option>';
            if (aiSelect) aiSelect.innerHTML = '<option value="">Lỗi tải đề thi</option>';
        } finally {
            select.disabled = false;
            if (aiSelect) aiSelect.disabled = false;
        }
    }

    async function populateStudentExamsDropdown() {
        const select = document.getElementById('exam-select');
        if (!select) return;
        select.innerHTML = '<option value="">Loading exams...</option>';
        select.disabled = true;

        try {
            const exams = await db.getExams();
            // Filter only active exams for students
            const activeExams = exams.filter(e => e.active === true || e.active === 'TRUE' || e.active === 1 || e.active === '1');

            if (activeExams.length > 0) {
                select.innerHTML = '<option value="">-- Chọn bài kiểm tra --</option>';
                activeExams.forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.exam_id;
                    option.textContent = exam.title;
                    option.dataset.exam = JSON.stringify(exam);
                    select.appendChild(option);
                });

                // If there's an exam ID in URL query, pre-select it!
                const urlParams = new URLSearchParams(window.location.search);
                const urlExamId = urlParams.get('examId');
                if (urlExamId) {
                    const existsAndActive = activeExams.some(e => String(e.exam_id) === String(urlExamId));
                    if (!existsAndActive) {
                        alert("⚠️ Bài kiểm tra này hiện đang khóa (Inactive) hoặc không tồn tại. Bạn không thể tham gia!");
                        window.location.href = 'student.html';
                        return;
                    }
                    select.value = urlExamId;
                }
            } else {
                select.innerHTML = '<option value="">Không tìm thấy bài kiểm tra nào khả dụng</option>';

                // Redirect if student accessed an invalid exam URL directly
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('examId')) {
                    alert("⚠️ Bài kiểm tra này hiện đang khóa (Inactive) hoặc không tồn tại. Bạn không thể tham gia!");
                    window.location.href = 'student.html';
                }
            }
        } catch (error) {
            console.error('Error fetching exams for student:', error);
            select.innerHTML = '<option value="">Lỗi tải dữ liệu phòng thi</option>';
        } finally {
            select.disabled = false;
        }
    }

    /**
     * Excel File Reading & Preview with Strict Validation
     */
    function normalizeRowKeys(row) {
        const normalized = {};
        for (const key in row) {
            if (row.hasOwnProperty(key)) {
                const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
                normalized[normalizedKey] = row[key];
            }
        }
        return normalized;
    }

    function validateQuestionRow(row, rowIndex, existingQuestionIds, fileQuestionIds) {
        const errors = [];
        const rowNum = rowIndex + 2;

        const validTypes = ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'arrange_sentence', 'vocabulary', 'matching', 'short_answer'];
        if (!row.type) {
            errors.push(`Row ${rowNum}: 'type' is missing.`);
        } else if (!validTypes.includes(String(row.type).trim().toLowerCase())) {
            errors.push(`Row ${rowNum}: Invalid type '${row.type}'. Must be one of: ${validTypes.join(', ')}`);
        }

        const qtype = row.type ? String(row.type).trim().toLowerCase() : '';
        const correctAnswerOptional = ['short_answer', 'matching', 'arrange_sentence'].includes(qtype);
        if (!correctAnswerOptional && (row.correct_answer === undefined || row.correct_answer === null || String(row.correct_answer).trim() === '')) {
            errors.push(`Row ${rowNum}: 'correct_answer' is missing.`);
        }

        return errors;
    }

    function handleFileSelectAndPreview(event) {
        event.preventDefault();
        const file = event.target['exam-file'].files[0];
        if (!file) {
            alert('Please select a file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert('Excel file is empty.');
                    return;
                }

                const examSelect = document.getElementById('qbm-exam-select');
                const selectedExamId = examSelect ? examSelect.value : '';

                if (!selectedExamId) {
                    window.alert('Vui lòng chọn Mã Đề (Exam ID) từ menu phía trên trước khi Import.');
                    return;
                }

                // Validate questions
                const processedQuestions = [];
                let errorCount = 0;

                const tableRows = [];
                json.forEach((rawRow, index) => {
                    const row = normalizeRowKeys(rawRow);
                    const validationErrors = validateQuestionRow(row, index, new Set(), new Set());

                    const isValid = validationErrors.length === 0;
                    if (!isValid) errorCount++;

                    const processed = {
                        question_id: 'Q' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 1000) + index,
                        exam_id: selectedExamId,
                        type: row.type ? String(row.type).trim().toLowerCase() : '',
                        level: row.level ? String(row.level).trim().toLowerCase() : 'medium',
                        question_text: row.question_text ? String(row.question_text).trim() : '',
                        option_a: row.option_a ? String(row.option_a).trim() : '',
                        option_b: row.option_b ? String(row.option_b).trim() : '',
                        option_c: row.option_c ? String(row.option_c).trim() : '',
                        option_d: row.option_d ? String(row.option_d).trim() : '',
                        correct_answer: row.correct_answer !== undefined ? String(row.correct_answer).trim() : '',
                        accepted_answers: row.accepted_answers ? String(row.accepted_answers).trim() : '',
                        explanation: row.explanation ? String(row.explanation).trim() : '',
                        points: row.points !== undefined && row.points !== '' ? parseFloat(row.points) : 1,
                        tags: row.tags ? String(row.tags).trim() : '',
                        active: row.active === undefined || row.active === 'TRUE' || row.active === true || row.active === 1 || row.active === '1'
                    };

                    if (processed.type === 'arrange_sentence') {
                        processed.correct_answer = processed.question_text;
                    }

                    processedQuestions.push(processed);

                    // Generate preview row row
                    tableRows.push(`
                        <tr class="${isValid ? '' : 'invalid-row'}" style="${isValid ? '' : 'background-color: var(--accent-light);'}">
                            <td>Row ${index + 2}</td>
                            <td>${processed.question_id || '<span style="color:var(--accent);font-weight:bold;">Missing</span>'}</td>
                            <td>${processed.type || '<span style="color:var(--accent);font-weight:bold;">Missing</span>'}</td>
                            <td class="question-text-cell" title="${processed.question_text}">${processed.question_text || ''}</td>
                            <td>${processed.correct_answer || '<span style="color:var(--accent);font-weight:bold;">Missing</span>'}</td>
                            <td>
                                ${isValid
                            ? '<span class="preview-status valid">✅ Valid</span>'
                            : `<span class="preview-status invalid" title="${validationErrors.join(', ')}">❌ Invalid (${validationErrors.length})</span>`}
                            </td>
                        </tr>
                    `);
                });

                questionsToImport = processedQuestions;

                const previewContainer = document.getElementById('import-preview-container');
                const tableContainer = document.getElementById('preview-table-container');
                const confirmBtn = document.getElementById('confirm-import-btn');

                tableContainer.innerHTML = `
                    <table border="1">
                        <thead>
                            <tr>
                                <th>Excel Row</th>
                                <th>QID</th>
                                <th>Type</th>
                                <th>Question Text</th>
                                <th>Correct Answer</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows.join('')}
                        </tbody>
                    </table>
                `;

                previewContainer.style.display = 'block';

                if (errorCount > 0) {
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = `Fix errors (${errorCount}) to Import`;
                    confirmBtn.style.backgroundColor = '#cbd5e1';
                    confirmBtn.style.cursor = 'not-allowed';
                } else {
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = `Confirm Import (${processedQuestions.length} Questions)`;
                    confirmBtn.style.backgroundColor = 'var(--secondary)';
                    confirmBtn.style.cursor = 'pointer';
                    confirmBtn.onclick = handleConfirmImport;
                }
            } catch (err) {
                console.error(err);
                alert('Failed to read or parse file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleConfirmImport() {
        if (questionsToImport.length === 0) {
            alert('No questions to import.');
            return;
        }

        const confirmBtn = document.getElementById('confirm-import-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Importing...';

        showLoader('Importing questions...');
        const autoCreated = []; // track for rollback
        try {
            // ── Auto-create exams for any exam_id that doesn't exist yet ──
            const examIdsInFile = [...new Set(questionsToImport.map(q => q.exam_id).filter(Boolean))];
            const existingExams = await db.getExams();
            const existingExamIds = new Set(existingExams.map(e => String(e.exam_id)));

            for (const examId of examIdsInFile) {
                if (!existingExamIds.has(String(examId))) {
                    const autoTitle = examId
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
                    const newExam = {
                        exam_id: examId,
                        title: autoTitle,
                        duration_minutes: 15,
                        shuffle_questions: true,
                        shuffle_options: true,
                        show_result: true,
                        active: true,
                        created_at: getUTC7ISOString()
                    };
                    try {
                        await db.saveExam(newExam);
                        autoCreated.push(examId);
                    } catch (e) {
                        if (!e.message.includes('đã tồn tại') && !e.message.includes('already exists')) {
                            console.warn(`Could not auto-create exam ${examId}:`, e.message);
                        }
                    }
                }
            }

            // ── Import the questions (atomic) ──
            const result = await db.importQuestions(questionsToImport);

            let msg = result.message || 'Questions imported successfully!';
            if (autoCreated.length > 0) {
                msg += `\n\n✅ Đã tự động tạo ${autoCreated.length} đề thi mới: ${autoCreated.join(', ')}`;
            }
            alert(msg);

            document.getElementById('import-questions-form').reset();
            document.getElementById('import-preview-container').style.display = 'none';
            questionsToImport = [];
            loadExamsList();
            await loadQuestionBank();

        } catch (error) {
            console.error('Error importing questions:', error);

            // ── ROLLBACK: xóa các exam đã tự tạo nếu import câu hỏi thất bại ──
            if (autoCreated.length > 0) {
                showLoader('Import lỗi – đang rollback đề thi đã tạo...');
                for (const examId of autoCreated) {
                    try {
                        await db.deleteExam(examId);
                    } catch (rollbackErr) {
                        console.warn(`Rollback failed for exam ${examId}:`, rollbackErr.message);
                    }
                }
            }

            alert(`❌ Import thất bại, đã rollback lại.\nLỗi: ${error.message}`);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Import';
            hideLoader();
        }
    }

    /**
     * Create Exam
     */
    async function handleCreateExam(event) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const examData = {};
        formData.forEach((value, key) => {
            examData[key] = value;
        });

        // Default or random exam ID if empty
        if (!examData.exam_id) {
            examData.exam_id = 'ENG_' + Date.now().toString().substring(8);
        } else {
            examData.exam_id = examData.exam_id.trim();
        }

        examData.shuffle_questions = form.elements.shuffle_questions.checked;
        examData.shuffle_options = form.elements.shuffle_options.checked;
        examData.show_result = form.elements.show_result.checked;
        examData.active = form.elements.active.checked;
        examData.created_at = getUTC7ISOString();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';

        try {
            await db.saveExam(examData);
            alert('Exam created successfully!');

            const examLinkContainer = document.getElementById('exam-link-container');
            const examLinkInput = document.getElementById('exam-link');
            const copyLinkBtn = document.getElementById('copy-link-btn');

            const examLink = `${window.location.origin}${window.location.pathname}?examId=${examData.exam_id}`;
            examLinkInput.value = examLink;
            examLinkContainer.style.display = 'block';

            copyLinkBtn.onclick = () => {
                examLinkInput.select();
                navigator.clipboard.writeText(examLink);
                alert('Link copied to clipboard!');
            };

            form.reset();
            populateExamsDropdown(); // Refresh dropdown
        } catch (error) {
            alert(error.message);
            // Even if API failed, the exam was saved locally, so we populate dropdown
            populateExamsDropdown();
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Create Exam';
        }
    }

    /**
     * Question Bank View & Management
     */
    async function loadQuestionBank() {
        const examId = document.getElementById('qbm-exam-select').value;
        const container = document.getElementById('question-bank-container');

        if (!examId) {
            container.innerHTML = '<p class="info-message">Please select an exam to view its questions.</p>';
            return;
        }

        showLoader('Loading questions...');
        container.innerHTML = '<p class="loading-message">Loading questions...</p>';

        try {
            const rawQuestions = await db.getQuestions(examId);
            loadedQuestions = rawQuestions.map(decodeQuestionFields).reverse(); // Reverse to sort by insertion DESC

            if (loadedQuestions.length === 0) {
                container.innerHTML = `
                    <div class="empty-questions-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon" style="color:var(--text-muted);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
                        <p>No questions yet for this exam.</p>
                        <p style="font-size:0.9rem;">Add your first question!</p>
                        <button class="btn-primary" onclick="document.getElementById('manual-add-question-btn').click()" style="margin-top:0.5rem;">
                            + Add Question
                        </button>
                    </div>
                `;
                return;
            }

            renderFilteredQuestionBank();
        } catch (error) {
            console.error('Error loading question bank:', error);
            container.innerHTML = `<p class="error-message">Error: ${error.message}</p>`;
        } finally {
            hideLoader();
        }
    }

    function renderFilteredQuestionBank() {
        const container = document.getElementById('question-bank-container');
        if (!container || loadedQuestions.length === 0) return;

        const typeFilter = document.getElementById('qbm-type-select').value;
        const levelFilter = document.getElementById('qbm-level-select').value;
        const searchFilter = document.getElementById('qbm-search-input').value.toLowerCase();

        let filtered = loadedQuestions;

        if (typeFilter) {
            filtered = filtered.filter(q => q.type === typeFilter);
        }
        if (levelFilter) {
            filtered = filtered.filter(q => q.level === levelFilter);
        }
        if (searchFilter) {
            filtered = filtered.filter(q =>
                String(q.question_text).toLowerCase().includes(searchFilter) ||
                String(q.question_id).toLowerCase().includes(searchFilter)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="info-message">No questions match the current filters.</p>';
            return;
        }

        renderQuestionBankTable(filtered);
    }

    // Module-level store for current QB table data (used by edit buttons via event listeners)
    let _qbTableData = [];

    function renderQuestionBankTable(questions) {
        // Save reference so edit listeners can safely access full question objects
        _qbTableData = questions;

        const container = document.getElementById('question-bank-container');

        let bannerHtml = '';
        const examSelect = document.getElementById('qbm-exam-select');
        const selectedExamId = examSelect ? examSelect.value : '';

        if (selectedExamId && examSelect.selectedIndex > 0) {
            const selectedText = examSelect.options[examSelect.selectedIndex].textContent;
            const examTitle = selectedText.replace(` (${selectedExamId})`, '');

            bannerHtml = `
            <div style="background-color: #f0f7ff; padding: 1.25rem; border-radius: var(--radius); border: 1px solid rgba(77, 150, 255, 0.3); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                <div>
                    <h4 style="margin: 0; color: var(--primary); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;"><span style="font-size: 1.3rem;">📝</span> ${examTitle}</h4>
                    <p style="margin: 0.35rem 0 0 0; color: var(--text-muted); font-size: 0.9rem; font-weight: 600;">Exam ID: <strong style="color: var(--text-main);">${selectedExamId}</strong></p>
                </div>
                <button class="btn-primary" onclick="copyStudentLink('${selectedExamId}')" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem;">
                    <span style="font-size: 1.1rem;">🔗</span> Copy Student Link
                </button>
            </div>`;
        }

        const headers = ['Actions', 'No.', 'question_id', 'type', 'level', 'question_text', 'correct_answer', 'points', 'created_at'];

        let table = bannerHtml + '<div class="table-responsive"><table class="data-table"><thead><tr>';
        headers.forEach(header => table += `<th>${header.replace(/_/g, ' ').toUpperCase()}</th>`);
        table += '</tr></thead><tbody>';

        questions.forEach((q, idx) => {
            table += `<tr data-question-id="${q.question_id}">`;

            // Actions — use data-idx (NO JSON in onclick) so special chars in question fields don't break the button
            table += `
                <td class="actions-cell">
                    <button class="edit-btn qb-edit-btn" title="Edit Question" data-idx="${idx}"><i class="fa fa-pen" style="color:#6366f1;"></i></button>
                    <button class="delete-btn" title="Delete Question" onclick="deleteQuestion('${q.question_id}', '${q.exam_id}')"><i class="fa fa-trash"></i></button>
                </td>
            `;

            // No.
            table += `<td>${idx + 1}</td>`;

            table += `<td>${q.question_id || ''}</td>`;
            table += `<td><span class="badge badge-primary">${q.type || ''}</span></td>`;
            table += `<td><span class="badge badge-secondary">${q.level || ''}</span></td>`;
            table += `<td class="question-text-cell" title="${(q.question_text || '').replace(/"/g, '&quot;')}">${q.question_text || ''}</td>`;
            table += `<td class="question-text-cell" title="${(q.correct_answer || '').replace(/"/g, '&quot;')}">${q.correct_answer || ''}</td>`;
            table += `<td>${q.points || '1'}</td>`;
            const dateStr = q.created_at ? new Date(q.created_at).toLocaleString('vi-VN') : 'Unknown';
            table += `<td style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</td>`;

            table += `</tr>`;
        });

        table += '</tbody></table></div>';
        container.innerHTML = table;

        // Attach event listeners to edit buttons — reads question safely from questions array by index
        container.querySelectorAll('.qb-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const q = _qbTableData[idx];
                if (q) window.showEditModal(q);
            });
        });
    }

    const TYPE_HINTS = {
        multiple_choice: {
            emoji: '🔤',
            hint: 'Điền 4 lựa chọn A/B/C/D. Đánh dấu tất cả đáp án đúng tại các nút A B C D bên dưới. Cho phép chọn nhiều đáp án.',
            optionALabel: 'Option A', optionBLabel: 'Option B', optionCLabel: 'Option C', optionDLabel: 'Option D',
            optionAPlaceholder: 'Lựa chọn A', optionBPlaceholder: 'Lựa chọn B', optionCPlaceholder: 'Lựa chọn C', optionDPlaceholder: 'Lựa chọn D',
            correctPlaceholder: 'VD: goes  (text đúng với 1 option ở trên)',
            acceptedPlaceholder: 'VD: ["A", "B"]',
            showOptions: true, correctRequired: true
        },
        single_choice: {
            emoji: '🔘',
            hint: 'Điền 4 lựa chọn A/B/C/D. Chỉ chọn MỘT đáp án đúng tại phần nút bên dưới.',
            optionALabel: 'Option A', optionBLabel: 'Option B', optionCLabel: 'Option C', optionDLabel: 'Option D',
            optionAPlaceholder: 'Lựa chọn A', optionBPlaceholder: 'Lựa chọn B', optionCPlaceholder: 'Lựa chọn C', optionDPlaceholder: 'Lựa chọn D',
            correctPlaceholder: 'VD: goes  (text đúng với 1 option ở trên)',
            acceptedPlaceholder: 'VD: ["A"]',
            showOptions: true, correctRequired: true
        },
        fill_blank: {
            emoji: '✏️',
            hint: 'Để trống Option A-D. Câu hỏi có dạng: "They usually ___ to school." → correct_answer = "walk".',
            optionALabel: '', optionBLabel: '', optionCLabel: '', optionDLabel: '',
            optionAPlaceholder: '', optionBPlaceholder: '', optionCPlaceholder: '', optionDPlaceholder: '',
            correctPlaceholder: 'VD: walk',
            acceptedPlaceholder: '["walk","walks"]',
            showOptions: false, correctRequired: true
        },
        true_false: {
            emoji: '☑️',
            hint: 'Câu hỏi đúng/sai. Correct Answer phải là TRUE hoặc FALSE.',
            optionALabel: '', optionBLabel: '', optionCLabel: '', optionDLabel: '',
            optionAPlaceholder: '', optionBPlaceholder: '', optionCPlaceholder: '', optionDPlaceholder: '',
            correctPlaceholder: 'TRUE hoặc FALSE',
            acceptedPlaceholder: '["TRUE","True","true"]',
            showOptions: false, correctRequired: true
        },
        vocabulary: {
            emoji: '📖',
            hint: 'Giống multiple choice — 4 lựa chọn A/B/C/D về nghĩa của từ. Correct Answer là nghĩa đúng.',
            optionALabel: 'Nghĩa A', optionBLabel: 'Nghĩa B', optionCLabel: 'Nghĩa C', optionDLabel: 'Nghĩa D',
            optionAPlaceholder: 'Nghĩa 1', optionBPlaceholder: 'Nghĩa 2', optionCPlaceholder: 'Nghĩa 3', optionDPlaceholder: 'Nghĩa 4',
            correctPlaceholder: 'VD: Thư viện',
            acceptedPlaceholder: '["Thư viện"]',
            showOptions: true, correctRequired: true
        },
        arrange_sentence: {
            emoji: '📝',
            hint: 'Nhập câu Tiếng Anh đúng hoàn chỉnh vào ô "Question Text". ĐÃ ẨN CÁC Ô ĐÁP ÁN BÊN DƯỚI. Ứng dụng sẽ xáo trộn câu này.',
            optionALabel: '', optionBLabel: '', optionCLabel: '', optionDLabel: '',
            optionAPlaceholder: '', optionBPlaceholder: '', optionCPlaceholder: '', optionDPlaceholder: '',
            correctPlaceholder: '',
            acceptedPlaceholder: '',
            showOptions: false, correctRequired: false
        },
        matching: {
            emoji: '🔗',
            hint: 'Nhập list câu hỏi ở Question Text (mỗi câu 1 dòng). Nhập list câu trả lời tương ứng ở Correct Answer (mỗi câu 1 dòng). Số lượng dòng phải BẰNG nhau. ĐÃ ẨN CÁC Ô ĐÁP ÁN BÊN DƯỚI.',
            optionALabel: '', optionBLabel: '', optionCLabel: '', optionDLabel: '',
            optionAPlaceholder: '', optionBPlaceholder: '', optionCPlaceholder: '', optionDPlaceholder: '',
            correctPlaceholder: 'VD: mèo\\nchó',
            acceptedPlaceholder: '',
            showOptions: false, correctRequired: true
        },
        short_answer: {
            emoji: '💬',
            hint: 'Câu hỏi tự luận — để trống Correct Answer nếu giáo viên chấm tay. Options không cần điền.',
            optionALabel: '', optionBLabel: '', optionCLabel: '', optionDLabel: '',
            optionAPlaceholder: '', optionBPlaceholder: '', optionCPlaceholder: '', optionDPlaceholder: '',
            correctPlaceholder: 'Để trống nếu giáo viên chấm tay',
            acceptedPlaceholder: '',
            showOptions: false, correctRequired: false
        }
    };

    function mkTooltip(text) {
        return `<span class="tooltip-icon">?<span class="tooltip-text">${text}</span></span>`;
    }

    // Modal view for editing or adding question
    window.showEditModal = function (q) {
        const isEdit = q.question_id !== undefined && q.question_id !== null && q.question_id !== '';
        // Auto-generate question ID for new questions
        const autoId = isEdit ? q.question_id : ('Q' + Date.now().toString().slice(-6));
        const currentType = q.type || 'multiple_choice';
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'edit-question-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:680px;">
                <div class="modal-header">
                    <h3>${isEdit ? '✏️ Edit Question' : '➕ Add New Question'}</h3>
                    <button class="modal-close" onclick="closeEditModal()">&#x2715;</button>
                </div>
                <form id="edit-question-form" style="background:none;border:none;padding:0;display:flex;flex-direction:column;gap:0;">
                    <input type="hidden" name="exam_id" value="${q.exam_id}">

                    <!-- Section 1: Basic Info -->
                    <div class="modal-section">
                        <p class="modal-section-title">📋 Thông tin cơ bản</p>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                            <div>
                                <div class="field-label-row">
                                    <label for="edit-question-id">Question ID <span class="required-star">*</span></label>
                                    ${mkTooltip('Mã câu hỏi – duy nhất trong đề thi. Tự động tạo khi thêm mới.')}
                                </div>
                                <input type="text" id="edit-question-id" name="question_id"
                                    value="${autoId}"
                                    ${isEdit ? 'readonly style="background-color:#f3f4f6;"' : ''}
                                    required style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row">
                                    <label for="edit-level">Level <span class="required-star">*</span></label>
                                    ${mkTooltip('Độ khó: easy (dễ), medium (trung bình), hard (khó).')}
                                </div>
                                <select id="edit-level" name="level" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;font-family:var(--font);">
                                    <option value="easy" ${q.level === 'easy' ? 'selected' : ''}>🟢 Easy</option>
                                    <option value="medium" ${(!q.level || q.level === 'medium') ? 'selected' : ''}>🟡 Medium</option>
                                    <option value="hard" ${q.level === 'hard' ? 'selected' : ''}>🔴 Hard</option>
                                </select>
                            </div>
                            <div style="grid-column:1/-1;">
                                <div class="field-label-row">
                                    <label for="edit-type">Type <span class="required-star">*</span></label>
                                    ${mkTooltip('Loại câu hỏi – ảnh hưởng đến các ô bên dưới.')}
                                </div>
                                <select id="edit-type" name="type" required style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;font-family:var(--font);">
                                    <option value="multiple_choice" ${currentType === 'multiple_choice' ? 'selected' : ''}>🔤 Multiple Choice</option>
                                    <option value="single_choice" ${currentType === 'single_choice' ? 'selected' : ''}>🔘 Single Choice</option>
                                    <option value="true_false" ${currentType === 'true_false' ? 'selected' : ''}>☑️ True / False</option>
                                    <option value="fill_blank" ${currentType === 'fill_blank' ? 'selected' : ''}>✏️ Fill in Blank</option>
                                    <option value="arrange_sentence" ${currentType === 'arrange_sentence' ? 'selected' : ''}>🔀 Arrange Sentence</option>
                                    <option value="vocabulary" ${currentType === 'vocabulary' ? 'selected' : ''}>📖 Vocabulary</option>
                                    <option value="matching" ${currentType === 'matching' ? 'selected' : ''}>🔗 Matching</option>
                                    <option value="short_answer" ${currentType === 'short_answer' ? 'selected' : ''}>💬 Short Answer</option>
                                </select>
                                <div id="type-hint-box" class="type-hint-box">
                                    <span class="hint-icon">💡</span>
                                    <span id="type-hint-text"></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Question Content -->
                    <div class="modal-section">
                        <p class="modal-section-title">❓ Nội dung câu hỏi</p>
                        <div class="field-label-row">
                            <label for="edit-text">Question Text <span class="required-star">*</span></label>
                            ${mkTooltip('Nội dung câu hỏi. Với fill_blank, dùng ___ để đánh dấu chỗ trống.')}
                        </div>
                        <textarea id="edit-text" name="question_text" required rows="3"
                            style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);resize:vertical;">${isEdit ? (q.question_text || '') : ''}</textarea>

                        <div id="edit-options-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-a" for="edit-option-a">Option A</label></div>
                                <input type="text" id="edit-option-a" name="option_a" value="${isEdit ? (q.option_a || '') : ''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-b" for="edit-option-b">Option B</label></div>
                                <input type="text" id="edit-option-b" name="option_b" value="${isEdit ? (q.option_b || '') : ''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-c" for="edit-option-c">Option C</label></div>
                                <input type="text" id="edit-option-c" name="option_c" value="${isEdit ? (q.option_c || '') : ''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-d" for="edit-option-d">Option D</label></div>
                                <input type="text" id="edit-option-d" name="option_d" value="${isEdit ? (q.option_d || '') : ''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Answer -->
                    <div class="modal-section" id="section-answer-wrapper">
                        <p class="modal-section-title">✅ Đáp án</p>

                        <!-- Answer toggle buttons (shown for types that have options) -->
                        <div id="answer-buttons-area" style="display:none;">
                            <div class="field-label-row">
                                <label>Đáp án đúng <span class="required-star">*</span></label>
                                ${mkTooltip('Click chọn 1 hoặc nhiều đáp án đúng. Với multiple_choice chọn 1. Giáo viên có thể click nhiều nếu muốn nhiều đáp án chấp nhận.')}
                            </div>
                            <div id="answer-btn-mc" class="answer-btn-group" style="display:none;">
                                <button type="button" class="ans-btn" data-key="a">A</button>
                                <button type="button" class="ans-btn" data-key="b">B</button>
                                <button type="button" class="ans-btn" data-key="c">C</button>
                                <button type="button" class="ans-btn" data-key="d">D</button>
                            </div>
                            <div id="answer-btn-tf" class="answer-btn-group" style="display:none;">
                                <button type="button" class="ans-btn-tf" data-val="TRUE">✅ TRUE</button>
                                <button type="button" class="ans-btn-tf" data-val="FALSE">❌ FALSE</button>
                            </div>
                            <p id="answer-selected-display" style="margin:0.4rem 0 0;font-size:0.82rem;color:var(--text-muted);font-weight:600;"></p>
                        </div>

                        <!-- Manual correct answer (for fill_blank, short_answer, matching, arrange_sentence) -->
                        <div id="answer-manual-area">
                            <div id="answer-manual-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                                <div>
                                    <div class="field-label-row">
                                        <label for="edit-correct" id="lbl-correct">Correct Answer</label>
                                        ${mkTooltip('Đáp án đúng chính xác. Với matching: nhập list câu trả lời (mỗi đáp án 1 dòng) tương ứng với list câu hỏi ở trên. Với short_answer: có thể để trống.')}
                                    </div>
                                    <textarea id="edit-correct" name="correct_answer" rows="3" placeholder=""
                                        style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);resize:vertical;">${isEdit ? (q.correct_answer || '') : ''}</textarea>
                                </div>
                                <div id="accepted-answer-col">
                                    <div class="field-label-row">
                                        <label for="edit-accepted">Accepted Answers</label>
                                        ${mkTooltip('Các đáp án chấp nhận. Dạng JSON array: ["answer1","answer2"]. Dùng khi có nhiều cách viết đúng.')}
                                    </div>
                                    <input type="text" id="edit-accepted" name="accepted_answers"
                                        value='${isEdit ? (q.accepted_answers || '') : ''}' placeholder='["answer"]'
                                        style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:0.75rem;">
                            <div class="field-label-row">
                                <label for="edit-explanation">Explanation</label>
                                ${mkTooltip('Giải thích đáp án – hiển thị cho học sinh sau khi nộp bài (nếu bật Show Result).')}
                            </div>
                            <textarea id="edit-explanation" name="explanation" rows="2"
                                style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);resize:vertical;">${isEdit ? (q.explanation || '') : ''}</textarea>
                        </div>
                    </div>

                    <!-- Section 4: Metadata -->
                    <div class="modal-section">
                        <p class="modal-section-title">⚙️ Metadata</p>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                            <div>
                                <div class="field-label-row">
                                    <label for="edit-points">Points <span class="required-star">*</span></label>
                                    ${mkTooltip('Điểm số của câu hỏi này (chấp nhận số thập phân, VD: 1.5).')}
                                </div>
                                <input type="number" id="edit-points" name="points"
                                    value="${isEdit ? (q.points || 1) : 1}" min="0.5" step="0.5"
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row">
                                    <label for="edit-tags">Tags</label>
                                    ${mkTooltip('Nhãn phân loại câu hỏi. Nhiều nhãn cách nhau bằng dấu phẩy: grammar,present-simple')}
                                </div>
                                <input type="text" id="edit-tags" name="tags"
                                    value="${isEdit ? (q.tags || '') : ''}" placeholder="grammar,vocabulary"
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                        </div>
                        <div class="checkbox-wrapper" style="margin-top:0.75rem;">
                            <input type="checkbox" id="edit-active" name="active"
                                ${(isEdit ? (q.active === true || q.active === 'TRUE' || q.active === '1' || q.active === 1) : true) ? 'checked' : ''}>
                            <label for="edit-active">Active (hiện câu hỏi này trong bài thi)</label>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:0.5rem;">
                        <button type="button" class="btn-secondary" onclick="closeEditModal()">Cancel</button>
                        <button type="submit" class="btn-primary">${isEdit ? '💾 Save Changes' : '+ Add Question'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        // Apply type hints on change
        const typeSelect = document.getElementById('edit-type');
        const applyTypeHints = (type) => {
            const cfg = TYPE_HINTS[type] || TYPE_HINTS['multiple_choice'];
            // Hint box
            document.getElementById('type-hint-text').textContent = `${cfg.emoji}  ${cfg.hint}`;
            // Show/hide options
            const optFields = document.getElementById('edit-options-fields');
            optFields.style.display = cfg.showOptions ? 'grid' : 'none';
            // Show/hide correct answer manual area
            const ansArea = document.getElementById('answer-manual-area');
            if (ansArea) {
                ansArea.style.display = (type === 'arrange_sentence') ? 'none' : 'block';
            }

            // Show/hide the ENTIRE Answer Section Wrapper if arrange_sentence
            const sectionAnswerWrapper = document.getElementById('section-answer-wrapper');
            if (sectionAnswerWrapper) {
                sectionAnswerWrapper.style.display = (type === 'arrange_sentence') ? 'none' : 'block';
            }

            // Adjust manual answer grid for matching
            const accCol = document.getElementById('accepted-answer-col');
            const manualGrid = document.getElementById('answer-manual-grid');
            if (accCol && manualGrid) {
                if (type === 'matching') {
                    accCol.style.display = 'none';
                    manualGrid.style.gridTemplateColumns = '1fr';
                } else {
                    accCol.style.display = 'block';
                    manualGrid.style.gridTemplateColumns = '1fr 1fr';
                }
            }
            // Update option labels and placeholders
            if (cfg.showOptions) {
                ['a', 'b', 'c', 'd'].forEach(x => {
                    const lbl = document.getElementById(`lbl-opt-${x}`);
                    const inp = document.getElementById(`edit-option-${x}`);
                    if (lbl) lbl.textContent = cfg[`option${x.toUpperCase()}Label`] || `Option ${x.toUpperCase()}`;
                    if (inp) inp.placeholder = cfg[`option${x.toUpperCase()}Placeholder`] || '';
                });
            }
            // correct answer label
            const correctInp = document.getElementById('edit-correct');
            if (correctInp) correctInp.placeholder = cfg.correctPlaceholder || '';
            const acceptedInp = document.getElementById('edit-accepted');
            if (acceptedInp) acceptedInp.placeholder = cfg.acceptedPlaceholder || '';
            // required star on correct answer label
            const lblCorrect = document.getElementById('lbl-correct');
            if (lblCorrect) {
                lblCorrect.innerHTML = `Correct Answer${cfg.correctRequired ? ' <span class="required-star">*</span>' : ''}`;
            }
        };

        applyTypeHints(currentType);

        // --- ANSWER BUTTONS LOGIC ---
        function setupAnswerButtons(type) {
            const btnArea = document.getElementById('answer-buttons-area');
            const manualArea = document.getElementById('answer-manual-area');
            const mcGroup = document.getElementById('answer-btn-mc');
            const tfGroup = document.getElementById('answer-btn-tf');
            const correctInput = document.getElementById('edit-correct');
            const acceptedInput = document.getElementById('edit-accepted');
            const displayEl = document.getElementById('answer-selected-display');

            if (type === 'multiple_choice' || type === 'vocabulary' || type === 'single_choice') {
                btnArea.style.display = 'block';
                mcGroup.style.display = 'flex';
                tfGroup.style.display = 'none';
                manualArea.style.display = 'none';

                // Pre-select from existing correct_answer / accepted_answers
                let acceptedVals = [];
                try {
                    const rawAcc = acceptedInput.value.trim();
                    if (rawAcc && rawAcc.startsWith('[') && rawAcc.endsWith(']')) {
                        const parsed = JSON.parse(rawAcc);
                        if (Array.isArray(parsed)) {
                            acceptedVals = parsed.map(v => String(v).trim());
                        }
                    }
                } catch (e) { }

                let currentVals = correctInput.value.split(',').map(s => s.trim()).filter(Boolean);

                mcGroup.querySelectorAll('.ans-btn').forEach(btn => {
                    const optKey = btn.dataset.key;
                    const optInput = document.getElementById(`edit-option-${optKey}`);
                    const optVal = optInput ? optInput.value.trim() : '';

                    if (acceptedVals.length > 0) {
                        if (optVal && acceptedVals.includes(optVal)) btn.classList.add('selected');
                        else btn.classList.remove('selected');
                    } else {
                        // Fallback to correct_answer string matching (handles comma-separated strings for multiple choice)
                        if (currentVals.length > 0 && optVal && currentVals.includes(optVal)) btn.classList.add('selected');
                        else btn.classList.remove('selected');
                    }
                });

                mcGroup.querySelectorAll('.ans-btn').forEach(btn => {
                    btn.onclick = () => {
                        if (type === 'vocabulary' || type === 'single_choice') {
                            mcGroup.querySelectorAll('.ans-btn').forEach(b => {
                                if (b !== btn) b.classList.remove('selected');
                            });
                        }
                        btn.classList.toggle('selected');
                        syncMcButtons();
                    };
                });

                syncMcButtons();

            } else if (type === 'true_false') {
                btnArea.style.display = 'block';
                mcGroup.style.display = 'none';
                tfGroup.style.display = 'flex';
                manualArea.style.display = 'none';

                const currentVal = correctInput.value.trim().toUpperCase();
                tfGroup.querySelectorAll('.ans-btn-tf').forEach(btn => {
                    if (btn.dataset.val === currentVal) btn.classList.add('selected');
                    else btn.classList.remove('selected');
                });

                tfGroup.querySelectorAll('.ans-btn-tf').forEach(btn => {
                    btn.onclick = () => {
                        tfGroup.querySelectorAll('.ans-btn-tf').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        correctInput.value = btn.dataset.val;
                        const alt = btn.dataset.val === 'TRUE'
                            ? '["TRUE","True","true","T"]'
                            : '["FALSE","False","false","F"]';
                        acceptedInput.value = alt;
                        displayEl.textContent = `Đã chọn: ${btn.dataset.val}`;
                    };
                });

            } else {
                btnArea.style.display = 'none';
                manualArea.style.display = 'block';
            }

            function syncMcButtons() {
                const selected = Array.from(mcGroup.querySelectorAll('.ans-btn.selected'));
                const values = selected.map(b => {
                    const optInput = document.getElementById(`edit-option-${b.dataset.key}`);
                    return optInput ? optInput.value.trim() : '';
                }).filter(v => v);

                if (values.length === 1) {
                    correctInput.value = values[0];
                    acceptedInput.value = JSON.stringify(values);
                    displayEl.textContent = `Đáp án: ${selected[0].dataset.key.toUpperCase()} — ${values[0]}`;
                } else if (values.length > 1) {
                    correctInput.value = values.join(', ');
                    acceptedInput.value = JSON.stringify(values);
                    const labels = selected.map(b => b.dataset.key.toUpperCase()).join(', ');
                    displayEl.textContent = `Đáp án: ${labels} — ${values.join(', ')}`;
                } else {
                    correctInput.value = '';
                    acceptedInput.value = '';
                    displayEl.textContent = '';
                }
            }
        }

        // Extend applyTypeHints to also setup buttons
        const origApply = applyTypeHints;
        const applyAll = (type) => { origApply(type); setupAnswerButtons(type); };
        typeSelect.removeEventListener('change', () => { });
        typeSelect.addEventListener('change', () => applyAll(typeSelect.value));
        applyAll(currentType);

        let isSavingQuestion = false;
        document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isSavingQuestion) return;
            isSavingQuestion = true;

            const qSubmitBtn = e.target.querySelector('button[type="submit"]');
            if (qSubmitBtn) { qSubmitBtn.disabled = true; qSubmitBtn.style.opacity = '0.5'; }

            const formEl = e.target;
            const fd = new FormData(formEl);
            const data = {};
            fd.forEach((val, key) => { data[key] = val; });
            data.active = document.getElementById('edit-active').checked;
            data.points = parseFloat(data.points) || 1;

            if (data.type === 'arrange_sentence') {
                data.correct_answer = data.question_text;
            }

            showLoader('Đang lưu thông tin câu hỏi...');
            try {
                if (isEdit) {
                    await db.editQuestion(data);
                    alert('Question updated successfully!');
                } else {
                    if (loadedQuestions.some(lq => String(lq.question_id).trim() === String(data.question_id).trim())) {
                        throw new Error(`Mã câu hỏi '${data.question_id}' đã tồn tại trong đề thi này.`);
                    }
                    await db.importQuestions([data]);
                    alert('Question added successfully!');
                }
                closeEditModal();
                loadQuestionBank();
            } catch (err) {
                alert('Operation failed: ' + err.message);
            } finally {
                isSavingQuestion = false;
                if (qSubmitBtn) { qSubmitBtn.disabled = false; qSubmitBtn.style.opacity = ''; }
                hideLoader();
            }
        });
    };

    window.closeEditModal = function () {
        const modal = document.getElementById('edit-question-modal');
        if (modal) modal.remove();
    };

    window.deleteQuestion = async function (questionId, examId) {
        window.showConfirm('Delete Question', `Are you sure you want to delete question "${questionId}"?`, async () => {
            showLoader('Đang xóa câu hỏi...');
            try {
                await db.deleteQuestion(questionId, examId);
                alert('Question deleted successfully!');
                loadQuestionBank();
            } catch (error) {
                alert(error.message);
            } finally {
                hideLoader();
            }
        });
    };

    /**
     * Excel Export
     */
    function exportQuestionsToExcel(questions, examId) {
        const wsData = questions.map(q => {
            return {
                question_id: q.question_id,
                exam_id: q.exam_id,
                type: q.type,
                level: q.level || 'medium',
                question_text: q.question_text,
                option_a: q.option_a || '',
                option_b: q.option_b || '',
                option_c: q.option_c || '',
                option_d: q.option_d || '',
                correct_answer: q.correct_answer,
                accepted_answers: q.accepted_answers || '',
                explanation: q.explanation || '',
                points: q.points || 1,
                tags: q.tags || '',
                active: q.active === true || q.active === 'TRUE' ? 'TRUE' : 'FALSE'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(wsData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
        XLSX.writeFile(workbook, `Questions_${examId}.xlsx`);
    }

    let isStartingExam = false;
    async function handleStartExam(event) {
        event.preventDefault();
        if (isStartingExam) return;
        isStartingExam = true;

        const startBtn = document.getElementById('student-start-form')?.querySelector('button[type="submit"]');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Loading exam...';
        }

        const studentName = document.getElementById('student_name').value.trim();
        const className = document.getElementById('class_name').value.trim();
        const examSelect = document.getElementById('exam-select');
        const examId = examSelect.value;

        if (!studentName || !className || !examId) {
            alert('Please fill in all fields.');
            isStartingExam = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '👉 Vào Phòng Thi';
            }
            return;
        }

        const selectedOption = examSelect.options[examSelect.selectedIndex];
        const examData = JSON.parse(selectedOption.dataset.exam);

        // Check if this student already submitted this exam
        try {
            const existingSubmissions = await db.getSubmissions();
            const alreadyDone = existingSubmissions.find(s =>
                String(s.exam_id) === String(examId) &&
                String(s.student_name).trim().toLowerCase() === studentName.toLowerCase() &&
                String(s.class_name).trim().toLowerCase() === className.toLowerCase()
            );
            if (alreadyDone) {
                alert(`⚠️ Bạn (${studentName} - ${className}) đã làm bài kiểm tra này rồi.\nMỗi học sinh chỉ được làm bài 1 lần.\nVui lòng liên hệ giáo viên nếu cần làm lại.`);
                isStartingExam = false;
                if (startBtn) {
                    startBtn.disabled = false;
                    startBtn.textContent = '👉 Vào Phòng Thi';
                }
                return;
            }
        } catch (e) {
            console.warn('Could not verify previous submissions:', e);
            // Allow to continue if check fails (network error etc.)
        }

        let rawQuestions = [];
        try {
            if (startBtn) {
                startBtn.textContent = 'Loading exam questions...';
            }
            rawQuestions = await db.getQuestions(examId);
        } catch (e) {
            alert('Failed to load questions: ' + e.message);
            isStartingExam = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '👉 Vào Phòng Thi';
            }
            return;
        }

        if (rawQuestions.length === 0) {
            alert('This exam has no active questions.');
            isStartingExam = false;
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '👉 Vào Phòng Thi';
            }
            return;
        }

        // Reset starting state on successful proceed
        isStartingExam = false;

        // Format raw spreadsheet objects to client questions and filter only active ones
        let clientQuestions = rawQuestions.map(formatQuestionForClient).filter(q => q.active === true);

        // Shuffle questions
        if (examData.shuffle_questions === true || examData.shuffle_questions === 'TRUE') {
            clientQuestions = shuffleArray(clientQuestions);
        }

        // Shuffle MCQ options
        if (examData.shuffle_options === true || examData.shuffle_options === 'TRUE') {
            clientQuestions = clientQuestions.map(q => {
                if ((q.type === 'multiple_choice' || q.type === 'vocabulary') && q.options.length > 0) {
                    q.options = shuffleArray(q.options);
                }
                return q;
            });
        }

        // Check Draft restore
        const draftKey = `exam_draft_${examId}`;
        const draftStr = localStorage.getItem(draftKey);
        let restoredAnswers = null;
        let restoredIndex = 0;
        let restoredRemaining = null;

        if (draftStr) {
            try {
                const draft = JSON.parse(draftStr);
                if (confirm(`Chào ${studentName}, chúng tôi tìm thấy bài làm chưa hoàn thành của bạn cho bài kiểm tra này. Bạn có muốn tiếp tục làm bài không?`)) {
                    restoredAnswers = draft.answers;
                    restoredIndex = draft.currentQuestionIndex || 0;
                    restoredRemaining = draft.remainingSeconds;
                } else {
                    localStorage.removeItem(draftKey);
                }
            } catch (e) {
                console.error('Error parsing draft:', e);
            }
        }

        // Store exam state
        window.currentExamState = {
            exam: examData,
            questions: clientQuestions,
            student: { name: studentName, class: className },
            answers: restoredAnswers || new Array(clientQuestions.length).fill(null),
            currentQuestionIndex: restoredIndex,
            startTime: new Date(),
            timerInterval: null,
            remainingSeconds: restoredRemaining,
            shuffledPools: {}, // For arrange_sentence
            arrangedAnswers: {}, // For arrange_sentence
            matchingLeftItems: {}, // For matching Left items
            matchingRightShuffled: {} // For matching Right items shuffled
        };

        // Initialize Arrange Sentence and Matching helper states
        clientQuestions.forEach((q, index) => {
            // Arrange Sentence state
            if (q.type === 'arrange_sentence') {
                const targetSentence = (q.question_text && q.question_text.length > 2) ? q.question_text : (q.correct_answer || '');
                const originalWords = targetSentence.trim().split(/\s+/).filter(w => w !== '');
                const currentAnswer = window.currentExamState.answers[index];
                if (currentAnswer) {
                    const arranged = currentAnswer.trim().split(/\s+/).filter(w => w !== '');
                    window.currentExamState.arrangedAnswers[q.question_id] = arranged;

                    const pool = [...originalWords];
                    arranged.forEach(word => {
                        const idx = pool.indexOf(word);
                        if (idx !== -1) {
                            pool.splice(idx, 1);
                        }
                    });
                    window.currentExamState.shuffledPools[q.question_id] = pool.sort(() => Math.random() - 0.5);
                } else {
                    window.currentExamState.shuffledPools[q.question_id] = [...originalWords].sort(() => Math.random() - 0.5);
                    window.currentExamState.arrangedAnswers[q.question_id] = [];
                }
            }

            // Matching state
            if (q.type === 'matching') {
                const leftItems = (q.question_text || '').split('\n').map(s => s.trim()).filter(s => s);
                const rightItems = (q.correct_answer || '').split('\n').map(s => s.trim()).filter(s => s);
                window.currentExamState.matchingLeftItems[q.question_id] = leftItems;
                window.currentExamState.matchingRightShuffled[q.question_id] = shuffleArray(rightItems);

                // New interleaved format: combine all items with a type marker, then shuffle them together
                const combined = [
                    ...leftItems.map(text => ({ type: 'q', text })),
                    ...rightItems.map(text => ({ type: 'a', text }))
                ];
                window.currentExamState.matchingPool = window.currentExamState.matchingPool || {};
                window.currentExamState.matchingPool[q.question_id] = shuffleArray(combined);
            }
        });

        loadExamInterface();
    }

    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function decodeUtf8Mangle(str) {
        if (!str) return '';
        try {
            if (/[\u00C0-\u00DF][\u0080-\u00BF]/.test(str)) {
                return decodeURIComponent(escape(str));
            }
        } catch (e) { }
        return str;
    }

    function decodeQuestionFields(q) {
        if (!q) return q;
        const decoded = { ...q };
        const fields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'accepted_answers', 'explanation', 'tags'];
        fields.forEach(field => {
            if (decoded[field] !== undefined && decoded[field] !== null) {
                decoded[field] = decodeUtf8Mangle(String(decoded[field]));
            }
        });
        return decoded;
    }

    function formatQuestionForClient(q) {
        const decodedQ = decodeQuestionFields(q);

        let options = [];
        if (decodedQ.type === 'multiple_choice' || decodedQ.type === 'vocabulary' || decodedQ.type === 'single_choice') {
            options = [decodedQ.option_a, decodedQ.option_b, decodedQ.option_c, decodedQ.option_d]
                .map(opt => opt !== undefined && opt !== null ? String(opt).trim() : '')
                .filter(opt => opt !== '');
        } else if (decodedQ.type === 'true_false') {
            options = ['True', 'False'];
        } else if (decodedQ.type === 'matching') {
            options = [decodedQ.option_a, decodedQ.option_b, decodedQ.option_c, decodedQ.option_d]
                .map(opt => opt !== undefined && opt !== null ? String(opt).trim() : '')
                .filter(opt => opt !== '');
        }

        let accepted = [];
        if (decodedQ.accepted_answers) {
            const strVal = String(decodedQ.accepted_answers).trim();
            if (strVal.startsWith('[') && strVal.endsWith(']')) {
                try {
                    accepted = JSON.parse(strVal);
                } catch (e) {
                    accepted = strVal.split(',').map(s => s.trim());
                }
            } else {
                accepted = strVal.split(',').map(s => s.trim());
            }
        } else {
            if (decodedQ.type === 'multiple_choice') {
                accepted = String(decodedQ.correct_answer).split(',').map(s => s.trim()).filter(s => s);
            } else {
                accepted = [String(decodedQ.correct_answer).trim()];
            }
        }

        return {
            question_id: String(decodedQ.question_id),
            exam_id: String(decodedQ.exam_id),
            type: String(decodedQ.type),
            level: String(decodedQ.level || 'medium'),
            question_text: String(decodedQ.question_text),
            options: options,
            correct_answer: String(decodedQ.correct_answer),
            accepted_answers: accepted.map(String),
            explanation: String(decodedQ.explanation || ''),
            points: Number(decodedQ.points !== undefined && decodedQ.points !== '' ? decodedQ.points : 1),
            tags: String(decodedQ.tags || ''),
            active: decodedQ.active === true || decodedQ.active === 'TRUE' || decodedQ.active === '1' || decodedQ.active === 1
        };
    }

    function loadExamInterface() {
        const { exam, questions, currentQuestionIndex } = window.currentExamState;
        const durationMinutes = exam.duration_minutes || 15;

        appContainer.innerHTML = `
            <div id="exam-interface">
                <div class="exam-mobile-sticky-wrapper">
                    <div class="exam-header">
                        <div>
                            <h3>${exam.title}</h3>
                            <div id="progress-bar-container">
                                <div id="progress-bar"></div>
                            </div>
                            <p id="progress-text">Question 1 of ${questions.length}</p>
                        </div>
                        <div style="display: flex; gap: 0.5rem; align-items: center; justify-content: flex-end; flex-wrap: wrap;">
                            <button id="submit-now-btn" class="btn-primary" style="padding: 0.4rem 1rem; font-size: 0.85rem; border-radius: var(--radius-pill); white-space: nowrap;">Submit Now</button>
                            <div id="timer">${durationMinutes}:00</div>
                        </div>
                    </div>
                    <div id="question-navigator-container" class="sticky-navigator">
                        <div id="question-navigator" class="question-navigator">
                            ${questions.map((_, i) => `<div class="nav-circle" onclick="jumpToQuestion(${i})">${i + 1}</div>`).join('')}
                        </div>
                    </div>
                </div>
                <div id="question-container"></div>
                <div class="exam-navigation">
                    <button id="prev-btn">Previous</button>
                    <button id="next-btn">Next</button>
                    <button id="submit-btn" style="display:none;">Submit Exam</button>
                </div>
            </div>
        `;

        document.getElementById('prev-btn').addEventListener('click', prevQuestion);
        document.getElementById('next-btn').addEventListener('click', nextQuestion);
        document.getElementById('submit-btn').addEventListener('click', () => submitExam(false));
        document.getElementById('submit-now-btn').addEventListener('click', () => submitExam(false));

        renderCurrentQuestion();
        startTimer(durationMinutes, window.currentExamState.remainingSeconds);
    }

    function startTimer(durationMinutes, restoredRemaining = null) {
        const timerEl = document.getElementById('timer');
        let totalSeconds = restoredRemaining !== null ? restoredRemaining : durationMinutes * 60;

        window.currentExamState.timerInterval = setInterval(() => {
            const minutes = Math.floor(totalSeconds / 60);
            let seconds = totalSeconds % 60;
            seconds = seconds < 10 ? '0' + seconds : seconds;

            timerEl.textContent = `${minutes}:${seconds}`;
            window.currentExamState.remainingSeconds = totalSeconds;

            // Update remaining time in draft
            saveDraft();

            if (totalSeconds <= 0) {
                stopTimer();
                alert('Time is up! Your exam will be submitted automatically.');
                submitExam(true);
            }
            if (totalSeconds <= 60) {
                timerEl.style.color = '#d32f2f'; // Blink red
            }

            totalSeconds--;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(window.currentExamState.timerInterval);
    }

    function saveDraft() {
        if (!window.currentExamState) return;
        const { exam, answers, currentQuestionIndex, remainingSeconds } = window.currentExamState;
        const draft = {
            answers,
            currentQuestionIndex,
            remainingSeconds
        };
        localStorage.setItem(`exam_draft_${exam.exam_id}`, JSON.stringify(draft));
    }

    function clearDraft() {
        if (!window.currentExamState) return;
        localStorage.removeItem(`exam_draft_${window.currentExamState.exam.exam_id}`);
    }

    function renderCurrentQuestion() {
        const { questions, currentQuestionIndex, answers } = window.currentExamState;
        const question = questions[currentQuestionIndex];
        const container = document.getElementById('question-container');
        const studentAnswer = answers[currentQuestionIndex];

        window.updateNavigatorStatus();

        let optionsHtml = '';

        if (question.type === 'multiple_choice') {
            // Checkbox multi-select mode
            const selectedArr = Array.isArray(studentAnswer) ? studentAnswer : (studentAnswer ? [studentAnswer] : []);
            optionsHtml = '<div class="options-container mc-checkbox">';
            question.options.forEach(option => {
                const isSelected = selectedArr.includes(option);
                optionsHtml += `
                    <div class="option ${isSelected ? 'selected' : ''}" 
                         onclick="handleOptionSelect('${escapeSingleQuotes(option)}')">
                        ${option}
                    </div>`;
            });
            optionsHtml += '</div>';

        } else if (question.type === 'vocabulary' || question.type === 'single_choice' || question.type === 'true_false') {
            // Radio single-select mode
            optionsHtml = '<div class="options-container">';
            const opts = question.type === 'true_false' ? ['True', 'False'] : question.options;
            opts.forEach(option => {
                const isSelected = studentAnswer === option;
                optionsHtml += `
                    <div class="option ${isSelected ? 'selected' : ''}" 
                         onclick="handleOptionSelect('${escapeSingleQuotes(option)}')">
                        ${option}
                    </div>`;
            });
            optionsHtml += '</div>';

        } else if (question.type === 'arrange_sentence') {
            const pool = window.currentExamState.shuffledPools[question.question_id] || [];
            const arranged = window.currentExamState.arrangedAnswers[question.question_id] || [];

            const arrangedBadges = arranged.map((word, idx) => `
                <span class="word-badge" onclick="handleRemoveWord('${question.question_id}', ${idx})">${word}</span>
            `).join('');

            const poolBadges = pool.map((word, idx) => `
                <span class="word-badge" onclick="handleAddWord('${question.question_id}', ${idx})">${word}</span>
            `).join('');

            optionsHtml = `
                <div style="margin-top: 1rem;">
                    <p style="font-weight:700; margin-bottom:0.5rem; font-size:0.95rem; color:var(--text-muted);">Workspace (Click word to remove):</p>
                    <div class="word-workspace">
                        ${arrangedBadges || '<span style="color:var(--text-muted); font-style:italic; font-size:0.95rem;">Workspace...</span>'}
                    </div>
                    <p style="font-weight:700; margin-bottom:0.5rem; font-size:0.95rem; color:var(--text-muted);">Word Pool (Click word to place in sentence):</p>
                    <div class="word-pool">
                        ${poolBadges || '<span style="color:var(--text-muted); font-style:italic; font-size:0.95rem;">Word pool empty...</span>'}
                    </div>
                </div>
            `;
        } else if (question.type === 'matching') {
            const isMobile = window.innerWidth <= 768;
            const leftItems = window.currentExamState.matchingLeftItems[question.question_id] || [];
            let rightItems = window.currentExamState.matchingRightShuffled[question.question_id] || [];

            if (studentAnswer) {
                try {
                    const parsed = JSON.parse(studentAnswer);
                    if (Array.isArray(parsed)) {
                        // Data format is array of answers
                        if (parsed.length === leftItems.length && (parsed.length === 0 || typeof parsed[0] === 'string')) {
                            // Validate that these old answers actually belong to this question!
                            const validAnswers = (question.correct_answer || '').split('\n').map(s => s.trim()).filter(s => s);
                            let isValid = true;
                            for (let ans of parsed) {
                                if (ans && !validAnswers.includes(ans)) {
                                    isValid = false; break;
                                }
                            }
                            if (isValid) {
                                rightItems = parsed;
                            }
                        }
                    } else if (typeof parsed === 'object') {
                        // Very old format: object map
                        const validAnswers = (question.correct_answer || '').split('\n').map(s => s.trim()).filter(s => s);
                        let isValid = true;
                        for (let i = 0; i < leftItems.length; i++) {
                            const ans = parsed[leftItems[i]];
                            if (ans && !validAnswers.includes(ans)) {
                                isValid = false; break;
                            }
                        }
                        if (isValid) {
                            rightItems = leftItems.map(l => parsed[l] || '');
                        }
                    }
                } catch (e) { }
            }

            if (isMobile) {
                // Mobile View: Interleaved
                let pool = [];
                for (let i = 0; i < leftItems.length; i++) {
                    pool.push({ type: 'q', text: leftItems[i] });
                    pool.push({ type: 'a', text: rightItems[i] || '' });
                }

                optionsHtml = `
                    <div class="matching-interleaved-container" style="margin-top:1rem;">
                        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem; font-style:italic;">💡 Arrange the boxes below so that the corresponding Question and Answer are next to each other (top-bottom or left-right).</p>
                        <div id="sortable-interleaved-${question.question_id}" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:0.5rem; min-height:50px;">
                            ${pool.map((item, idx) => `
                                <div class="matching-interleaved-item" data-type="${item.type}" data-text="${escapeSingleQuotes(item.text)}" 
                                     style="padding:0.5rem 0.75rem; border:2px solid ${item.type === 'q' ? '#c8bfe7' : '#f8c8d8'}; border-radius:var(--radius-sm); background:${item.type === 'q' ? '#f3f0f9' : '#fdf2f5'}; cursor:grab; display:flex; align-items:center; min-height:40px; font-weight:${item.type === 'q' ? '600' : '500'}; color:var(--text-main); font-size:0.9rem;">
                                    <i class="fa fa-arrows-alt" style="margin-right:0.5rem;color:var(--text-muted);font-size:0.8rem;"></i>
                                    <span style="flex:1">${item.text}</span>
                                    <span style="font-size:0.6rem; padding:0.1rem 0.3rem; border-radius:4px; background:rgba(0,0,0,0.05); color:var(--text-muted); text-transform:uppercase;">${item.type === 'q' ? 'Q' : 'A'}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else {
                // Desktop View: Classic 2 Columns
                optionsHtml = `
                    <div class="matching-dnd-container" style="display:flex; flex-direction:row; flex-wrap:wrap; gap:1rem; margin-top:1rem; align-items:stretch;">
                        <div class="matching-left-wrapper" style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:0.5rem;">
                            <h4 style="margin:0 0 0.25rem 0; font-size:1rem; color:var(--text-main); text-align:center;">A (Question)</h4>
                            <div class="matching-left-col" style="display:flex; flex-direction:column; gap:0.5rem;">
                                ${leftItems.map(left => `<div class="matching-left-item" style="padding:0.75rem; border:2px solid #c8bfe7; border-radius:var(--radius-sm); background:#f3f0f9; display:flex; align-items:center; min-height:50px; font-weight:600; color:var(--text-main);">${left}</div>`).join('')}
                            </div>
                        </div>
                        <div class="matching-right-wrapper" style="flex:1; min-width:250px; display:flex; flex-direction:column; gap:0.5rem;">
                            <h4 style="margin:0 0 0.25rem 0; font-size:1rem; color:var(--text-main); text-align:center;">B (Answer)</h4>
                            <div class="matching-right-col" id="sortable-right-${question.question_id}" style="display:flex; flex-direction:column; gap:0.5rem; min-height:50px;">
                                ${rightItems.map((right, idx) => `<div class="matching-right-item" data-val="${escapeSingleQuotes(right)}" style="padding:0.75rem; border:2px solid #f8c8d8; border-radius:var(--radius-sm); background:#fdf2f5; cursor:grab; display:flex; align-items:center; min-height:50px; font-weight:500; color:var(--text-main);"><i class="fa fa-arrows-alt-v" style="margin-right:0.5rem;color:var(--text-muted)"></i> ${right}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.75rem; font-style:italic;">💡 Drag & Drop items in column B (Answer) to match the corresponding column A.</p>
                `;
            }

        } else if (question.type === 'fill_blank') {
            optionsHtml = `
                <div style="margin-top: 1rem;">
                    <label for="fill-blank-input" style="font-weight: 700; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-muted);">Fill in the blank:</label>
                    <input type="text" id="fill-blank-input" placeholder="Type your answer here..." 
                           oninput="handleTextAnswerSelect(this.value)" value="${studentAnswer || ''}" 
                           style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; font-family: var(--font); font-size: 1rem;">
                </div>
            `;
        } else if (question.type === 'short_answer') {
            optionsHtml = `
                <div style="margin-top: 1rem;">
                    <label for="short-answer-input" style="font-weight: 700; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-muted);">Your Response:</label>
                    <textarea id="short-answer-input" rows="4" placeholder="Write your paragraph/sentence..." 
                              oninput="handleTextAnswerSelect(this.value)"
                              style="width: 100%; border: 2px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.75rem; font-family: var(--font); font-size: 1rem; resize: vertical;">${studentAnswer || ''}</textarea>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="question-meta">
                <span class="badge badge-primary">Q${currentQuestionIndex + 1}</span>
                <span class="badge badge-secondary">${question.type.replace('_', ' ')}</span>
                <span class="badge badge-warning">${question.level}</span>
                <span class="badge badge-accent">${question.points} Pt(s)</span>
            </div>
            <p class="question-text">${question.type === "arrange_sentence" ? "Arrange the words to make a correct sentence:" : (question.type === "matching" ? "Match column A with column B correctly:" : question.question_text)}</p>
            ${optionsHtml}
        `;

        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progressPercent}%`;
        progressText.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

        updateNavigationButtons();

        // Initialize Sortable for Matching questions
        if (question.type === 'matching') {
            const sortableElMobile = document.getElementById(`sortable-interleaved-${question.question_id}`);
            if (sortableElMobile && window.Sortable) {
                window.Sortable.create(sortableElMobile, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: function () {
                        const items = sortableElMobile.querySelectorAll('.matching-interleaved-item');
                        const currentOrder = Array.from(items).map(item => ({
                            type: item.getAttribute('data-type'),
                            text: item.getAttribute('data-text')
                        }));
                        window.currentExamState.answers[currentQuestionIndex] = JSON.stringify(currentOrder);
                        saveDraft();
                        updateNavigatorStatus();
                    }
                });
            }

            const sortableElDesktop = document.getElementById(`sortable-right-${question.question_id}`);
            if (sortableElDesktop && window.Sortable) {
                window.Sortable.create(sortableElDesktop, {
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    onEnd: function () {
                        const items = sortableElDesktop.querySelectorAll('.matching-right-item');
                        const currentOrder = Array.from(items).map(item => item.getAttribute('data-val'));
                        window.currentExamState.answers[currentQuestionIndex] = JSON.stringify(currentOrder);
                        saveDraft();
                        updateNavigatorStatus();
                    }
                });
            }
        }
    }

    // Handles Option selection (MCQ multi-select, True/False single, Vocabulary single)
    window.handleOptionSelect = function (option) {
        const { currentQuestionIndex, questions } = window.currentExamState;
        const question = questions[currentQuestionIndex];

        if (question.type === 'multiple_choice') {
            // Toggle in array for multi-select
            let current = window.currentExamState.answers[currentQuestionIndex];
            if (!Array.isArray(current)) current = current ? [current] : [];
            const idx = current.indexOf(option);
            if (idx >= 0) current.splice(idx, 1);
            else current.push(option);
            window.currentExamState.answers[currentQuestionIndex] = current;
        } else {
            // Single select for vocabulary, true_false
            window.currentExamState.answers[currentQuestionIndex] = option;
        }
        saveDraft();
        renderCurrentQuestion();
    };

    // Handles input values (Fill Blank, Short Answer)
    window.handleTextAnswerSelect = function (val) {
        const { currentQuestionIndex } = window.currentExamState;
        window.currentExamState.answers[currentQuestionIndex] = val;
        saveDraft();
        window.updateNavigatorStatus();
    };

    // Handles word pool clicking (Arrange Sentence)
    window.handleAddWord = function (questionId, wordIndex) {
        const state = window.currentExamState;
        const pool = state.shuffledPools[questionId];
        const arranged = state.arrangedAnswers[questionId];

        const word = pool.splice(wordIndex, 1)[0];
        arranged.push(word);

        state.answers[state.currentQuestionIndex] = arranged.join(' ');
        saveDraft();
        renderCurrentQuestion();
    };

    window.handleRemoveWord = function (questionId, wordIndex) {
        const state = window.currentExamState;
        const pool = state.shuffledPools[questionId];
        const arranged = state.arrangedAnswers[questionId];

        const word = arranged.splice(wordIndex, 1)[0];
        pool.push(word);

        state.answers[state.currentQuestionIndex] = arranged.join(' ');
        saveDraft();
        renderCurrentQuestion();
    };


    function nextQuestion() {
        if (window.currentExamState.currentQuestionIndex < window.currentExamState.questions.length - 1) {
            window.currentExamState.currentQuestionIndex++;
            renderCurrentQuestion();
        }
    }

    function prevQuestion() {
        if (window.currentExamState.currentQuestionIndex > 0) {
            window.currentExamState.currentQuestionIndex--;
            renderCurrentQuestion();
        }
    }

    function updateNavigationButtons() {
        const { currentQuestionIndex, questions } = window.currentExamState;
        document.getElementById('prev-btn').disabled = currentQuestionIndex === 0;
        document.getElementById('next-btn').style.display = currentQuestionIndex === questions.length - 1 ? 'none' : 'inline-block';
        document.getElementById('submit-btn').style.display = currentQuestionIndex === questions.length - 1 ? 'inline-block' : 'none';
    }

    window.updateNavigatorStatus = function () {
        if (!window.currentExamState) return;
        const { questions, currentQuestionIndex, answers } = window.currentExamState;
        const navCircles = document.querySelectorAll('.nav-circle');
        if (!navCircles.length) return;
        navCircles.forEach((circle, index) => {
            circle.classList.remove('current');
            if (index === currentQuestionIndex) circle.classList.add('current');

            const ans = answers[index];
            let isAnswered = false;
            if (ans !== null && ans !== undefined && ans !== '') {
                if (typeof ans === 'string' && ans.trim() !== '') {
                    if (questions[index].type === 'matching') {
                        try {
                            const parsed = JSON.parse(ans);
                            if (Object.keys(parsed).length > 0) isAnswered = true;
                        } catch (e) { }
                    } else {
                        isAnswered = true;
                    }
                } else if (typeof ans === 'object') {
                    if (Object.keys(ans).length > 0) isAnswered = true;
                } else if (Array.isArray(ans) && ans.length > 0) {
                    isAnswered = true;
                }
            }
            if (isAnswered) circle.classList.add('answered');
            else circle.classList.remove('answered');
            
            // Auto scroll container so active circle is visible (only run over current)
            if (index === currentQuestionIndex) {
                circle.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        });
    };

    window.jumpToQuestion = function (index) {
        if (index >= 0 && index < window.currentExamState.questions.length) {
            window.currentExamState.currentQuestionIndex = index;
            renderCurrentQuestion();
        }
    };

    function submitExam(isAutoSubmit = false) {
        if (window.currentExamState && window.currentExamState.isSubmitting) return;
        
        if (isAutoSubmit) {
            performActualSubmission();
            return;
        }

        // Calculate unanswered questions
        const { questions, answers } = window.currentExamState;
        const unansweredIndices = [];
        answers.forEach((ans, index) => {
            let isAnswered = false;
            if (ans !== null && ans !== '') {
                if (typeof ans === 'string' && ans.trim() !== '') {
                    if (questions[index].type === 'matching') {
                        try {
                            const parsed = JSON.parse(ans);
                            if (Array.isArray(parsed)) {
                                if (parsed.length > 0) isAnswered = true;
                            } else if (Object.keys(parsed).length > 0) {
                                isAnswered = true;
                            }
                        } catch (e) { }
                    } else {
                        isAnswered = true;
                    }
                } else if (typeof ans === 'object') {
                    if (Object.keys(ans).length > 0) isAnswered = true;
                } else {
                    isAnswered = true;
                }
            }
            if (!isAnswered) {
                unansweredIndices.push(index + 1);
            }
        });

        // Show custom confirmation modal
        showSubmitConfirmModal(unansweredIndices);
    }

    function showSubmitConfirmModal(unansweredIndices) {
        // Remove existing if any
        closeSubmitConfirmModal();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'submit-confirm-modal';
        modal.style.zIndex = '9995';

        let bodyHtml = '';
        if (unansweredIndices.length === 0) {
            bodyHtml = `
                <p style="font-size:1.1rem; line-height:1.6; color:var(--text-main); font-weight:600; text-align:center; margin-bottom: 0;">
                    🎉 Tuyệt vời! Bạn đã hoàn thành tất cả các câu hỏi.<br>Bạn có chắc chắn muốn nộp bài kiểm tra ngay bây giờ không?
                </p>
            `;
        } else {
            bodyHtml = `
                <div style="background-color:var(--accent-light); border: 2px solid var(--accent); border-radius:var(--radius-sm); padding:1rem; margin-bottom:1rem; text-align: left;">
                    <p style="margin:0; color:#b91c1c; font-weight:800; font-size:1rem;">⚠️ Bạn vẫn còn ${unansweredIndices.length} câu hỏi chưa làm:</p>
                    <p style="margin:0.5rem 0 0 0; color:var(--text-main); font-weight:800; font-size:1.2rem; letter-spacing:0.5px;">👉 Câu: ${unansweredIndices.join(', ')}</p>
                </div>
                <p style="font-size:1rem; line-height:1.5; color:var(--text-muted); font-weight:600; text-align:center; margin-bottom: 0;">
                    Nếu nộp bài bây giờ, những câu hỏi này sẽ nhận 0 điểm.<br>Bạn có chắc chắn muốn nộp bài không?
                </p>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 480px; animation: fadeIn 0.3s ease;">
                <div class="modal-header" style="border-bottom:none; margin-bottom:1rem; padding-bottom:0; justify-content:center;">
                    <h3 style="color:var(--primary); font-weight:800; font-size:1.5rem; display:flex; align-items:center; gap:0.5rem;">
                        <span>📝 Xác nhận nộp bài</span>
                    </h3>
                </div>
                
                ${bodyHtml}
                
                <div class="modal-actions" style="justify-content:center; gap:1rem; margin-top:1.5rem;">
                    <button id="confirm-submit-yes" class="btn-primary" style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%); border:none; box-shadow: 0 4px 12px rgba(77,150,255,0.3); font-weight:800; padding:0.75rem 1.5rem; border-radius: var(--radius-sm); color: white; cursor: pointer;">Nộp bài</button>
                    <button id="confirm-submit-no" class="btn-secondary" style="font-weight:800; padding:0.75rem 1.5rem; border-radius: var(--radius-sm); cursor: pointer;">Làm tiếp</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));

        // Guard against duplicate submission (detached DOM elements bypass global spamLock)
        let alreadySubmitted = false;
        document.getElementById('confirm-submit-yes').onclick = () => {
            if (alreadySubmitted) return;
            alreadySubmitted = true;
            closeSubmitConfirmModal();
            performActualSubmission();
        };

        document.getElementById('confirm-submit-no').onclick = () => {
            closeSubmitConfirmModal();
        };
    }

    window.closeSubmitConfirmModal = function () {
        const modal = document.getElementById('submit-confirm-modal');
        if (modal) modal.remove();
    };

    async function performActualSubmission() {
        if (window.currentExamState && window.currentExamState.isSubmitting) return;
        if (window.currentExamState) window.currentExamState.isSubmitting = true;
        
        showLoader('Đang chấm điểm và gửi bài làm lên hệ thống...');

        try {
            stopTimer();
            const endTime = new Date();
            const durationSeconds = Math.round((endTime - window.currentExamState.startTime) / 1000);
            window.currentExamState.durationSeconds = durationSeconds;

            // Grade on Frontend
            const result = gradeExam();

            // Clear local draft
            clearDraft();

            // Show Results Summary
            displayResults(result);

            // Sync to Sheets
            await syncResult(result);
        } catch (e) {
            console.error('Error during actual submission:', e);
            alert('Lỗi khi nộp bài: ' + e.message);
        } finally {
            hideLoader();
        }
    }

    /**
     * Grading Agent (Part 3)
     */
    function normalizeAnswer(value) {
        if (value === undefined || value === null) return '';
        return String(value)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[.!?]$/, '')
            .trim();
    }

    function gradeExam() {
        const { questions, answers, student, exam, durationSeconds } = window.currentExamState;

        let score = 0;
        let total_points = 0;
        let correct_count = 0;
        let wrong_count = 0;
        let unanswered_count = 0;
        let manual_review_count = 0;
        const detailed_results = [];

        questions.forEach((q, index) => {
            const student_answer = answers[index];
            const correct_answer = q.correct_answer;
            const points = 1; // Force 1 point per question to evenly divide the 10-point scale
            total_points += points;

            let is_correct = false;
            let need_manual_review = false;
            let points_earned = 0;

            if (student_answer === null || student_answer === '' || (typeof student_answer === 'string' && student_answer.trim() === '')) {
                unanswered_count++;
            } else {
                if (q.type === 'multiple_choice') {
                    // Multi-select: all-or-nothing comparison
                    let studentArr = Array.isArray(student_answer) ? student_answer : [student_answer];
                    studentArr = studentArr.map(normalizeAnswer).sort();
                    // Build accepted set from accepted_answers or correct_answer
                    let acceptedArr = [];
                    if (q.accepted_answers && q.accepted_answers.length > 0) {
                        // Flatten: accepted_answers may be stored as ["He, She, It"] (single comma-joined string)
                        // or ["He", "She", "It"] (individual items). Handle both cases.
                        acceptedArr = q.accepted_answers
                            .flatMap(a => String(a).split(',').map(s => s.trim()).filter(s => s))
                            .map(normalizeAnswer).sort();
                    } else {
                        acceptedArr = String(correct_answer).split(',').map(normalizeAnswer).sort();
                    }
                    if (JSON.stringify(studentArr) === JSON.stringify(acceptedArr)) {
                        is_correct = true;
                        points_earned = points;
                    }

                } else if (q.type === 'true_false' || q.type === 'vocabulary' || q.type === 'single_choice') {
                    if (normalizeAnswer(student_answer) === normalizeAnswer(correct_answer)) {
                        is_correct = true;
                    } else if (q.type === 'vocabulary' || q.type === 'single_choice') {
                        const optionLetters = ['a', 'b', 'c', 'd'];
                        const correctLetterIdx = optionLetters.indexOf(normalizeAnswer(correct_answer));
                        if (correctLetterIdx !== -1) {
                            const mappedVal = q.options[correctLetterIdx];
                            if (normalizeAnswer(student_answer) === normalizeAnswer(mappedVal)) {
                                is_correct = true;
                            }
                        }
                    }
                    if (is_correct) points_earned = points;

                } else if (q.type === 'fill_blank') {
                    // Match against any accepted answers
                    const match = q.accepted_answers.some(ans => normalizeAnswer(student_answer) === normalizeAnswer(ans));
                    if (match) {
                        is_correct = true;
                        points_earned = points;
                    }

                } else if (q.type === 'arrange_sentence') {
                    if (normalizeAnswer(student_answer) === normalizeAnswer(correct_answer)) {
                        is_correct = true;
                        points_earned = points;
                    }

                } else if (q.type === 'matching') {
                    let parsedStudent = null;
                    try { parsedStudent = JSON.parse(student_answer); } catch (e) { }

                    if (Array.isArray(parsedStudent)) {
                        const rightItems = (correct_answer || '').split('\n').map(s => s.trim()).filter(s => s);
                        let isAllMatch = true;

                        if (parsedStudent.length > 0 && typeof parsedStudent[0] === 'object' && parsedStudent[0].text !== undefined) {
                            // New interleaved format: array of objects {type, text}
                            const leftItems = (q.question_text || '').split('\n').map(s => s.trim()).filter(s => s);
                            if (parsedStudent.length === 2 * rightItems.length && rightItems.length > 0) {
                                for (let i = 0; i < parsedStudent.length; i += 2) {
                                    const item1 = parsedStudent[i];
                                    const item2 = parsedStudent[i + 1];
                                    if (!item1 || !item2) { isAllMatch = false; break; }
                                    let matchFound = false;
                                    for (let j = 0; j < leftItems.length; j++) {
                                        const L = leftItems[j];
                                        const R = rightItems[j];
                                        if (
                                            (normalizeAnswer(item1.text) === normalizeAnswer(L) && normalizeAnswer(item2.text) === normalizeAnswer(R)) ||
                                            (normalizeAnswer(item1.text) === normalizeAnswer(R) && normalizeAnswer(item2.text) === normalizeAnswer(L))
                                        ) {
                                            matchFound = true; break;
                                        }
                                    }
                                    if (!matchFound) { isAllMatch = false; break; }
                                }
                            } else {
                                isAllMatch = false;
                            }
                        } else if (parsedStudent.length === rightItems.length && rightItems.length > 0) {
                            // Old format: array of strings representing answers
                            for (let i = 0; i < rightItems.length; i++) {
                                if (normalizeAnswer(parsedStudent[i]) !== normalizeAnswer(rightItems[i])) {
                                    isAllMatch = false;
                                    break;
                                }
                            }
                        } else {
                            isAllMatch = false;
                        }

                        if (isAllMatch) {
                            is_correct = true;
                            points_earned = points;
                        }
                    } else if (typeof parsedStudent === 'object' && parsedStudent !== null) {
                        let correctMap = {};
                        try { correctMap = JSON.parse(correct_answer); } catch (e) { }

                        const keys = Object.keys(correctMap);
                        let isAllMatch = true;
                        for (let k of keys) {
                            if (normalizeAnswer(parsedStudent[k]) !== normalizeAnswer(correctMap[k])) {
                                isAllMatch = false;
                                break;
                            }
                        }
                        if (keys.length > 0 && isAllMatch) {
                            is_correct = true;
                            points_earned = points;
                        }
                    }

                } else if (q.type === 'short_answer') {
                    if (q.accepted_answers && q.accepted_answers.length > 0 && q.accepted_answers[0] !== '') {
                        const match = q.accepted_answers.some(ans => normalizeAnswer(student_answer) === normalizeAnswer(ans));
                        if (match) {
                            is_correct = true;
                            points_earned = points;
                        } else {
                            // If doesn't match accepted but we have them, mark it wrong
                            is_correct = false;
                        }
                    } else {
                        // Mark for manual review
                        need_manual_review = true;
                        manual_review_count++;
                    }
                }
            }

            if (!need_manual_review) {
                if (is_correct) {
                    correct_count++;
                } else if (student_answer !== null && student_answer !== '' && String(student_answer).trim() !== '') {
                    wrong_count++;
                }
            }

            // Create submission details object
            detailed_results.push({
                submission_id: `SUB_${window.currentExamState.startTime.getTime()}`,
                question_id: q.question_id,
                question_type: q.type,
                question_text: q.question_text,
                student_answer: typeof student_answer === 'object' ? JSON.stringify(student_answer) : (student_answer || ''),
                correct_answer: correct_answer,
                is_correct: is_correct ? 'TRUE' : 'FALSE',
                need_manual_review: need_manual_review ? 'TRUE' : 'FALSE',
                points: points,
                points_earned: points_earned,
                explanation: q.explanation || ''
            });
        });

        // Sum earned points
        const finalScore = detailed_results.reduce((sum, item) => sum + item.points_earned, 0);
        const finalPercentage = total_points > 0 ? (finalScore / total_points) * 100 : 0;

        // Calculate 10-point scale rounded to nearest 0.25
        const scale10Raw = total_points > 0 ? (finalScore / total_points) * 10 : 0;
        const scale10Rounded = Math.round(scale10Raw * 4) / 4;

        return {
            summary: {
                submission_id: `SUB_${window.currentExamState.startTime.getTime()}`,
                exam_id: exam.exam_id,
                exam_title: exam.title,
                student_id: `ST_${Date.now().toString().substring(8)}`,
                student_name: student.name,
                class_name: student.class,
                score: scale10Rounded,
                raw_score: finalScore,
                total_points: total_points,
                percentage: Math.round(finalPercentage),
                correct_count: correct_count,
                wrong_count: wrong_count,
                unanswered_count: unanswered_count,
                manual_review_count: manual_review_count,
                duration_seconds: durationSeconds,
                submitted_at: getUTC7ISOString()
            },
            details: detailed_results
        };
    }

    /**
     * Result Display Agent (Part 4)
     */
    function formatAnswerForDisplay(ans) {
        if (ans === undefined || ans === null || ans === '') return '';
        if (typeof ans === 'boolean') return ans ? 'True' : 'False';
        if (typeof ans === 'string') {
            const trimmed = ans.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.join(' | ');
                } catch (e) { }
            }
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Object.keys(parsed).map(k => `${k} ➜ ${parsed[k]}`).join(', ');
                } catch (e) { }
            }
            return ans.replace(/\n/g, ' | ');
        }
        if (Array.isArray(ans)) return ans.join(' | ');
        return String(ans).replace(/\n/g, ' | ');
    }

    function displayResults(result) {
        const { summary, details } = result;

        const timeTakenFormatted = () => {
            const sec = summary.duration_seconds;
            const min = Math.floor(sec / 60);
            const remainingSec = sec % 60;
            return `${min}m ${remainingSec}s`;
        };

        let summaryHtml = `
            <div id="result-summary">
                <h2>Exam Results</h2>
                <div class="student-info">
                    Student: ${summary.student_name} | Class: ${summary.class_name} <br>
                    Exam: ${summary.exam_title} (${summary.exam_id})
                </div>
                <div class="summary-grid">
                    <div class="summary-item">
                        <h4>Score</h4>
                        <p>${summary.score}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Correct Answers</h4>
                        <p>${summary.correct_count} / ${details.length}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Percentage</h4>
                        <p>${summary.percentage}%</p>
                    </div>
                    <div class="summary-item">
                        <h4>Time Taken</h4>
                        <p style="font-size:1.5rem; margin-top:0.25rem;">${timeTakenFormatted()}</p>
                    </div>
                </div>
            </div>
        `;

        let detailsHtml = '<div id="detailed-results"><h3>Detailed Review</h3>';
        details.forEach((item, index) => {
            const isCorrect = item.is_correct === 'TRUE';
            const needsReview = item.need_manual_review === 'TRUE';

            let statusText = '❌ Incorrect';
            let cardClass = 'incorrect';
            if (isCorrect) {
                statusText = '✅ Correct';
                cardClass = 'correct';
            } else if (needsReview) {
                statusText = '⚠️ Pending Teacher Grading';
                cardClass = 'review-needed';
            }

            let ansText = formatAnswerForDisplay(item.student_answer || 'Not Answered');
            let correctText = formatAnswerForDisplay(item.correct_answer);

            let questionDisplay = `<p><strong>Q${index + 1}:</strong> ${item.question_text.replace(/\\n/g, '<br>')}</p>`;
            let answerComparisonHtml = `
                <div class="answer-comparison">
                    <div class="ans-row student-ans ${isCorrect ? 'correct' : (needsReview ? '' : 'wrong')}">
                        Your Answer: ${ansText}
                    </div>
                    ${!isCorrect && !needsReview ? `
                    <div class="ans-row correct-ans">
                        Correct Answer: ${correctText}
                    </div>` : ''}
                </div>
            `;

            if (item.question_type === 'matching') {
                const leftItems = (item.question_text || '').split('\n').map(s => s.trim()).filter(s => s);
                const rightCorrect = (item.correct_answer || '').split('\n').map(s => s.trim()).filter(s => s);
                let rightStudent = [];
                try { rightStudent = JSON.parse(item.student_answer || '[]'); } catch (e) { }
                if (!Array.isArray(rightStudent)) rightStudent = [];

                questionDisplay = `<p><strong>Q${index + 1}:</strong> Arrange the boxes below to create matching pairs:</p>`;
                let pairsHtml = `<div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.75rem;">`;

                if (rightStudent.length > 0 && typeof rightStudent[0] === 'object' && rightStudent[0].text !== undefined) {
                    // NEW FORMAT (Interleaved)
                    if (rightStudent.length % 2 !== 0) {
                        rightStudent.push({ type: 'a', text: '(Thiếu)' });
                    }
                    for (let i = 0; i < rightStudent.length; i += 2) {
                        const item1 = rightStudent[i];
                        const item2 = rightStudent[i + 1];

                        let matchFound = false;
                        for (let j = 0; j < leftItems.length; j++) {
                            const L = leftItems[j];
                            const R = rightCorrect[j];
                            if (
                                (normalizeAnswer(item1.text) === normalizeAnswer(L) && normalizeAnswer(item2.text) === normalizeAnswer(R)) ||
                                (normalizeAnswer(item1.text) === normalizeAnswer(R) && normalizeAnswer(item2.text) === normalizeAnswer(L))
                            ) {
                                matchFound = true; break;
                            }
                        }
                        const isPairCorrect = matchFound;

                        pairsHtml += `
                        <div style="display:flex; flex-wrap:wrap; gap:0.5rem; align-items:stretch; margin-bottom:0.5rem; padding:0.5rem; border: 2px ${isPairCorrect ? 'solid var(--secondary)' : 'dashed #f43f5e'}; border-radius:var(--radius-sm); background:${isPairCorrect ? 'var(--secondary-light)' : 'var(--accent-light)'};">
                            <div style="flex:1; min-width:200px; padding:0.5rem; background:rgba(255,255,255,0.7); border-radius:4px; display:flex; align-items:center; font-weight:600; color:var(--text-main); font-size:0.9rem;">
                                <span style="font-size:0.6rem; margin-right:0.4rem; padding:0.1rem 0.3rem; border-radius:4px; background:rgba(0,0,0,0.05); color:var(--text-muted); text-transform:uppercase;">${item1.type}</span>
                                ${item1.text}
                            </div>
                            <div style="flex:1; min-width:200px; padding:0.5rem; background:rgba(255,255,255,0.7); border-radius:4px; display:flex; align-items:center; font-weight:600; color:var(--text-main); font-size:0.9rem;">
                                <span style="font-size:0.6rem; margin-right:0.4rem; padding:0.1rem 0.3rem; border-radius:4px; background:rgba(0,0,0,0.05); color:var(--text-muted); text-transform:uppercase;">${item2.type}</span>
                                ${item2.text}
                            </div>
                            ${!isPairCorrect && !needsReview ? `
                                <div style="flex:100%; font-size:0.85rem; color:var(--text-main); font-weight:600; padding:0.25rem 0.5rem; background:#fff; border-radius:4px; margin-top:0.25rem; border-left: 3px solid #f43f5e;">
                                    ❌ Wrong pair.
                                </div>` : ''}
                        </div>`;
                    }

                    if (!isCorrect && !needsReview) {
                        pairsHtml += `<div style="margin-top:1rem; padding:1rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-page);">`;
                        pairsHtml += `<h5 style="margin:0 0 0.5rem 0; color:var(--secondary-dark);">✅ Correct Answer:</h5>`;
                        leftItems.forEach((left, i) => {
                            pairsHtml += `<div style="margin-bottom:0.5rem; font-size:0.9rem; border-bottom:1px solid #eee; padding-bottom:0.25rem;">
                                <div><span style="font-size:0.6rem; margin-right:0.4rem; padding:0.1rem 0.3rem; border-radius:4px; background:#f3f0f9; color:var(--text-muted);">Q</span> ${left}</div>
                                <div style="margin-top:0.25rem;"><span style="font-size:0.6rem; margin-right:0.4rem; padding:0.1rem 0.3rem; border-radius:4px; background:#fdf2f5; color:var(--text-muted);">A</span> ${rightCorrect[i]}</div>
                            </div>`;
                        });
                        pairsHtml += `</div>`;
                    }
                } else {
                    // OLD FORMAT (Fixed A, Draggable B)
                    leftItems.forEach((left, i) => {
                        const stu = rightStudent[i] || '';
                        const cor = rightCorrect[i] || '';
                        const normStu = String(stu).trim().toLowerCase().replace(/\s+/g, ' ');
                        const normCor = String(cor).trim().toLowerCase().replace(/\s+/g, ' ');
                        const isPairCorrect = (normStu === normCor) && (normStu !== '');

                        pairsHtml += `
                            <div style="display:flex; flex-wrap:wrap; gap:1rem; align-items:stretch; margin-bottom:0.5rem;">
                                <div style="flex:1; min-width:200px; padding:0.75rem; border:2px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-card); display:flex; align-items:center; font-weight:600;">
                                    ${left}
                                </div>
                                <div style="flex:1; min-width:200px; display:flex; flex-direction:column; gap:0.25rem;">
                                    <div style="flex:1; padding:0.75rem; border:2px ${isPairCorrect ? 'solid var(--secondary)' : 'dashed #f43f5e'}; border-radius:var(--radius-sm); background:${isPairCorrect ? 'var(--secondary-light)' : 'var(--accent-light)'}; display:flex; align-items:center; color:${isPairCorrect ? 'var(--secondary-dark)' : '#e11d48'}; font-weight:600;">
                                        ${isPairCorrect ? '✅' : '❌'} ${stu || '(Chưa làm)'}
                                    </div>
                                    ${!isPairCorrect && !needsReview ? `
                                    <div style="font-size:0.85rem; color:var(--secondary-dark); font-weight:600; padding:0.25rem 0.5rem; background:var(--secondary-light); border-radius:var(--radius-sm); margin-top:0.25rem;">
                                        👉 Correct Answer: ${cor}
                                    </div>` : ''}
                                </div>
                            </div>
                        `;
                    });
                }

                pairsHtml += `</div>`;
                answerComparisonHtml = pairsHtml;
            }

            detailsHtml += `
                <div class="result-question ${cardClass}">
                    <span class="badge result-badge ${isCorrect ? 'badge-secondary' : (needsReview ? 'badge-warning' : 'badge-accent')}">${statusText}</span>
                    ${questionDisplay}
                    
                    ${answerComparisonHtml}

                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                        Points Earned: ${item.points_earned} / ${item.points}
                    </p>
                    
                    ${item.explanation ? `<p class="explanation"><strong>Explanation:</strong> ${item.explanation}</p>` : ''}
                </div>
            `;
        });
        detailsHtml += '</div>';

        // Add download results and navigation options
        appContainer.innerHTML = `
            <div id="result-container">
                ${summaryHtml}
                <div id="sync-status"></div>
                
                <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                    <button id="download-result-btn" class="btn-primary" style="flex:1;">📥 Download Score Report</button>
                    <button onclick="loadStudentMode()" class="btn-secondary" style="flex:1;">Back to Home</button>
                </div>
                
                ${detailsHtml}
            </div>
        `;

        // Bind download report action
        document.getElementById('download-result-btn').addEventListener('click', () => {
            downloadTextReport(result);
        });
    }

    function downloadTextReport(result) {
        const { summary, details } = result;
        let textReport = `==================================================\n`;
        textReport += `ENGLISH EXAM SCORE REPORT\n`;
        textReport += `==================================================\n\n`;
        textReport += `Student Name: ${summary.student_name}\n`;
        textReport += `Class:        ${summary.class_name}\n`;
        textReport += `Exam Title:   ${summary.exam_title}\n`;
        textReport += `Exam ID:      ${summary.exam_id}\n`;
        textReport += `Submitted At: ${new Date(summary.submitted_at).toLocaleString()}\n`;
        textReport += `Duration:     ${Math.floor(summary.duration_seconds / 60)}m ${summary.duration_seconds % 60}s\n\n`;
        textReport += `--------------------------------------------------\n`;
        textReport += `SCORE SUMMARY\n`;
        textReport += `--------------------------------------------------\n`;
        textReport += `Score Earned: ${summary.score} / ${summary.total_points}\n`;
        textReport += `Percentage:   ${summary.percentage}%\n`;
        textReport += `Correct Qs:   ${summary.correct_count}\n`;
        textReport += `Wrong Qs:     ${summary.wrong_count}\n`;
        textReport += `Unanswered:   ${summary.unanswered_count}\n`;
        textReport += `Pending Tcher:${summary.manual_review_count}\n\n`;
        textReport += `--------------------------------------------------\n`;
        textReport += `QUESTION BY QUESTION REVIEW\n`;
        textReport += `--------------------------------------------------\n\n`;

        details.forEach((item, index) => {
            const isCorrect = item.is_correct === 'TRUE';
            const needsReview = item.need_manual_review === 'TRUE';
            let status = 'INCORRECT';
            if (isCorrect) status = 'CORRECT';
            if (needsReview) status = 'PENDING TEACHER REVIEW';

            textReport += `Q${index + 1}: ${item.question_text}\n`;
            textReport += `Your Answer:    ${item.student_answer || 'Not Answered'}\n`;
            if (!isCorrect && !needsReview) {
                textReport += `Correct Answer: ${item.correct_answer}\n`;
            }
            textReport += `Status:         ${status}\n`;
            textReport += `Points Earned:  ${item.points_earned} / ${item.points}\n`;
            if (item.explanation) {
                textReport += `Explanation:    ${item.explanation}\n`;
            }
            textReport += `\n--------------------------------------------------\n\n`;
        });

        const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ExamResult_${summary.student_name}_${summary.exam_id}.txt`;
        link.click();
    }

    /**
     * Result Sync Agent (Part 5)
     */
    async function syncResult(result) {
        const statusDiv = document.getElementById('sync-status');
        if (!statusDiv) return;

        window.lastExamResult = result;

        try {
            statusDiv.className = 'sync-pending';
            statusDiv.innerHTML = `<span>⏳ Gửi dữ liệu điểm số lên Server...</span>`;

            const responseData = await db.submitResult(result);

            if (responseData.status === 'success') {
                statusDiv.className = 'sync-success';
                if (responseData.message && responseData.message.toLowerCase().includes('local')) {
                    statusDiv.innerHTML = `<span>💾 Đã lưu bài làm thành công trên thiết bị (Do có lỗi hệ thống).</span>`;
                } else {
                    statusDiv.innerHTML = `<span>✅ Kết quả đã gởi cho Giáo viên!</span>`;
                }

                // Clear from pending submissions if it was there
                removePendingSubmission(result.summary.submission_id);
            } else {
                throw new Error(responseData.error || 'Server error.');
            }
        } catch (error) {
            console.error('Sync failed:', error);
            statusDiv.className = 'sync-pending';
            statusDiv.innerHTML = `
                <span>⚠️ Lỗi gửi điểm lên sheet (Lỗi mạng). Kết quả đã được lưu an toàn trên máy.</span>
                <button onclick='retrySyncResult(window.lastExamResult)' class="sync-btn">Thử lại</button>
            `;
            savePendingSubmission(result);
        }
    }

    window.retrySyncResult = async function (result) {
        const statusDiv = document.getElementById('sync-status');
        if (statusDiv) {
            statusDiv.className = 'sync-pending';
            statusDiv.innerHTML = '<span>⏳ Đang gửi lại...</span>';
        }
        try {
            const responseData = await db.submitResult(result);
            if (responseData.status === 'success') {
                if (statusDiv) {
                    statusDiv.className = 'sync-success';
                    statusDiv.innerHTML = '<span>✅ Đồng bộ thành công!</span>';
                }
                removePendingSubmission(result.summary.submission_id);
            } else {
                throw new Error(responseData.error || 'Retry error.');
            }
        } catch (e) {
            alert('Đồng bộ thất bại: ' + e.message);
            if (statusDiv) {
                statusDiv.className = 'sync-pending';
                statusDiv.innerHTML = `
                    <span>⚠️ Đồng bộ lại thất bại. Sẽ thử lại sau.</span>
                    <button onclick='retrySyncResult(window.lastExamResult)' class="sync-btn">Thử lại</button>
                `;
            }
        }
    };

    function savePendingSubmission(result) {
        try {
            const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
            if (!pending.some(p => p.summary.submission_id === result.summary.submission_id)) {
                pending.push(result);
                localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
            }
        } catch (e) {
            console.error(e);
        }
    }

    function removePendingSubmission(subId) {
        try {
            const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
            const filtered = pending.filter(p => p.summary.submission_id !== subId);
            localStorage.setItem('pendingSubmissions', JSON.stringify(filtered));
        } catch (e) {
            console.error(e);
        }
    }

    async function syncPendingSubmissions() {
        try {
            let pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
            if (pending.length === 0) return;

            console.log(`Synchronizing ${pending.length} pending submission(s).`);

            const stillPending = [];
            for (const sub of pending) {
                try {
                    const res = await db.submitResult(sub);
                    if (res.status === 'success') {
                        console.log(`Submission ${sub.summary.submission_id} synced successfully.`);
                    } else {
                        stillPending.push(sub);
                    }
                } catch (err) {
                    stillPending.push(sub);
                }
            }
            localStorage.setItem('pendingSubmissions', JSON.stringify(stillPending));
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Database Indicator Badge
     */
    function updateDbStatusIndicator() {
        const useMock = localStorage.getItem('use_mock_db') === 'true';
        let indicator = document.getElementById('db-status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'db-status-indicator';
            indicator.style.position = 'fixed';
            indicator.style.bottom = '10px';
            indicator.style.right = '10px';
            indicator.style.padding = '0.5rem 1rem';
            indicator.style.borderRadius = '20px';
            indicator.style.fontSize = '0.85rem';
            indicator.style.fontWeight = '800';
            indicator.style.zIndex = '999';
            indicator.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            indicator.style.display = 'none';
            document.body.appendChild(indicator);
        }

        if (useMock) {
            indicator.innerHTML = '📁 Offline Local Database Mode';
            indicator.style.backgroundColor = 'var(--warning-light)';
            indicator.style.color = '#b45309';
            indicator.style.border = '1px solid rgba(217, 119, 6, 0.3)';
        } else {
            indicator.innerHTML = '🌐 Cloud Connected (Server)';
            indicator.style.backgroundColor = 'var(--secondary-light)';
            indicator.style.color = '#15803d';
            indicator.style.border = '1px solid rgba(107, 203, 119, 0.3)';
        }
    }

    /**
     * Pre-populate mock database if empty (For standalone offline testing)
     */
    function initializeMockDbIfEmpty() {
        if (!localStorage.getItem('mock_exams')) {
            const sampleExams = [
                {
                    exam_id: 'ENG_UNIT_1',
                    title: 'English Test - Unit 1 (Present Simple)',
                    duration_minutes: 15,
                    shuffle_questions: true,
                    shuffle_options: true,
                    show_result: true,
                    active: true,
                    created_at: getUTC7ISOString()
                },
                {
                    exam_id: 'ENG_UNIT_2',
                    title: 'English Test - Unit 2 (School & Matching Exercises)',
                    duration_minutes: 10,
                    shuffle_questions: false,
                    shuffle_options: false,
                    show_result: true,
                    active: true,
                    created_at: getUTC7ISOString()
                }
            ];
            localStorage.setItem('mock_exams', JSON.stringify(sampleExams));
        }

        if (!localStorage.getItem('mock_questions')) {
            const sampleQuestions = [
                {
                    type: 'multiple_choice',
                    level: 'easy',
                    question_text: 'Choose the correct answer: She ___ apples.',
                    option_a: 'like',
                    option_b: 'likes',
                    option_c: 'liked',
                    option_d: 'liking',
                    correct_answer: 'likes',
                    accepted_answers: '["likes"]',
                    explanation: 'With She/He/It in Present Simple, the verb takes s/es.',
                    points: 2,
                    tags: 'grammar,present-simple',
                    active: true
                },
                {
                    type: 'true_false',
                    level: 'easy',
                    question_text: 'The auxiliary verb "does" is used for plural subjects (like "they", "we").',
                    option_a: '',
                    option_b: '',
                    option_c: '',
                    option_d: '',
                    correct_answer: 'False',
                    accepted_answers: '["False", "false", "F", "f"]',
                    explanation: 'No, "do" is used for plural subjects and "does" is for singular subjects (he, she, it).',
                    points: 2,
                    tags: 'grammar,auxiliary',
                    active: true
                },
                {
                    type: 'fill_blank',
                    level: 'medium',
                    question_text: 'Write the correct form: They usually ______ (walk) to school, but today they are going by bus.',
                    option_a: '',
                    option_b: '',
                    option_c: '',
                    option_d: '',
                    correct_answer: 'walk',
                    accepted_answers: '["walk"]',
                    explanation: 'Present simple is used with "usually". Plural subject "They" takes verb "walk" without s.',
                    points: 2,
                    tags: 'grammar,present-simple',
                    active: true
                },
                {
                    type: 'arrange_sentence',
                    level: 'hard',
                    question_text: 'Arrange the words to make a correct question:',
                    option_a: '',
                    option_b: '',
                    option_c: '',
                    option_d: '',
                    correct_answer: 'Where do you live ?',
                    accepted_answers: '["Where do you live ?"]',
                    explanation: 'The question structure is: Question Word + auxiliary verb + subject + main verb + question mark.',
                    points: 2,
                    tags: 'sentence-building',
                    active: true
                },
                {
                    type: 'vocabulary',
                    level: 'easy',
                    question_text: 'What does "library" mean?',
                    option_a: 'Thư viện',
                    option_b: 'Rạp chiếu phim',
                    option_c: 'Hiệu sách',
                    option_d: 'Bệnh viện',
                    correct_answer: 'Thư viện',
                    accepted_answers: '["Thư viện"]',
                    explanation: 'A library is a building containing collections of books for reading.',
                    points: 2,
                    tags: 'vocabulary',
                    active: true
                },
                {
                    type: 'matching',
                    level: 'medium',
                    question_text: 'Match the English classroom words with their Vietnamese meanings:',
                    option_a: 'blackboard | bảng đen',
                    option_b: 'notebook | vở ghi bài',
                    option_c: 'pencil sharpener | gọt bút chì',
                    option_d: 'dictionary | từ điển',
                    correct_answer: '{"blackboard":"bảng đen","notebook":"vở ghi bài","pencil sharpener":"gọt bút chì","dictionary":"từ điển"}',
                    accepted_answers: '{"blackboard":"bảng đen","notebook":"vở ghi bài","pencil sharpener":"gọt bút chì","dictionary":"từ điển"}',
                    explanation: 'Matching terms with their translations.',
                    points: 5,
                    tags: 'vocabulary,classroom',
                    active: true
                },
                {
                    type: 'short_answer',
                    level: 'hard',
                    question_text: 'Describe what you do during English lessons in 1-2 sentences.',
                    option_a: '',
                    option_b: '',
                    option_c: '',
                    option_d: '',
                    correct_answer: '',
                    accepted_answers: '',
                    explanation: 'This question will be graded by your teacher.',
                    points: 5,
                    tags: 'writing',
                    active: true
                }
            ];
            localStorage.setItem('mock_questions', JSON.stringify(sampleQuestions));
        }

        // Seed mock teachers if not set
        if (!localStorage.getItem('mock_teachers')) {
            localStorage.setItem('mock_teachers', JSON.stringify([
                { username: 'demo', password: 'demo123', name: 'Giáo viên Demo', phone: '0900000000' }
            ]));
        }

        // Seed mock games if not set
        if (!localStorage.getItem('mock_games')) {
            localStorage.setItem('mock_games', JSON.stringify([
                {
                    game_id: 'GAME_1',
                    name: 'Kahoot - Vocabulary Practice',
                    url: 'https://kahoot.it/',
                    image_url: '',
                    created_at: getUTC7ISOString()
                },
                {
                    game_id: 'GAME_2',
                    name: 'Quizizz - Grammar Challenge',
                    url: 'https://quizizz.com/',
                    image_url: '',
                    created_at: getUTC7ISOString()
                }
            ]));
        }
    }

    async function loadSubmissionsExams() {
        const container = document.getElementById('submissions-table-container');
        if (!container) return;

        const backBtn = document.getElementById('back-to-submissions-summary-btn');
        if (backBtn) backBtn.style.display = 'none';

        showLoader('Loading exams and submission counts...');
        document.getElementById('submissions-title').textContent = 'Student Submissions Summary';
        container.innerHTML = '<p class="loading-message">Loading exams and submission counts...</p>';

        try {
            const examsResp = await db.getExams();
            const exams = examsResp.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            const submissions = await db.getSubmissions();

            if (exams.length === 0) {
                container.innerHTML = '<p class="info-message">No exams found.</p>';
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Exam ID</th>
                            <th>Exam Title</th>
                            <th>Active State</th>
                            <th>Submissions Count</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            exams.forEach((exam, idx) => {
                const count = submissions.filter(s => String(s.exam_id) === String(exam.exam_id)).length;
                const isActive = exam.active === true || exam.active === 'TRUE' || exam.active === '1' || exam.active === 1;
                table += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${exam.exam_id}</strong></td>
                        <td>${exam.title}</td>
                        <td>
                            <span class="badge" style="background-color: ${isActive ? 'var(--secondary-light)' : 'var(--accent-light)'}; color: ${isActive ? '#15803d' : '#b91c1c'}; border: 1px solid ${isActive ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)'}; font-weight:800; display:inline-block; text-align:center;">
                                ${isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">${count} student(s)</td>
                        <td>
                            <button class="edit-btn" style="background-color: var(--primary); color: white;" onclick="viewExamSubmissions('${exam.exam_id}')"><i class="fa fa-chart-bar"></i> View Results</button>
                        </td>
                    </tr>
                `;
            });
            table += '</tbody></table></div>';
            container.innerHTML = table;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-message">Error loading submissions summary: ${e.message}</p>`;
        } finally {
            hideLoader();
        }
    }

    window.viewExamSubmissions = async function (examId) {
        const container = document.getElementById('submissions-table-container');
        if (!container) return;

        const backBtn = document.getElementById('back-to-submissions-summary-btn');
        if (backBtn) {
            backBtn.style.display = 'inline-block';
            backBtn.onclick = () => loadSubmissionsExams();
        }

        showLoader('Loading student submissions...');
        document.getElementById('submissions-title').textContent = `Submissions for Exam: ${examId}`;
        container.innerHTML = '<p class="loading-message">Loading student submissions...</p>';

        try {
            const submissions = await db.getSubmissions();
            const examSubs = submissions
                .filter(s => String(s.exam_id) === String(examId))
                .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));

            if (examSubs.length === 0) {
                container.innerHTML = '<p class="info-message">No student submissions found for this exam yet.</p>';
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Student Name</th>
                            <th>Class</th>
                            <th>Score (Scale 10)</th>
                            <th>Percentage</th>
                            <th>Duration</th>
                            <th>Submitted At</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            examSubs.forEach((sub, idx) => {
                const score = sub.score !== undefined ? sub.score : 'N/A';
                const percentage = sub.percentage !== undefined ? sub.percentage : 'N/A';
                const minutes = Math.floor(sub.duration_seconds / 60);
                const seconds = sub.duration_seconds % 60;
                const durationStr = `${minutes}m ${seconds}s`;
                const submittedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A';

                table += `
                    <tr>
                        <td>${idx + 1}</td>
                        <td><strong>${sub.student_name}</strong></td>
                        <td>${sub.class_name}</td>
                        <td style="font-weight: 800; color: var(--primary);">${score} / 10</td>
                        <td>${percentage}%</td>
                        <td>${durationStr}</td>
                        <td style="font-size: 0.85rem; color: var(--text-muted);">${submittedDate}</td>
                        <td>
                            <button class="edit-btn" onclick="viewSubmissionDetailsModal('${sub.submission_id}', '${escapeSingleQuotes(sub.student_name)}', '${escapeSingleQuotes(sub.exam_title || examId)}')"><i class="fa fa-eye" style="color:#6366f1;"></i> View Answers</button>
                            <button class="delete-btn" onclick="deleteSubmissionEntry('${sub.submission_id}', '${escapeSingleQuotes(sub.student_name)}', '${examId}')" title="Delete result &amp; allow retake"><i class="fa fa-rotate-left"></i> Reset</button>
                        </td>
                    </tr>
                `;
            });
            table += '</tbody></table></div>';
            container.innerHTML = table;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-message">Error loading exam submissions: ${e.message}</p>`;
        } finally {
            hideLoader();
        }
    };

    window.deleteSubmissionEntry = async function (submissionId, studentName, examId) {
        window.showConfirm('Delete Submission', `Are you sure you want to delete the results of "${studentName}"`, async () => {
            showLoader('Deleting submission...');
            try {
                await db.deleteSubmission(submissionId);
                alert(`✅ Deleted results of "${studentName}". This student can retake the test.`);
                viewExamSubmissions(examId);
            } catch (err) {
                alert('Error deleting submission: ' + err.message);
            } finally {
                hideLoader();
            }
        });
    };

    window.viewSubmissionDetailsModal = async function (submissionId, studentName, examTitle) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'submission-details-modal';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 85vh; overflow-y: auto;">
                <div class="modal-header">
                    <div>
                        <h3 style="margin: 0;">Submission Details</h3>
                        <p style="margin: 0.25rem 0 0 0; color: var(--text-muted); font-size: 0.9rem;">Student: <strong>${studentName}</strong> | Exam: <strong>${examTitle}</strong></p>
                    </div>
                    <button class="modal-close" onclick="closeSubmissionDetailsModal()">&times;</button>
                </div>
                <div id="modal-submission-details-container">
                    <p class="loading-message">Loading answer sheets...</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        if (!modal.classList.contains('active')) requestAnimationFrame(() => modal.classList.add('active'));
        // Must add 'active' class AFTER appending so the CSS .modal.active rule takes effect
        requestAnimationFrame(() => modal.classList.add('active'));

        const container = document.getElementById('modal-submission-details-container');
        showLoader('Loading answer details...');
        try {
            const details = await db.getSubmissionDetails(submissionId);
            if (details.length === 0) {
                container.innerHTML = '<p class="info-message">No detailed answer records found for this submission.</p>';
                return;
            }

            let html = '<div class="submissions-detail-list" style="display:flex; flex-direction:column; gap:1.5rem; margin-top:1rem;">';

            details.forEach((d, idx) => {
                const isCorrect = d.is_correct === true || d.is_correct === 'TRUE';
                const needReview = d.need_manual_review === true || d.need_manual_review === 'TRUE';

                let borderStyle = 'border: 2px solid var(--border-color)';
                let badgeClass = 'badge-secondary';
                let badgeText = 'Incorrect';

                if (isCorrect) {
                    borderStyle = 'border: 2px solid var(--secondary); background-color: var(--secondary-light);';
                    badgeClass = 'badge-primary';
                    badgeText = 'Correct';
                } else if (needReview) {
                    borderStyle = 'border: 2px solid var(--warning); background-color: var(--warning-light);';
                    badgeClass = 'badge-warning';
                    badgeText = 'Needs Review';
                } else {
                    borderStyle = 'border: 2px solid var(--accent); background-color: var(--accent-light);';
                    badgeClass = 'badge-accent';
                }

                let showCorrect = formatAnswerForDisplay(d.correct_answer);
                let showStudent = formatAnswerForDisplay(d.student_answer);

                html += `
                    <div class="result-card" style="padding: 1.2rem; border-radius: var(--radius-md); ${borderStyle}">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                            <span style="font-weight:800; color:var(--text-main);">Question ${idx + 1} (${d.question_type})</span>
                            <span class="badge ${badgeClass}">${badgeText} (${d.points_earned} / ${d.points} pt)</span>
                        </div>
                        <p style="margin: 0.5rem 0; font-weight:700; font-size:1.05rem;">${d.question_text}</p>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-top:0.75rem; font-size:0.95rem;">
                            <div style="background:rgba(255,255,255,0.7); padding:0.5rem; border-radius:var(--radius-sm);">
                                <span style="color:var(--text-muted); font-size:0.8rem; display:block;">STUDENT ANSWER:</span>
                                <strong style="color:${isCorrect ? '#166534' : (needReview ? '#9a3412' : '#991b1b')}">${showStudent || '(Empty)'}</strong>
                            </div>
                            <div style="background:rgba(255,255,255,0.7); padding:0.5rem; border-radius:var(--radius-sm);">
                                <span style="color:var(--text-muted); font-size:0.8rem; display:block;">CORRECT ANSWER:</span>
                                <strong style="color:#166534;">${showCorrect || '(N/A)'}</strong>
                            </div>
                        </div>
                        ${d.explanation ? `<p style="margin: 0.75rem 0 0 0; font-size:0.85rem; color:var(--text-muted); font-style:italic;">💡 <strong>Explanation:</strong> ${d.explanation}</p>` : ''}
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="error-message">Error loading answer records: ${e.message}</p>`;
        } finally {
            hideLoader();
        }
    };

    window.closeSubmissionDetailsModal = function () {
        const modal = document.getElementById('submission-details-modal');
        if (modal) modal.remove();
    };

    // ─────────────────────────────────────────────
    //  Export Sample Template (XLSX with all types)
    // ─────────────────────────────────────────────
    function exportSampleTemplate() {
        const headers = [
            'type', 'level',
            'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'accepted_answers',
            'explanation', 'points', 'tags', 'active'
        ];

        const sampleRows = [
            // 1. short_answer
            {
                type: 'short_answer',
                level: 'medium',
                question_text: "Change the following sentence into an interrogative form: 'You like playing soccer.'",
                option_a: '', option_b: '', option_c: '', option_d: '',
                correct_answer: 'Do you like playing soccer?',
                accepted_answers: '["Do you like playing soccer?", "Do you like playing soccer"]',
                explanation: "Sử dụng trợ động từ 'Do' vì chủ ngữ là 'You'.",
                points: 1, tags: '', active: 'TRUE'
            },
            // 2. matching
            {
                type: 'matching',
                level: 'medium',
                question_text: "He usually eats toast for breakfast.\nThey go to the cinema on Fridays.\nShe teaches English at this school.\nWe like to read books.",
                option_a: '', option_b: '', option_c: '', option_d: '',
                correct_answer: "He is in the habit of eating toast.\nThey visit the cinema weekly.\nHer job is to instruct students.\nReading is our hobby.",
                accepted_answers: "[]",
                explanation: "Nối các câu diễn đạt sự thật/thói quen tương ứng với ý nghĩa của chúng.",
                points: 1, tags: '', active: 'TRUE'
            },
            // 3. vocabulary
            {
                type: 'vocabulary',
                level: 'medium',
                question_text: "Which adverb of frequency indicates that something happens 100% of the time?",
                option_a: 'Sometimes', option_b: 'Always', option_c: 'Rarely', option_d: 'Never',
                correct_answer: 'Always',
                accepted_answers: '["Always"]',
                explanation: "'Always' có nghĩa là luôn luôn (100% tần suất).",
                points: 1, tags: '', active: 'TRUE'
            },
            // 4. arrange_sentence
            {
                type: 'arrange_sentence',
                level: 'medium',
                question_text: "They often visit their grandparents on Sundays.",
                option_a: '', option_b: '', option_c: '', option_d: '',
                correct_answer: 'They often visit their grandparents on Sundays.',
                accepted_answers: '["They often visit their grandparents on Sundays."]',
                explanation: 'Sắp xếp theo trật tự: S + trạng từ chỉ tần suất + V + O + cụm thời gian.',
                points: 1, tags: '', active: 'TRUE'
            },
            // 5. fill_blank
            {
                type: 'fill_blank',
                level: 'medium',
                question_text: "Water ____ at 100 degrees Celsius.",
                option_a: '', option_b: '', option_c: '', option_d: '',
                correct_answer: 'boils',
                accepted_answers: '["boils"]',
                explanation: "Diễn tả một sự thật hiển nhiên/quy luật tự nhiên, dùng hiện tại đơn với chủ ngữ số ít.",
                points: 1, tags: '', active: 'TRUE'
            },
            // 6. true_false
            {
                type: 'true_false',
                level: 'medium',
                question_text: "The sentence 'Do she speaks English?' is grammatically correct.",
                option_a: 'true', option_b: 'false', option_c: '', option_d: '',
                correct_answer: 'false',
                accepted_answers: '["FALSE", "False", "false"]',
                explanation: "Với 'does' đứng đầu câu, động từ phải ở dạng nguyên thể là 'speak'.",
                points: 1, tags: '', active: 'TRUE'
            },
            // 7. multiple_choice
            {
                type: 'multiple_choice',
                level: 'medium',
                question_text: "Select the correct negative forms in the Present Simple tense:",
                option_a: "He doesn't like apples.", option_b: "They don't playing football.", option_c: "She doesn't work here.", option_d: "I doesn't know him.",
                correct_answer: "He doesn't like apples., She doesn't work here.",
                accepted_answers: '["He doesn\'t like apples.", "She doesn\'t work here."]',
                explanation: "Cấu trúc phủ định hiện tại đơn là S + do/does + not + V-inf.",
                points: 1, tags: '', active: 'TRUE'
            },
            // 8. single_choice
            {
                type: 'single_choice',
                level: 'medium',
                question_text: "Choose the correct form of the verb: My father ____ to the office by bus every morning.",
                option_a: 'go', option_b: 'goes', option_c: 'going', option_d: 'gone',
                correct_answer: 'goes',
                accepted_answers: '["goes"]',
                explanation: "Với chủ ngữ số ít 'My father', động từ 'go' cần thêm 'es'.",
                points: 1, tags: '', active: 'TRUE'
            }
        ];

        // 🚀 Build worksheet data 🚀──
        const wsData = [headers];
        sampleRows.forEach(row => {
            wsData.push(headers.map(h => row[h] !== undefined ? row[h] : ''));
        });

        // ── Guide sheet data ──
        const guideData = [
            ['Hướng dẫn sử dụng File Mẫu:'],
            ['1. KHÔNG đổi tên các cột ở dòng số 1.'],
            ['2. Import sẽ tự động nạp toàn bộ vào ID đề thi mà bạn đang chọn ở góc phải.'],
            ['3. Cột type là CỰC KỲ QUAN TRỌNG, quyết định loại câu hỏi:'],
            [],
            ['TYPE', 'CÁCH NHẬP'],
            ['single_choice', 'Điền 4 Lựa chọn A/B/C/D. Gõ Chính xác chữ của Lựa chọn đúng vào cột correct_answer'],
            ['multiple_choice', 'Giống Single Choice nhưng cho phép chọn nhiều câu ở phía Học Sinh.'],
            ['fill_blank', 'Điền từ vào chỗ trống -> correct_answer = từ đúng (thường Option A-D bỏ trống)'],
            ['true_false', 'Đúng/Sai -> correct_answer = TRUE hoặc FALSE'],
            ['vocabulary', 'Trắc nghiệm nghĩa -> giống single_choice'],
            ['arrange_sentence', 'Sắp xếp câu -> CHỈ GHI ĐẦY ĐỦ CÂU ĐÚNG vào ô Question Text. Mọi ô đáp án & options để trống.'],
            ['matching', 'Nối cặp chữ. Ghi các cặp vào Option A-D (Ví dụ: cat | mèo). Cột correct_answer ghi chuẩn JSON.'],
            ['short_answer', 'Tự luận ngắn -> học sinh tự gõ. Giáo viên chấm tay. Bỏ trống các ô đáp án.'],
            [],
            ['ACCEPTED_ANSWERS (NÂNG CAO)', 'Định dạng bắt buộc: Mảng JSON nếu muốn hệ thống chấm nới lỏng'],
            ['Ví dụ cho mảng', '["goes", "went"]  hoặc  ["True","true","TRUE"]'],
            ['Ví dụ JSON cho matching', '{"cat":"mèo","dog":"chó"}']
        ];

        // ── Create workbook using XLSX.js ──
        const wb = XLSX.utils.book_new();

        const wsQ = XLSX.utils.aoa_to_sheet(wsData);
        // Column widths
        wsQ['!cols'] = [
            { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 8 },
            { wch: 42 },
            { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 },
            { wch: 30 }, { wch: 32 },
            { wch: 42 }, { wch: 8 }, { wch: 22 }, { wch: 8 }
        ];
        XLSX.utils.book_append_sheet(wb, wsQ, 'Questions');

        const wsG = XLSX.utils.aoa_to_sheet(guideData);
        wsG['!cols'] = [{ wch: 30 }, { wch: 70 }];
        XLSX.utils.book_append_sheet(wb, wsG, 'Huong dan');

        // ── Download as .xlsx ──
        XLSX.writeFile(wb, 'sample_questions_template.xlsx');
    }

    // Handle initial routing
    const isStudentPage = window.location.pathname.includes('student.html');
    if (isStudentPage) {
        loadStudentMode();
    } else {
        // Check teacher session
        const existingSession = sessionStorage.getItem('teacher_session');
        if (existingSession) {
            loadAdminMode();
        } else {
            loadLoginScreen();
        }
    }

    // Try to sync pending results automatically
    syncPendingSubmissions();

    // GLOBAL ANTI-SPAM CLICK PROTECTION
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button, input[type="submit"], input[type="button"], .btn-primary, .btn-danger, .btn-secondary, .edit-btn, .delete-btn');
        if (btn) {
            // Exclude confirmation modal buttons from being locked
            if (btn.closest('#bento-confirm-modal')) {
                return;
            }

            if (btn.dataset.spamLocked === 'true') {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
            // Lock the button
            btn.dataset.spamLocked = 'true';

            // Visual disable in the next tick to ensure current click executes fully
            setTimeout(() => {
                btn.style.pointerEvents = 'none';
                btn.dataset.originalOpacity = btn.style.opacity || '';
                btn.style.opacity = '0.6';
                btn.style.cursor = 'wait';
            }, 10);

            // Unlock after 500ms minimum (adjusting for async finishes)
            setTimeout(() => {
                btn.dataset.spamLocked = 'false';
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = btn.dataset.originalOpacity || '';
                btn.style.cursor = '';
            }, 500);
        }
    }, true);

    function initAiQuestionGenerator() {
        const generateBtn = document.getElementById('ai-generate-btn');
        if (!generateBtn) return;

        generateBtn.addEventListener('click', async () => {
            const topic = document.getElementById('ai-prompt-topic').value.trim();
            const level = document.getElementById('ai-level-select').value;
            const quantity = parseInt(document.getElementById('ai-quantity-input').value) || 5;
            const modelName = document.getElementById('ai-model-select').value;

            // Get selected types
            const checkedBoxes = document.querySelectorAll('#ai-types-checkboxes input:checked');
            const selectedTypes = Array.from(checkedBoxes).map(cb => cb.value);

            const provider = document.getElementById('ai-provider-select')?.value || 'gemini';

            if (!topic) {
                alert('Vui lòng nhập chủ đề hoặc đoạn văn mẫu để AI nhận diện ngữ cảnh.');
                return;
            }
            if (selectedTypes.length === 0) {
                alert('Vui lòng chọn ít nhất một dạng bài tập muốn sinh câu hỏi.');
                return;
            }

            const apiKey = aiApiKeys[provider];
            if (!apiKey) {
                alert(`Chưa cấu hình API Key cho ${provider.toUpperCase()}. Vui lòng bấm vào biểu tượng bánh răng (Cấu hình) ở góc dưới bên trái để nhập API Key.`);
                return;
            }

            showLoader(`${provider.toUpperCase()} AI đang soạn câu hỏi, vui lòng đợi...`);
            try {
                let newQuestions = [];
                if (provider === 'gemini') {
                    newQuestions = await callGeminiToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName);
                } else if (provider === 'chatgpt') {
                    newQuestions = await callChatGPTToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName);
                }

                if (newQuestions && newQuestions.length > 0) {
                    aiStagingQuestions = newQuestions;
                    renderStagingQuestions();
                    const modal = document.getElementById('ai-preview-modal');
                    if (modal) modal.classList.add('active');
                    alert(`AI đã soạn thành công ${newQuestions.length} câu hỏi! Vui lòng kiểm tra lại phía dưới.`);
                } else {
                    alert(`${provider.toUpperCase()} không trả về câu hỏi hợp lệ. Vui lòng thử lại với prompt khác.`);
                }
            } catch (err) {
                alert(`Lỗi khi gọi ${provider.toUpperCase()} API: ` + err.message);
                console.error(err);
            } finally {
                hideLoader();
            }
        });

        window.closeAiPreviewModal = function () {
            const modal = document.getElementById('ai-preview-modal');
            if (modal) modal.classList.remove('active');
        };

        // Generate more button
        document.getElementById('ai-generate-more-btn')?.addEventListener('click', async () => {
            const topic = document.getElementById('ai-prompt-topic').value.trim();
            const level = document.getElementById('ai-level-select').value;
            const quantity = parseInt(document.getElementById('ai-quantity-input').value) || 5;
            const modelName = document.getElementById('ai-model-select').value;
            const checkedBoxes = document.querySelectorAll('#ai-types-checkboxes input:checked');
            const selectedTypes = Array.from(checkedBoxes).map(cb => cb.value);
            const provider = document.getElementById('ai-provider-select')?.value || 'gemini';
            const apiKey = aiApiKeys[provider];

            if (!apiKey) return alert(`Thiếu ${provider.toUpperCase()} API Key.`);

            showLoader('AI đang soạn thêm câu hỏi mới...');
            try {
                let newQuestions = [];
                if (provider === 'gemini') {
                    newQuestions = await callGeminiToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName, aiStagingQuestions);
                } else if (provider === 'chatgpt') {
                    newQuestions = await callChatGPTToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName, aiStagingQuestions);
                }
                if (newQuestions && newQuestions.length > 0) {
                    aiStagingQuestions = aiStagingQuestions.concat(newQuestions);
                    renderStagingQuestions();
                    alert(`Đã soạn thêm ${newQuestions.length} câu hỏi mới thành công!`);
                } else {
                    alert('AI không trả về thêm câu hỏi.');
                }
            } catch (err) {
                alert('Lỗi soạn thêm câu hỏi: ' + err.message);
            } finally {
                hideLoader();
            }
        });

        // Commit button
        document.getElementById('ai-commit-btn')?.addEventListener('click', async () => {
            const selectEl = document.getElementById('ai-import-exam-select');
            const examId = selectEl.value;
            if (!examId) {
                alert('Vui lòng chọn Đề thi mà bạn muốn nhập câu hỏi vào.');
                return;
            }

            if (aiStagingQuestions.length === 0) {
                alert('Không có câu hỏi nào để nhập.');
                return;
            }

            const commitBtn = document.getElementById('ai-commit-btn');
            commitBtn.disabled = true;
            commitBtn.textContent = 'Đang nhập...';
            showLoader('Đang lưu câu hỏi vào cơ sở dữ liệu...');

            try {
                // Assign exam_id, generated question_id, points, created_at to each question
                const questionsToSave = aiStagingQuestions.map((q, idx) => {
                    return {
                        ...q,
                        exam_id: examId,
                        question_id: q.question_id || ('Q_AI_' + Date.now().toString().slice(-6) + '_' + idx),
                        points: q.points || 1,
                        active: q.active !== undefined ? q.active : true,
                        created_at: getUTC7ISOString()
                    };
                });

                await db.importQuestions(questionsToSave);
                alert(`Đã lưu thành công ${questionsToSave.length} câu hỏi vào đề thi "${examId}"!`);

                // Reset UI
                aiStagingQuestions = [];
                renderStagingQuestions();
                closeAiPreviewModal();

                // Auto-switch to Question Manager tab and load the imported exam
                const tabQuestionsBtn = document.getElementById('tab-questions-btn');
                const tabQuestionsContent = document.getElementById('tab-questions-content');
                const allTabBtns = document.querySelectorAll('.admin-tab-btn');
                const allTabContents = ['tab-exams-content', 'tab-questions-content', 'tab-submissions-content', 'tab-games-content'].map(id => document.getElementById(id));
                allTabBtns.forEach(b => b.classList.remove('active'));
                allTabContents.forEach(c => { if (c) c.style.display = 'none'; });
                if (tabQuestionsBtn) tabQuestionsBtn.classList.add('active');
                if (tabQuestionsContent) tabQuestionsContent.style.display = 'block';

                // Populate dropdown and select the imported exam, then load questions
                await populateExamsDropdown();
                const qbmSel = document.getElementById('qbm-exam-select');
                if (qbmSel) {
                    qbmSel.value = examId;
                    await loadQuestionBank();
                }

                // Update URL hash
                const hashParams = new URLSearchParams();
                hashParams.set('tab', 'questions');
                hashParams.set('examId', examId);
                history.replaceState(null, '', '#' + hashParams.toString());
            } catch (err) {
                alert('Lỗi lưu câu hỏi: ' + err.message);
            } finally {
                commitBtn.disabled = false;
                commitBtn.textContent = '💾 Nhập câu hỏi vào Đề thi';
                hideLoader();
            }
        });

        // Populate dynamic models dropdown at initialization
        // Wait a small tick so elements are guaranteed to be in DOM
        setTimeout(() => {
            const providerSelect = document.getElementById('ai-provider-select');
            if (providerSelect) {
                providerSelect.addEventListener('change', () => {
                    populateAiModels(providerSelect.value, aiApiKeys[providerSelect.value]);
                });
                // Trigger initial
                populateAiModels(providerSelect.value, aiApiKeys[providerSelect.value]);
            }
        }, 100);
    }

    async function populateAiModels(provider, apiKey) {
        const select = document.getElementById('ai-model-select');
        if (!select) return;

        if (provider === 'chatgpt') {
            select.innerHTML = `
                <option value="gpt-4o-mini" selected>GPT-4o Mini (Default)</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            `;
            return;
        }

        if (!apiKey) {
            select.innerHTML = '<option value="gemini-3.1-flash-lite" selected>Gemini 3.1 Flash Lite</option>';
            return;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
            if (!response.ok) {
                // If v1 fails, try v1beta as fallback
                const responseBeta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (!responseBeta.ok) throw new Error('Failed to fetch models list');
                const dataBeta = await responseBeta.json();
                renderModelOptions(dataBeta.models);
                return;
            }
            const data = await response.json();
            renderModelOptions(data.models);
        } catch (e) {
            console.error('Error fetching dynamic models list:', e);
            // Fallback to default hardcoded options
            select.innerHTML = `
                <option value="gemini-3.1-flash-lite" selected>Gemini 3.1 Flash Lite (Default)</option>
                <option value="gemini-1.5-flash-latest">1.5 Flash (Latest)</option>
                <option value="gemini-1.5-pro">1.5 Pro</option>
                <option value="gemini-2.0-flash-exp">2.0 Flash Exp</option>
                <option value="gemini-2.5-flash">2.5 Flash</option>
            `;
        }

        function renderModelOptions(models) {
            if (!models || models.length === 0) return;
            select.innerHTML = '';

            // Filter models that support generateContent
            const genModels = models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));

            if (genModels.length === 0) {
                select.innerHTML = '<option value="gemini-1.5-flash" selected>gemini-1.5-flash (Fallback)</option>';
                return;
            }

            genModels.forEach(m => {
                const shortName = m.name.replace('models/', '');
                const option = document.createElement('option');
                option.value = shortName;
                option.textContent = m.displayName || shortName;
                if (shortName === 'gemini-1.5-flash') {
                    option.selected = true;
                }
                select.appendChild(option);
            });

            // If nothing is selected, select the first option
            if (select.selectedIndex === -1) {
                select.selectedIndex = 0;
            }
        }
    }
    // Expose for E2E test runner access from outside iframe
    window.populateAiModels = populateAiModels;

    async function callGeminiToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName, existingQuestions = []) {
        const typesExplanation = `
Các dạng câu hỏi được phép sinh (chỉ sinh các dạng thuộc danh sách này: ${selectedTypes.join(', ')}):
1. 'single_choice' (Trắc nghiệm 1 đáp án đúng): 
   - option_a, option_b, option_c, option_d chứa các phương án lựa chọn (không được để trống).
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ nếu option_a là "goes", hãy ghi "goes".
   - accepted_answers: Phải ghi mảng JSON chứa nội dung phương án đúng đó, ví dụ '["goes"]'.

2. 'multiple_choice' (Trắc nghiệm nhiều đáp án đúng): 
   - option_a, option_b, option_c, option_d chứa các phương án (không được để trống).
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của các phương án đúng cách nhau bởi dấu phẩy (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ: 'goes, went'.
   - accepted_answers: Phải là một mảng JSON chứa chính xác nội dung các phương án đúng, ví dụ '["goes", "went"]'.

3. 'true_false' (Đúng/Sai): 
   - option_a ghi "True", option_b ghi "False". option_c và option_d để trống "".
   - correct_answer: Phải ghi "TRUE" hoặc "FALSE" (viết hoa toàn bộ).
   - accepted_answers: Ghi mảng JSON tương ứng, ví dụ '["TRUE", "True", "true"]' hoặc '["FALSE", "False", "false"]'.

4. 'fill_blank' (Điền từ vào ô trống):
   - question_text: Phải chứa ít nhất một khoảng trống biểu diễn bằng "____" (4 dấu gạch dưới).
   - correct_answer: Ghi từ đúng để điền vào ô trống, ví dụ "apple".
   - accepted_answers: Phải ghi mảng JSON chứa từ đúng và các biến thể viết hoa/số nhiều được chấp nhận, ví dụ '["apple", "apples"]'.
   - option_a, option_b, option_c, option_d để trống "".

5. 'arrange_sentence' (Sắp xếp từ thành câu):
   - question_text: Phải ghi CÂU HOÀN CHỈNH ĐÚNG (không ghi gợi ý hay dấu ngoặc vuông). Ví dụ: "She is reading a book." (Hệ thống sẽ tự động tách câu này ra thành các từ để học sinh sắp xếp).
   - correct_answer: Phải ghi lại chính xác CÂU HOÀN CHỈNH ĐÚNG giống hệt question_text, ví dụ: "She is reading a book.".
   - accepted_answers: Phải ghi mảng JSON chứa câu hoàn chỉnh đó, ví dụ: '["She is reading a book."]'.
   - option_a, option_b, option_c, option_d để trống "".

6. 'vocabulary' (Trắc nghiệm từ vựng):
   - option_a, option_b, option_c, option_d chứa các phương án nghĩa hoặc từ đồng nghĩa.
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ: 'Person who teaches'.
   - accepted_answers: Phải ghi mảng JSON chứa nội dung phương án đúng đó, ví dụ '["Person who teaches"]'.

7. 'matching' (Nối cặp từ - định nghĩa / kéo thả ghép nối):
   - question_text: Liệt kê các câu hỏi/từ ở cột trái, mỗi câu/từ trên 1 dòng mới (dùng ký tự xuống dòng \n). Ví dụ: "cat\ndog\nbird"
   - correct_answer: Liệt kê các câu trả lời/nghĩa ở cột phải tương ứng với cột trái, mỗi câu/từ trên 1 dòng mới (dùng ký tự xuống dòng \n). Số lượng dòng ở đây phải BẰNG số lượng dòng của question_text. Ví dụ: "mèo\nchó\nchim"
   - option_a, option_b, option_c, option_d để trống "".
   - accepted_answers: Phải ghi '[]'.

8. 'short_answer' (Tự luận ngắn):
   - question_text: Câu hỏi tự luận.
   - correct_answer: Câu trả lời mẫu/đáp án mẫu chuẩn.
   - accepted_answers: Phải ghi mảng JSON chứa các câu trả lời ngắn được hệ thống tự động chấm đúng, ví dụ: '["Hanoi", "Ha Noi"]', hoặc để trống '[]' nếu muốn giáo viên chấm thủ công.
   - option_a, option_b, option_c, option_d để trống "".
`;

        let existingContext = '';
        if (existingQuestions.length > 0) {
            existingContext = `
Dưới đây là các câu hỏi đã có, vui lòng KHÔNG tạo trùng lặp hoặc lặp lại nội dung của các câu hỏi này:
${JSON.stringify(existingQuestions.map(q => q.question_text))}
`;
        }

        const promptText = `
Bạn là chuyên gia giáo dục tiếng Anh chuyên nghiệp. Hãy soạn ra ${quantity} câu hỏi tiếng Anh chất lượng cao.
Chủ đề / Đoạn văn gốc: "${topic}"
Độ khó: ${level}

${typesExplanation}
${existingContext}

Hãy trả về kết quả dưới dạng một đối tượng JSON có thuộc tính duy nhất là "questions", chứa mảng các câu hỏi thỏa mãn cấu trúc trên.
Ví dụ cấu trúc trả về:
{
  "questions": [
    {
      "type": "single_choice",
      "level": "${level}",
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "...",
      "accepted_answers": "...",
      "explanation": "..."
    }
  ]
}
Chỉ trả về JSON hợp lệ, không trả về thêm bất kỳ văn bản giải thích nào ngoài khối JSON.
`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonText) {
            throw new Error('Gemini API không trả về nội dung text.');
        }

        // Helper to extract JSON from text safely
        const extractJsonFromText = (text) => {
            if (!text) return null;
            let cleanText = text.trim();
            if (cleanText.includes('```')) {
                const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match && match[1]) {
                    cleanText = match[1].trim();
                }
            }
            try {
                return JSON.parse(cleanText);
            } catch (e) {
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    const potentialJson = cleanText.slice(firstBrace, lastBrace + 1);
                    try {
                        return JSON.parse(potentialJson);
                    } catch (innerErr) {
                        console.error('Brace extract failed:', potentialJson, innerErr);
                    }
                }
                throw e;
            }
        };

        const parsed = extractJsonFromText(jsonText);
        if (!parsed || !parsed.questions) {
            throw new Error('Dữ liệu JSON phản hồi không chứa thuộc tính "questions".');
        }
        return parsed.questions || [];
    }

    async function callChatGPTToGenerate(topic, level, quantity, selectedTypes, apiKey, modelName, existingQuestions = []) {
        const typesExplanation = `
Các dạng câu hỏi được phép sinh (chỉ sinh các dạng thuộc danh sách này: ${selectedTypes.join(', ')}):
1. 'single_choice' (Trắc nghiệm 1 đáp án đúng): 
   - option_a, option_b, option_c, option_d chứa các phương án lựa chọn (không được để trống).
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ nếu option_a là "goes", hãy ghi "goes".
   - accepted_answers: Phải ghi mảng JSON chứa nội dung phương án đúng đó, ví dụ '["goes"]'.

2. 'multiple_choice' (Trắc nghiệm nhiều đáp án đúng): 
   - option_a, option_b, option_c, option_d chứa các phương án (không được để trống).
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của các phương án đúng cách nhau bởi dấu phẩy (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ: 'goes, went'.
   - accepted_answers: Phải là một mảng JSON chứa chính xác nội dung các phương án đúng, ví dụ '["goes", "went"]'.

3. 'true_false' (Đúng/Sai): 
   - option_a ghi "True", option_b ghi "False". option_c và option_d để trống "".
   - correct_answer: Phải ghi "TRUE" hoặc "FALSE" (viết hoa toàn bộ).
   - accepted_answers: Ghi mảng JSON tương ứng, ví dụ '["TRUE", "True", "true"]' hoặc '["FALSE", "False", "false"]'.

4. 'fill_blank' (Điền từ vào ô trống):
   - question_text: Phải chứa ít nhất một khoảng trống biểu diễn bằng "____" (4 dấu gạch dưới).
   - correct_answer: Ghi từ đúng để điền vào ô trống, ví dụ "apple".
   - accepted_answers: Phải ghi mảng JSON chứa từ đúng và các biến thể viết hoa/số nhiều được chấp nhận, ví dụ '["apple", "apples"]'.
   - option_a, option_b, option_c, option_d để trống "".

5. 'arrange_sentence' (Sắp xếp từ thành câu):
   - question_text: Phải ghi CÂU HOÀN CHỈNH ĐÚNG (không ghi gợi ý hay dấu ngoặc vuông). Ví dụ: "She is reading a book." (Hệ thống sẽ tự động tách câu này ra thành các từ để học sinh sắp xếp).
   - correct_answer: Phải ghi lại chính xác CÂU HOÀN CHỈNH ĐÚNG giống hệt question_text, ví dụ: "She is reading a book.".
   - accepted_answers: Phải ghi mảng JSON chứa câu hoàn chỉnh đó, ví dụ: '["She is reading a book."]'.
   - option_a, option_b, option_c, option_d để trống "".

6. 'vocabulary' (Trắc nghiệm từ vựng):
   - option_a, option_b, option_c, option_d chứa các phương án nghĩa hoặc từ đồng nghĩa.
   - correct_answer: Ghi chính xác NỘI DUNG (TEXT) của phương án đúng (tuyệt đối KHÔNG ghi chữ cái A, B, C, D). Ví dụ: 'Person who teaches'.
   - accepted_answers: Phải ghi mảng JSON chứa nội dung phương án đúng đó, ví dụ '["Person who teaches"]'.

7. 'matching' (Nối cặp từ - định nghĩa):
   - option_a, option_b, option_c, option_d chứa các cặp ghép ngăn cách bởi dấu gạch đứng "|", ví dụ: option_a: "cat | mèo", option_b: "dog | chó", option_c: "bird | chim", option_d: "fish | cá".
   - correct_answer: Phải là một chuỗi JSON object map các từ bên trái với từ bên phải, ví dụ: '{"cat":"mèo", "dog":"chó", "bird":"chim", "fish":"cá"}'.
   - accepted_answers: Phải ghi '[]'.

8. 'short_answer' (Tự luận ngắn):
   - question_text: Câu hỏi tự luận.
   - correct_answer: Câu trả lời mẫu/đáp án mẫu chuẩn.
   - accepted_answers: Phải ghi mảng JSON chứa các câu trả lời ngắn được hệ thống tự động chấm đúng, ví dụ: '["Hanoi", "Ha Noi"]', hoặc để trống '[]' nếu muốn giáo viên chấm thủ công.
   - option_a, option_b, option_c, option_d để trống "".
`;

        let existingContext = '';
        if (existingQuestions.length > 0) {
            existingContext = `
Dưới đây là các câu hỏi đã có, vui lòng KHÔNG tạo trùng lặp hoặc lặp lại nội dung của các câu hỏi này:
${JSON.stringify(existingQuestions.map(q => q.question_text))}
`;
        }

        const promptText = `
Bạn là chuyên gia giáo dục tiếng Anh chuyên nghiệp. Hãy soạn ra ${quantity} câu hỏi tiếng Anh chất lượng cao.
Chủ đề / Đoạn văn gốc: "${topic}"
Độ khó: ${level}

${typesExplanation}
${existingContext}

Hãy trả về kết quả dưới dạng một đối tượng JSON có thuộc tính duy nhất là "questions", chứa mảng các câu hỏi thỏa mãn cấu trúc trên.
Ví dụ cấu trúc trả về:
{
  "questions": [
    {
      "type": "single_choice",
      "level": "${level}",
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "...",
      "accepted_answers": "...",
      "explanation": "..."
    }
  ]
}
Chỉ trả về JSON hợp lệ, không trả về thêm bất kỳ văn bản giải thích nào ngoài khối JSON.
`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName || 'gpt-4o-mini',
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: "You are a professional English educator and a helpful assistant designed to output strict JSON." },
                    { role: "user", content: promptText }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.choices?.[0]?.message?.content;
        if (!jsonText) {
            throw new Error('ChatGPT API không trả về nội dung text.');
        }

        const extractJsonFromText = (text) => {
            if (!text) return null;
            let cleanText = text.trim();
            if (cleanText.includes('```')) {
                const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match && match[1]) {
                    cleanText = match[1].trim();
                }
            }
            try {
                return JSON.parse(cleanText);
            } catch (e) {
                const firstBrace = cleanText.indexOf('{');
                const lastBrace = cleanText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    const potentialJson = cleanText.slice(firstBrace, lastBrace + 1);
                    try {
                        return JSON.parse(potentialJson);
                    } catch (innerErr) {
                        console.error('Brace extract failed:', potentialJson, innerErr);
                    }
                }
                throw e;
            }
        };

        const parsed = extractJsonFromText(jsonText);
        if (!parsed || !parsed.questions) {
            throw new Error('Dữ liệu JSON phản hồi không chứa thuộc tính "questions".');
        }
        return parsed.questions || [];
    }

    function renderStagingQuestions() {
        const listContainer = document.getElementById('ai-staging-list');
        const countSpan = document.getElementById('ai-staging-count');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        countSpan.textContent = aiStagingQuestions.length;

        if (aiStagingQuestions.length === 0) {
            listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 1rem;">Chưa có câu hỏi nào được soạn thảo. Hãy bấm nút Sinh câu hỏi để bắt đầu.</p>';
            return;
        }

        aiStagingQuestions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'ai-question-edit-card';
            card.style.cssText = `
                background: white;
                border: 1px solid var(--border-color);
                border-radius: var(--radius);
                padding: 1.25rem;
                box-shadow: var(--shadow-sm);
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                position: relative;
                text-align: left;
            `;

            // Badge type
            const typeBadgeText = {
                single_choice: 'Single Choice',
                multiple_choice: 'Multiple Choice',
                true_false: 'True / False',
                fill_blank: 'Fill in the Blank',
                arrange_sentence: 'Arrange Sentence',
                vocabulary: 'Vocabulary',
                matching: 'Matching',
                short_answer: 'Short Answer'
            }[q.type] || q.type;

            // Build card safely using DOM manipulation to avoid HTML injection
            // (question content may contain quotes, angle brackets, etc.)

            // Helper: create a safe labeled field
            function makeField(labelText, fieldKey, isTextarea) {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'display:flex; flex-direction:column; gap:0.25rem;';
                const lbl = document.createElement('label');
                lbl.style.cssText = 'font-weight: 700; font-size: 0.85rem; color: var(--text-muted);';
                lbl.textContent = labelText;
                wrapper.appendChild(lbl);
                let el;
                if (isTextarea) {
                    el = document.createElement('textarea');
                    el.rows = 2;
                    el.style.cssText = 'width:100%; font-family:var(--font); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.4rem; box-sizing:border-box; line-height: 1.4; resize:vertical;';
                } else {
                    el = document.createElement('input');
                    el.type = 'text';
                    el.style.cssText = 'border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.35rem; font-family:var(--font); width:100%; box-sizing:border-box;';
                }
                el.className = 'ai-input-field';
                el.dataset.field = fieldKey;
                el.dataset.index = String(index);
                el.value = (q[fieldKey] !== undefined && q[fieldKey] !== null) ? String(q[fieldKey]) : '';
                wrapper.appendChild(el);
                return wrapper;
            }

            // Header row
            const headerDiv = document.createElement('div');
            headerDiv.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f3f4f6; padding-bottom:0.5rem; margin-bottom:0.25rem;';
            const titleSpan = document.createElement('span');
            titleSpan.style.cssText = 'font-weight: 800; color: var(--primary); font-size:0.95rem;';
            titleSpan.textContent = `Question #${index + 1} `;
            const badge = document.createElement('span');
            badge.style.cssText = 'font-weight: 600; font-size:0.8rem; background: var(--primary-light); color: var(--primary); padding: 0.15rem 0.5rem; border-radius: var(--radius-pill); margin-left: 0.5rem;';
            badge.textContent = typeBadgeText;
            titleSpan.appendChild(badge);
            headerDiv.appendChild(titleSpan);
            const delBtn = document.createElement('button');
            delBtn.className = 'ai-delete-card-btn';
            delBtn.dataset.index = String(index);
            delBtn.style.cssText = 'background:none; border:none; color:#ef4444; font-size:1.1rem; cursor:pointer; padding:0.25rem 0.4rem; border-radius: var(--radius-sm); display:flex; align-items:center; transition:background 0.15s;';
            delBtn.innerHTML = '<i class="fa fa-trash" aria-label="Delete"></i>';
            delBtn.title = 'Delete question';
            delBtn.onmouseover = () => delBtn.style.background = '#fee2e2';
            delBtn.onmouseout = () => delBtn.style.background = 'none';
            headerDiv.appendChild(delBtn);
            card.appendChild(headerDiv);

            // Question text (textarea)
            card.appendChild(makeField('Question Text:', 'question_text', true));

            // Options A-D for choice/vocabulary types
            if (['single_choice', 'multiple_choice', 'vocabulary'].includes(q.type)) {
                const grid = document.createElement('div');
                grid.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem;';
                ['a', 'b', 'c', 'd'].forEach(letter => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex; align-items:center; gap:0.5rem;';
                    const lbl = document.createElement('strong');
                    lbl.style.cssText = 'font-size:0.9rem; white-space:nowrap;';
                    lbl.textContent = letter.toUpperCase() + ':';
                    row.appendChild(lbl);
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.className = 'ai-input-field';
                    inp.dataset.field = `option_${letter}`;
                    inp.dataset.index = String(index);
                    inp.style.cssText = 'flex:1; border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.35rem; font-family:var(--font);';
                    const v = q[`option_${letter}`];
                    inp.value = (v !== undefined && v !== null) ? String(v) : '';
                    row.appendChild(inp);
                    grid.appendChild(row);
                });
                card.appendChild(grid);
            }


            // Correct answer + accepted answers (2-col or 1-col)
            const ansGrid = document.createElement('div');
            if (q.type === 'matching') {
                ansGrid.style.cssText = 'display:grid; grid-template-columns: 1fr; gap:1rem;';
                ansGrid.appendChild(makeField('Correct Answer:', 'correct_answer', true));
            } else {
                ansGrid.style.cssText = 'display:grid; grid-template-columns: 1fr 1fr; gap:1rem;';
                ansGrid.appendChild(makeField('Correct Answer:', 'correct_answer', false));
                const acceptedWrapper = makeField('Accepted Answers (JSON):', 'accepted_answers', false);
                const acceptedInp = acceptedWrapper.querySelector('input');
                if (!acceptedInp.value) acceptedInp.value = '[]';
                ansGrid.appendChild(acceptedWrapper);
            }
            card.appendChild(ansGrid);

            // Explanation
            card.appendChild(makeField('Explanation:', 'explanation', false));

            listContainer.appendChild(card);
        });

        // Attach delete click listeners
        listContainer.querySelectorAll('.ai-delete-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.dataset.index);
                aiStagingQuestions.splice(idx, 1);
                renderStagingQuestions();
                if (aiStagingQuestions.length === 0) {
                    closeAiPreviewModal();
                }
            });
        });

        // Attach input/change event listeners to auto-update aiStagingQuestions array
        listContainer.querySelectorAll('.ai-input-field').forEach(input => {
            const updateField = (e) => {
                const idx = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                const value = e.target.value;
                if (aiStagingQuestions[idx]) {
                    aiStagingQuestions[idx][field] = value;
                }
            };
            input.addEventListener('input', updateField);
            input.addEventListener('change', updateField);
        });
    }

    // Expose utilities for automated testing
    window.EnglishExamUtils = {
        normalizeAnswer,
        validateQuestionRow,
        gradeExam
    };
});











