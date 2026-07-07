const API_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzmrkmQbjI-cEpYn86kwbK8-lyT1fDUMeKwFtCbR7E_MSIXdV2V6cBl7ysuSXw8kBVI5A/exec';

let questionsToImport = [];
let loadedQuestions = []; // Cached questions for the active admin exam

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
    const appContainer = document.getElementById('app-container');
    
    // Global Overlay Loader Helpers
    window.showLoader = function(message = 'Đang xử lý dữ liệu...') {
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

    window.hideLoader = function() {
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
                return teacherId ? activeExams.filter(e => !e.teacher_id || String(e.teacher_id) === teacherId) : activeExams;
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const url = teacherId ? `${endpoint}?action=getExams&teacherId=${encodeURIComponent(teacherId)}` : `${endpoint}?action=getExams`;
                const response = await fetch(url);
                const result = await response.json();
                if (result.status === 'success') {
                    localStorage.setItem('mock_exams', JSON.stringify(result.data));
                    return result.data;
                }
                throw new Error(result.error || 'Failed to load exams.');
            } catch (error) {
                console.warn('API connection failed, falling back to Local Database:', error);
                localStorage.setItem('use_mock_db', 'true');
                updateDbStatusIndicator();
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const activeExams = exams.filter(e => e.active === true || e.active === 'TRUE');
                return teacherId ? activeExams.filter(e => !e.teacher_id || String(e.teacher_id) === teacherId) : activeExams;
            }
        },

        async login(username, password) {
            const useMock = localStorage.getItem('use_mock_db') === 'true';
            if (useMock) {
                const teachers = JSON.parse(localStorage.getItem('mock_teachers') || '[]');
                const teacher = teachers.find(t => String(t.username).trim() === String(username).trim() && String(t.password).trim() === String(password).trim());
                if (!teacher) throw new Error('Tên đăng nhập hoặc mật khẩu không đúng.');
                return { username: teacher.username, name: teacher.name, phone: teacher.phone };
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
                return allQs.filter(q => String(q.exam_id) === String(examId));
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(`${endpoint}?action=getQuestions&examId=${examId}`);
                const result = await response.json();
                if (result.status === 'success') {
                    // Update cache for this exam
                    const allQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                    const filteredQs = allQs.filter(q => String(q.exam_id) !== String(examId));
                    const newCache = filteredQs.concat(result.data);
                    localStorage.setItem('mock_questions', JSON.stringify(newCache));
                    return result.data;
                }
                throw new Error(result.error || 'Failed to load questions.');
            } catch (error) {
                console.warn('API connection failed, falling back to Local Database for questions:', error);
                localStorage.setItem('use_mock_db', 'true');
                updateDbStatusIndicator();
                const allQs = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                return allQs.filter(q => String(q.exam_id) === String(examId));
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
                const filtered = existing.filter(q => !(q.question_id === questionId && q.exam_id === examId));
                localStorage.setItem('mock_questions', JSON.stringify(filtered));
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
                // Delete exam
                const exams = JSON.parse(localStorage.getItem('mock_exams') || '[]');
                const filteredExams = exams.filter(e => e.exam_id !== examId);
                localStorage.setItem('mock_exams', JSON.stringify(filteredExams));
                
                // Delete questions
                const questions = JSON.parse(localStorage.getItem('mock_questions') || '[]');
                const filteredQs = questions.filter(q => q.exam_id !== examId);
                localStorage.setItem('mock_questions', JSON.stringify(filteredQs));
                
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
                return JSON.parse(localStorage.getItem('mock_submissions') || '[]');
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=getSubmissions');
                const result = await response.json();
                if (result.status === 'success') return result.data;
                throw new Error(result.error || 'Failed to fetch submissions.');
            } catch (error) {
                console.warn('API fetch submissions failed, using local storage:', error);
                return JSON.parse(localStorage.getItem('mock_submissions') || '[]');
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
                const response = await fetch(`${endpoint}?action=getSubmissionDetails&submissionId=${submissionId}`);
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
                const filteredSubs = subs.filter(s => String(s.submission_id) !== String(submissionId));
                localStorage.setItem('mock_submissions', JSON.stringify(filteredSubs));

                const details = JSON.parse(localStorage.getItem('mock_submission_details') || '[]');
                const filteredDetails = details.filter(d => String(d.submission_id) !== String(submissionId));
                localStorage.setItem('mock_submission_details', JSON.stringify(filteredDetails));

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
                return JSON.parse(localStorage.getItem('mock_games') || '[]');
            }
            try {
                const endpoint = localStorage.getItem('api_endpoint') || API_ENDPOINT;
                const response = await fetch(endpoint + '?action=getGames');
                const result = await response.json();
                if (result.status === 'success') return result.data;
                throw new Error(result.error || 'Failed to fetch games.');
            } catch (error) {
                console.warn('getGames API failed, using mock:', error);
                return JSON.parse(localStorage.getItem('mock_games') || '[]');
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
                localStorage.setItem('mock_games', JSON.stringify(games.filter(g => g.game_id !== gameId)));
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
                localStorage.setItem('mock_games', JSON.stringify(games.filter(g => g.game_id !== gameId)));
                return { status: 'success' };
            }
        }
    };


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
        const session = JSON.parse(sessionStorage.getItem('teacher_session') || 'null');
        const teacherName = session ? session.name : 'Admin';
        const teacherInitial = teacherName.slice(0, 1).toUpperCase();

        appContainer.innerHTML = `
            <div class="teacher-info-bar">
                <div class="teacher-avatar">${teacherInitial}</div>
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
                        <h3>Active Exams</h3>
                        <button id="open-create-exam-btn" class="btn-primary">➕ Create New Exam</button>
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

                    <hr style="border: 1px solid var(--border-color); margin: 1.5rem 0;">

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="margin: 0;">Question Bank Search & Filters</h3>
                        <button id="manual-add-question-btn" class="btn-primary" style="background-color: var(--secondary); box-shadow: 0 4px 12px rgba(107, 203, 119, 0.2);">➕ Add Question Manually</button>
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
        const allTabContents = ['tab-exams-content','tab-questions-content','tab-submissions-content','tab-games-content']
            .map(id => document.getElementById(id));

        const tabExamsBtn = document.getElementById('tab-exams-btn');
        const tabQuestionsBtn = document.getElementById('tab-questions-btn');
        const tabSubmissionsBtn = document.getElementById('tab-submissions-btn');
        const tabGamesBtn = document.getElementById('tab-games-btn');
        const tabExamsContent = document.getElementById('tab-exams-content');
        const tabQuestionsContent = document.getElementById('tab-questions-content');
        const tabSubmissionsContent = document.getElementById('tab-submissions-content');
        const tabGamesContent = document.getElementById('tab-games-content');

        const switchTab = (activeBtn, activeContent) => {
            allTabBtns.forEach(btn => btn.classList.remove('active'));
            allTabContents.forEach(c => { if (c) c.style.display = 'none'; });
            activeBtn.classList.add('active');
            activeContent.style.display = 'block';
        };

        tabExamsBtn.addEventListener('click', () => {
            switchTab(tabExamsBtn, tabExamsContent);
            loadExamsList();
        });

        tabQuestionsBtn.addEventListener('click', () => {
            switchTab(tabQuestionsBtn, tabQuestionsContent);
            populateExamsDropdown();
        });

        tabSubmissionsBtn.addEventListener('click', () => {
            switchTab(tabSubmissionsBtn, tabSubmissionsContent);
            loadSubmissionsExams();
        });

        tabGamesBtn.addEventListener('click', () => {
            switchTab(tabGamesBtn, tabGamesContent);
            loadGamesList();
        });


        // Settings Button modal trigger
        document.getElementById('open-settings-btn').addEventListener('click', showSettingsModal);
        
        // Guide Button modal trigger
        const guideBtn = document.getElementById('open-guide-btn');
        if (guideBtn) guideBtn.addEventListener('click', showGuideModal);

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to logout?')) {
                    sessionStorage.removeItem('teacher_session');
                    loadLoginScreen();
                }
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

        // Initially load exams list
        loadExamsList();
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
1. Click **"➕ Create New Exam"**.
2. Nhập các thông tin: **Mã Đề (Exam ID)** (bắt buộc, không dấu hoặc khoảng trắng), **Tiêu đề**, **Thời lượng thi**, và gán **Trạng thái (Active/Inactive)**.
3. Khi lưu thành công, đề thi sẽ hiện lên bảng.

### Chia sẻ cho Học sinh (Copy Link)
Tại mỗi đề thi ở bảng có trạng thái **Active**:
- Hãy bấm nút **"🔗 Copy Link"** (Màu xanh dương đậm).
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
8. **Matching (\`matching\`)**: Dạng kéo thả ghép nối theo cặp Key-Value. Chấp nhận JSON object ở \`accepted_answers\` như \`{"Cat":"Meow", "Dog":"Bark"}\`.

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

    window.closeGuideModal = function() {
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
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button id="use-mock-btn" class="btn-secondary" style="flex:1;">Toggle Offline Mode</button>
                        <button id="reset-db-btn" class="btn-secondary" style="flex:1; background-color: var(--accent-light); color: var(--accent); border-color: rgba(255, 107, 107, 0.2);">Reset Mock DB</button>
                    </div>
                    <p id="api-status-msg" style="margin-top: 0.5rem; font-weight: bold; text-align: center;"></p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const apiInput = document.getElementById('api-url-input');
        const saveApiBtn = document.getElementById('save-api-url-btn');
        const testBtn = document.getElementById('test-connection-btn');
        const mockBtn = document.getElementById('use-mock-btn');
        const resetBtn = document.getElementById('reset-db-btn');
        const statusMsg = document.getElementById('api-status-msg');

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
            if (confirm('Are you sure you want to clear all Local Storage database entries? This will delete all local mock data.')) {
                localStorage.removeItem('mock_exams');
                localStorage.removeItem('mock_questions');
                localStorage.removeItem('mock_submissions');
                localStorage.removeItem('mock_submission_details');
                initializeMockDbIfEmpty();
                alert('Mock database reset to default questions.');
                closeSettingsModal();
                loadExamsList();
            }
        });
    }

    window.closeSettingsModal = function() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.remove();
    };

    async function loadExamsList() {
        const container = document.getElementById('exams-table-container');
        if (!container) return;
        
        showLoader('Loading exams...');
        container.innerHTML = '<p class="loading-message">Loading exams...</p>';
        try {
            const exams = await db.getExams();
            if (exams.length === 0) {
                container.innerHTML = '<p class="info-message">No exams found. Click "Create New Exam" to create one!</p>';
                hideLoader();
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>Exam ID</th>
                            <th>Title</th>
                            <th>Duration</th>
                            <th>Active</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            exams.forEach(exam => {
                const isActive = exam.active === true || exam.active === 'TRUE' || exam.active === '1' || exam.active === 1;
                const formattedDate = exam.created_at ? new Date(exam.created_at).toLocaleString() : 'N/A';
                const examStr = JSON.stringify(exam);
                
                table += `
                    <tr>
                        <td><strong>${exam.exam_id}</strong></td>
                        <td>${exam.title}</td>
                        <td>${exam.duration_minutes} mins</td>
                        <td>
                            <span class="badge" style="background-color: ${isActive ? 'var(--secondary-light)' : 'var(--accent-light)'}; color: ${isActive ? '#15803d' : '#b91c1c'}; border: 1px solid ${isActive ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)'}; font-weight:800; display:inline-block; text-align:center;">
                                ${isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="font-size:0.85rem; color:var(--text-muted);">${formattedDate}</td>
                        <td>
                            <div style="display:flex; gap:0.25rem; flex-wrap:wrap;">
                                <button class="edit-btn" onclick='showExamModal(${examStr})'>Edit</button>
                                <button class="edit-btn" style="background-color:var(--primary); color:white;" onclick="manageExamQuestions('${exam.exam_id}')">Manage Questions</button>
                                <button class="edit-btn" style="background-color:var(--secondary); color:white;" onclick="copyStudentLink('${exam.exam_id}')">🔗 Copy Link</button>
                                <button class="delete-btn" onclick="deleteExam('${exam.exam_id}')">Delete</button>
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

    window.copyStudentLink = function(examId) {
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

    window.manageExamQuestions = async function(examId) {
        // Switch to Questions tab using pill-style approach
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        ['tab-exams-content','tab-questions-content','tab-submissions-content','tab-games-content']
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
    };

    window.deleteExam = async function(examId) {
        if (confirm(`⚠️ WARNING: Are you sure you want to delete exam "${examId}"?\nThis will delete the exam record AND all its associated questions permanently!`)) {
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
        }
    };

    // ─── GAME MANAGER ──────────────────────────────────────────
    async function loadGamesList() {
        const container = document.getElementById('games-grid-container');
        if (!container) return;
        
        // Bind create game button before any return statement
        const createBtn = document.getElementById('open-create-game-btn');
        if (createBtn) createBtn.onclick = () => showGameModal(null);
        
        container.innerHTML = '<p class="loading-message">Loading games...</p>';
        try {
            const games = await db.getGames();
            if (games.length === 0) {
                container.innerHTML = `
                    <div class="empty-questions-state">
                        <span class="empty-icon">🎮</span>
                        <p>No games yet.</p>
                        <button class="btn-primary" onclick="showGameModal(null)" style="margin-top:0.5rem;">+ New Game</button>
                    </div>`;
                return;
            }
            container.innerHTML = '<div class="game-grid">' + games.map(g => `
                <div class="game-card">
                    <div class="game-card-img">
                        ${g.image_url ? `<img src="${g.image_url}" alt="${g.name}" onerror="this.parentElement.innerHTML='🎮'">` : '🎮'}
                    </div>
                    <div class="game-card-body">
                        <p class="game-card-title">${g.name || 'Game'}</p>
                        <p class="game-card-url" title="${g.url}">🔗 ${g.url || 'N/A'}</p>
                        <div class="game-card-actions">
                            <button class="btn-copy-url" onclick="copyGameUrl('${(g.url||'').replace(/'/g,'\\&apos;')}')">📋 Copy URL</button>
                            <a class="btn-play-game" href="${g.url}" target="_blank" rel="noopener">▶️ Open</a>
                        </div>
                        <div class="game-card-actions" style="margin-top:0.3rem;">
                            <button class="btn-secondary" style="flex:1;font-size:0.8rem;" onclick='showGameModal(${JSON.stringify(g)})'>✏️ Edit</button>
                            <button class="delete-btn" style="flex:1;font-size:0.8rem;" onclick="deleteGameEntry('${g.game_id}')">🗑 Delete</button>
                        </div>
                    </div>
                </div>
            `).join('') + '</div>';
        } catch (err) {
            container.innerHTML = `<p class="error-message">Error loading game: ${err.message}</p>`;
        }
    }

    window.copyGameUrl = function(url) {
        navigator.clipboard.writeText(url).then(() => alert('Copied URL: ' + url)).catch(() => prompt('Copy URL:', url));
    };

    window.deleteGameEntry = async function(gameId) {
        if (!confirm('⚠️ Are you sure you want to delete this game?')) return;
        showLoader('Deleting game...');
        try {
            await db.deleteGame(gameId);
            loadGamesList();
        } catch (e) { alert('Error deleting: ' + e.message); }
        finally { hideLoader(); }
    };

    window.showGameModal = function(game) {
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
                                <input id="game-name" type="text" value="${isEdit?(game.name||''):''}" placeholder="VD: Kahoot Vocabulary" required
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:0.25rem;">Game URL <span class="required-star">*</span></label>
                                <input id="game-url" type="url" value="${isEdit?(game.url||''):''}" placeholder="https://kahoot.it/..." required
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <label style="font-weight:700;font-size:0.9rem;display:block;margin-bottom:0.25rem;">Image URL</label>
                                <input id="game-image" type="url" value="${isEdit?(game.image_url||''):''}" placeholder="https://...image.png"
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

    window.showExamModal = function(exam) {
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

        const form = document.getElementById('exam-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                hideLoader();
            }
        });
    };

    window.closeExamModal = function() {
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
        if (!select) return;

        select.innerHTML = '<option value="">Loading exams...</option>';
        select.disabled = true;

        try {
            const exams = await db.getExams();
            if (exams.length > 0) {
                select.innerHTML = '<option value="">-- Select Exam ID --</option>';
                exams.forEach(exam => {
                    const option = document.createElement('option');
                    option.value = exam.exam_id;
                    option.textContent = `${exam.title} (${exam.exam_id})`;
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="">No exams found</option>';
            }
        } catch (error) {
            console.error('Error fetching exams:', error);
            select.innerHTML = '<option value="">Error loading exams</option>';
        } finally {
            select.disabled = false;
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
        const rowNum = rowIndex + 2; // Excel row is 1-indexed + header is row 1

        if (!row.question_id) {
            errors.push(`Row ${rowNum}: 'question_id' is missing.`);
        } else {
            const qid = String(row.question_id).trim();
            if (fileQuestionIds.has(qid)) {
                errors.push(`Row ${rowNum}: Duplicate question_id '${qid}' found within the uploaded file.`);
            }
            if (existingQuestionIds.has(qid)) {
                errors.push(`Row ${rowNum}: Question ID '${qid}' already exists in this exam database.`);
            }
            fileQuestionIds.add(qid);
        }

        if (!row.exam_id) {
            errors.push(`Row ${rowNum}: 'exam_id' is missing.`);
        }

        const validTypes = ['multiple_choice', 'true_false', 'fill_blank', 'arrange_sentence', 'vocabulary', 'matching', 'short_answer'];
        if (!row.type) {
            errors.push(`Row ${rowNum}: 'type' is missing.`);
        } else if (!validTypes.includes(String(row.type).trim().toLowerCase())) {
            errors.push(`Row ${rowNum}: Invalid type '${row.type}'. Must be one of: ${validTypes.join(', ')}`);
        }

        const qtype = row.type ? String(row.type).trim().toLowerCase() : '';
        const correctAnswerOptional = ['short_answer', 'matching'].includes(qtype);
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
                
                // Fetch existing questions to check duplicates
                const examSelect = document.getElementById('qbm-exam-select');
                const selectedExamId = examSelect ? examSelect.value : '';
                
                let existingQuestionIds = new Set();
                if (selectedExamId) {
                    try {
                        const existing = await db.getQuestions(selectedExamId);
                        existingQuestionIds = new Set(existing.map(q => String(q.question_id).trim()));
                    } catch (e) {
                        console.warn('Failed to load existing questions for duplicates check:', e);
                    }
                }
                
                // Validate questions
                const processedQuestions = [];
                const fileQuestionIds = new Set();
                let errorCount = 0;
                
                const tableRows = [];
                json.forEach((rawRow, index) => {
                    const row = normalizeRowKeys(rawRow);
                    const validationErrors = validateQuestionRow(row, index, existingQuestionIds, fileQuestionIds);
                    
                    const isValid = validationErrors.length === 0;
                    if (!isValid) errorCount++;
                    
                    const processed = {
                        question_id: row.question_id ? String(row.question_id).trim() : '',
                        exam_id: row.exam_id ? String(row.exam_id).trim() : selectedExamId, 
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
                    
                    processedQuestions.push(processed);
                    
                    // Generate preview row row
                    tableRows.push(`
                        <tr class="${isValid ? '' : 'invalid-row'}" style="${isValid ? '' : 'background-color: var(--accent-light);'}">
                            <td>Row ${index+2}</td>
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

        showLoader('Đang nhập danh sách câu hỏi vào hệ thống...');
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

        showLoader('Đang tải danh sách câu hỏi...');
        container.innerHTML = '<p class="loading-message">Loading questions...</p>';

        try {
            const rawQuestions = await db.getQuestions(examId);
            loadedQuestions = rawQuestions.map(decodeQuestionFields);

            if (loadedQuestions.length === 0) {
                container.innerHTML = `
                    <div class="empty-questions-state">
                        <span class="empty-icon">📝</span>
                        <p>No questions yet for this exam.</p>
                        <p style="font-size:0.9rem;">Add your first question!</p>
                        <button class="btn-primary" onclick="document.getElementById('manual-add-question-btn').click()" style="margin-top:0.5rem;">
                            ➕ Add Question
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

    function renderQuestionBankTable(questions) {
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

        const headers = ['question_id', 'type', 'level', 'question_text', 'correct_answer', 'points', 'Actions'];

        let table = bannerHtml + '<div class="table-responsive"><table class="data-table"><thead><tr>';
        headers.forEach(header => table += `<th>${header.replace(/_/g, ' ').toUpperCase()}</th>`);
        table += '</tr></thead><tbody>';

        questions.forEach(q => {
            table += `<tr data-question-id="${q.question_id}">`;
            table += `<td>${q.question_id || ''}</td>`;
            table += `<td><span class="badge badge-primary">${q.type || ''}</span></td>`;
            table += `<td><span class="badge badge-secondary">${q.level || ''}</span></td>`;
            table += `<td class="question-text-cell" title="${q.question_text || ''}">${q.question_text || ''}</td>`;
            table += `<td class="question-text-cell" title="${q.correct_answer || ''}">${q.correct_answer || ''}</td>`;
            table += `<td>${q.points || '1'}</td>`;
            
            // Safe JSON serialization of the question object
            const qStr = JSON.stringify(q);
            table += `
                <td>
                    <button class="edit-btn" onclick='showEditModal(${qStr})'>Edit</button>
                    <button class="delete-btn" onclick="deleteQuestion('${q.question_id}', '${q.exam_id}')">Delete</button>
                </td>
            `;
        });

        table += '</tbody></table></div>';
        container.innerHTML = table;
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
            optionALabel:'', optionBLabel:'', optionCLabel:'', optionDLabel:'',
            optionAPlaceholder:'', optionBPlaceholder:'', optionCPlaceholder:'', optionDPlaceholder:'',
            correctPlaceholder: 'VD: walk',
            acceptedPlaceholder: '["walk","walks"]',
            showOptions: false, correctRequired: true
        },
        true_false: {
            emoji: '☑️',
            hint: 'Câu hỏi đúng/sai. Correct Answer phải là TRUE hoặc FALSE.',
            optionALabel:'', optionBLabel:'', optionCLabel:'', optionDLabel:'',
            optionAPlaceholder:'', optionBPlaceholder:'', optionCPlaceholder:'', optionDPlaceholder:'',
            correctPlaceholder: 'TRUE hoặc FALSE',
            acceptedPlaceholder: '["TRUE","True","true"]',
            showOptions: false, correctRequired: true
        },
        vocabulary: {
            emoji: '📖',
            hint: 'Giống multiple choice — 4 lựa chọn A/B/C/D về nghĩa của từ. Correct Answer là nghĩa đúng.',
            optionALabel: 'Nghĩa A', optionBLabel: 'Nghĩa B', optionCLabel: 'Nghĩa C', optionDLabel: 'Nghĩa D',
            optionAPlaceholder:'Nghĩa 1', optionBPlaceholder:'Nghĩa 2', optionCPlaceholder:'Nghĩa 3', optionDPlaceholder:'Nghĩa 4',
            correctPlaceholder: 'VD: Thư viện',
            acceptedPlaceholder: '["Thư viện"]',
            showOptions: true, correctRequired: true
        },
        arrange_sentence: {
            emoji: '🔀',
            hint: 'Option A/B/C/D là các từ/cụm từ rời. Correct Answer là câu hoàn chỉnh sau khi sắp xếp.',
            optionALabel: 'Cụm từ 1', optionBLabel: 'Cụm từ 2', optionCLabel: 'Cụm từ 3', optionDLabel: 'Cụm từ 4',
            optionAPlaceholder:'VD: We', optionBPlaceholder:'VD: are', optionCPlaceholder:'VD: learning', optionDPlaceholder:'VD: English now .',
            correctPlaceholder: 'VD: We are learning English now .',
            acceptedPlaceholder: '["We are learning English now ."]',
            showOptions: true, correctRequired: true
        },
        matching: {
            emoji: '🔗',
            hint: 'Option A"key | value", B"key | value"... Correct Answer là JSON: {"cat":"mèo","dog":"chó"}. Có thể để trống để giáo viên chấm.',
            optionALabel: 'Cặp 1', optionBLabel: 'Cặp 2', optionCLabel: 'Cặp 3', optionDLabel: 'Cặp 4',
            optionAPlaceholder:'VD: cat | mèo', optionBPlaceholder:'VD: dog | chó', optionCPlaceholder:'VD: bird | chim', optionDPlaceholder:'VD: fish | cá',
            correctPlaceholder: '{"cat":"mèo","dog":"chó"} (JSON) hoặc để trống',
            acceptedPlaceholder: '{"cat":"mèo","dog":"chó"}',
            showOptions: true, correctRequired: false
        },
        short_answer: {
            emoji: '💬',
            hint: 'Câu hỏi tự luận — để trống Correct Answer nếu giáo viên chấm tay. Options không cần điền.',
            optionALabel:'', optionBLabel:'', optionCLabel:'', optionDLabel:'',
            optionAPlaceholder:'', optionBPlaceholder:'', optionCPlaceholder:'', optionDPlaceholder:'',
            correctPlaceholder: 'Để trống nếu giáo viên chấm tay',
            acceptedPlaceholder: '',
            showOptions: false, correctRequired: false
        }
    };

    function mkTooltip(text) {
        return `<span class="tooltip-icon">?<span class="tooltip-text">${text}</span></span>`;
    }

    // Modal view for editing or adding question
    window.showEditModal = function(q) {
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
                                    <option value="easy" ${q.level==='easy'?'selected':''}>🟢 Easy</option>
                                    <option value="medium" ${(!q.level||q.level==='medium')?'selected':''}>🟡 Medium</option>
                                    <option value="hard" ${q.level==='hard'?'selected':''}>🔴 Hard</option>
                                </select>
                            </div>
                            <div style="grid-column:1/-1;">
                                <div class="field-label-row">
                                    <label for="edit-type">Type <span class="required-star">*</span></label>
                                    ${mkTooltip('Loại câu hỏi – ảnh hưởng đến các ô bên dưới.')}
                                </div>
                                <select id="edit-type" name="type" required style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;font-family:var(--font);">
                                    <option value="multiple_choice" ${currentType==='multiple_choice'?'selected':''}>🔤 Multiple Choice</option>
                                    <option value="single_choice" ${currentType==='single_choice'?'selected':''}>🔘 Single Choice</option>
                                    <option value="true_false" ${currentType==='true_false'?'selected':''}>☑️ True / False</option>
                                    <option value="fill_blank" ${currentType==='fill_blank'?'selected':''}>✏️ Fill in Blank</option>
                                    <option value="arrange_sentence" ${currentType==='arrange_sentence'?'selected':''}>🔀 Arrange Sentence</option>
                                    <option value="vocabulary" ${currentType==='vocabulary'?'selected':''}>📖 Vocabulary</option>
                                    <option value="matching" ${currentType==='matching'?'selected':''}>🔗 Matching</option>
                                    <option value="short_answer" ${currentType==='short_answer'?'selected':''}>💬 Short Answer</option>
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
                            style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);resize:vertical;">${isEdit?(q.question_text||''):''}</textarea>

                        <div id="edit-options-fields" style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem;">
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-a" for="edit-option-a">Option A</label></div>
                                <input type="text" id="edit-option-a" name="option_a" value="${isEdit?(q.option_a||''):''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-b" for="edit-option-b">Option B</label></div>
                                <input type="text" id="edit-option-b" name="option_b" value="${isEdit?(q.option_b||''):''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-c" for="edit-option-c">Option C</label></div>
                                <input type="text" id="edit-option-c" name="option_c" value="${isEdit?(q.option_c||''):''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row"><label id="lbl-opt-d" for="edit-option-d">Option D</label></div>
                                <input type="text" id="edit-option-d" name="option_d" value="${isEdit?(q.option_d||''):''}" placeholder="" style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Answer -->
                    <div class="modal-section">
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
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
                                <div>
                                    <div class="field-label-row">
                                        <label for="edit-correct" id="lbl-correct">Correct Answer</label>
                                        ${mkTooltip('Đáp án đúng chính xác. Với matching: JSON {"key":"val"}. Với short_answer: có thể để trống.')}
                                    </div>
                                    <input type="text" id="edit-correct" name="correct_answer"
                                        value="${isEdit?(q.correct_answer||''):''}" placeholder=""
                                        style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                                </div>
                                <div>
                                    <div class="field-label-row">
                                        <label for="edit-accepted">Accepted Answers</label>
                                        ${mkTooltip('Các đáp án chấp nhận. Dạng JSON array: ["answer1","answer2"]. Dùng khi có nhiều cách viết đúng.')}
                                    </div>
                                    <input type="text" id="edit-accepted" name="accepted_answers"
                                        value='${isEdit?(q.accepted_answers||''):''}' placeholder='["answer"]'
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
                                style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);resize:vertical;">${isEdit?(q.explanation||''):''}</textarea>
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
                                    value="${isEdit?(q.points||1):1}" min="0.5" step="0.5"
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                            <div>
                                <div class="field-label-row">
                                    <label for="edit-tags">Tags</label>
                                    ${mkTooltip('Nhãn phân loại câu hỏi. Nhiều nhãn cách nhau bằng dấu phẩy: grammar,present-simple')}
                                </div>
                                <input type="text" id="edit-tags" name="tags"
                                    value="${isEdit?(q.tags||''):''}" placeholder="grammar,vocabulary"
                                    style="width:100%;border:2px solid var(--border-color);border-radius:var(--radius-sm);padding:0.6rem;box-sizing:border-box;font-family:var(--font);">
                            </div>
                        </div>
                        <div class="checkbox-wrapper" style="margin-top:0.75rem;">
                            <input type="checkbox" id="edit-active" name="active"
                                ${(isEdit?(q.active===true||q.active==='TRUE'||q.active==='1'||q.active===1):true)?'checked':''}>
                            <label for="edit-active">Active (hiện câu hỏi này trong bài thi)</label>
                        </div>
                    </div>

                    <div class="modal-actions" style="margin-top:0.5rem;">
                        <button type="button" class="btn-secondary" onclick="closeEditModal()">Hủy</button>
                        <button type="submit" class="btn-primary">${isEdit ? '💾 Save Changes' : '➕ Add Question'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Apply type hints on change
        const typeSelect = document.getElementById('edit-type');
        const applyTypeHints = (type) => {
            const cfg = TYPE_HINTS[type] || TYPE_HINTS['multiple_choice'];
            // Hint box
            document.getElementById('type-hint-text').textContent = `${cfg.emoji}  ${cfg.hint}`;
            // Show/hide options
            const optFields = document.getElementById('edit-options-fields');
            optFields.style.display = cfg.showOptions ? 'grid' : 'none';
            // Update option labels and placeholders
            if (cfg.showOptions) {
                ['a','b','c','d'].forEach(x => {
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
                } catch (e) {}

                const currentVal = correctInput.value.trim();
                mcGroup.querySelectorAll('.ans-btn').forEach(btn => {
                    const optKey = btn.dataset.key;
                    const optInput = document.getElementById(`edit-option-${optKey}`);
                    const optVal = optInput ? optInput.value.trim() : '';

                    if (acceptedVals.length > 0) {
                        if (optVal && acceptedVals.includes(optVal)) btn.classList.add('selected');
                        else btn.classList.remove('selected');
                    } else {
                        if (currentVal && optVal === currentVal) btn.classList.add('selected');
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
                    correctInput.value = values[0];
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
        typeSelect.removeEventListener('change', () => {});
        typeSelect.addEventListener('change', () => applyAll(typeSelect.value));
        applyAll(currentType);

        document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formEl = e.target;
            const fd = new FormData(formEl);
            const data = {};
            fd.forEach((val, key) => { data[key] = val; });
            data.active = document.getElementById('edit-active').checked;
            data.points = parseFloat(data.points) || 1;

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
                hideLoader();
            }
        });
    };

    window.closeEditModal = function() {
        const modal = document.getElementById('edit-question-modal');
        if (modal) modal.remove();
    };

    window.deleteQuestion = async function(questionId, examId) {
        if (confirm(`Are you sure you want to delete question "${questionId}"?`)) {
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
        }
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

    /**
     * Student Mode - Taking Exam
     */
    async function handleStartExam(event) {
        event.preventDefault();
        const studentName = document.getElementById('student_name').value.trim();
        const className = document.getElementById('class_name').value.trim();
        const examSelect = document.getElementById('exam-select');
        const examId = examSelect.value;
        
        if (!studentName || !className || !examId) {
            alert('Please fill in all fields.');
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
                return;
            }
        } catch (e) {
            console.warn('Could not verify previous submissions:', e);
            // Allow to continue if check fails (network error etc.)
        }

        let rawQuestions = [];
        try {
            document.getElementById('student-start-form').querySelector('button').disabled = true;
            document.getElementById('student-start-form').querySelector('button').textContent = 'Loading exam questions...';
            rawQuestions = await db.getQuestions(examId);
        } catch (e) {
            alert('Failed to load questions: ' + e.message);
            document.getElementById('student-start-form').querySelector('button').disabled = false;
            document.getElementById('student-start-form').querySelector('button').textContent = 'Start Exam';
            return;
        }

        if (rawQuestions.length === 0) {
            alert('This exam has no active questions.');
            document.getElementById('student-start-form').querySelector('button').disabled = false;
            document.getElementById('student-start-form').querySelector('button').textContent = 'Start Exam';
            return;
        }

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
                const originalWords = q.correct_answer.trim().split(/\s+/).filter(w => w !== '');
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
                const leftItems = [];
                const rightItems = [];
                q.options.forEach(opt => {
                    const parts = opt.split(/[:\-|]/);
                    if (parts.length >= 2) {
                        leftItems.push(parts[0].trim());
                        rightItems.push(parts.slice(1).join(':').trim());
                    }
                });
                window.currentExamState.matchingLeftItems[q.question_id] = leftItems;
                window.currentExamState.matchingRightShuffled[q.question_id] = shuffleArray(rightItems);
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
        } catch (e) {}
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
            accepted = [String(decodedQ.correct_answer).trim()];
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
                <div class="exam-header">
                    <div>
                        <h3>${exam.title}</h3>
                        <div id="progress-bar-container">
                            <div id="progress-bar"></div>
                        </div>
                        <p id="progress-text">Question 1 of ${questions.length}</p>
                    </div>
                    <div id="timer">${durationMinutes}:00</div>
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

        } else if (question.type === 'vocabulary' || question.type === 'single_choice') {
            // Radio single-select mode
            optionsHtml = '<div class="options-container">';
            question.options.forEach(option => {
                const isSelected = studentAnswer === option;
                optionsHtml += `
                    <div class="option ${isSelected ? 'selected' : ''}" 
                         onclick="handleOptionSelect('${escapeSingleQuotes(option)}')">
                        ${option}
                    </div>`;
            });
            optionsHtml += '</div>';

        } else if (question.type === 'true_false') {
            optionsHtml = '<div class="options-container">';
            ['True', 'False'].forEach(option => {
                const isSelected = studentAnswer === option;
                optionsHtml += `
                    <div class="option ${isSelected ? 'selected' : ''}" 
                         onclick="handleOptionSelect('${option}')">
                        ${option}
                    </div>`;
            });
            optionsHtml += '</div>';

        } else if (question.type === 'fill_blank') {
            optionsHtml = `
                <div style="margin-top: 1rem;">
                    <label for="blank-input" style="font-weight: 700; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-muted);">Your Answer:</label>
                    <input type="text" id="blank-input" placeholder="Type your answer here..." 
                           value="${studentAnswer || ''}" 
                           oninput="handleTextAnswerSelect(this.value)"
                           style="border-color: var(--primary);">
                </div>
            `;

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
            const leftItems = window.currentExamState.matchingLeftItems[question.question_id] || [];
            const rightShuffled = window.currentExamState.matchingRightShuffled[question.question_id] || [];
            
            let matchedObj = {};
            if (studentAnswer) {
                try {
                    matchedObj = JSON.parse(studentAnswer);
                } catch (e) {}
            }

            optionsHtml = '<div class="matching-container">';
            leftItems.forEach(left => {
                const selectedRight = matchedObj[left] || '';
                let selectOptions = `<option value="">-- Choose Match --</option>`;
                rightShuffled.forEach(right => {
                    selectOptions += `<option value="${escapeSingleQuotes(right)}" ${selectedRight === right ? 'selected' : ''}>${right}</option>`;
                });

                optionsHtml += `
                    <div class="matching-row">
                        <div class="matching-left">${left}</div>
                        <div class="matching-right">
                            <select onchange="handleMatchingSelect('${question.question_id}', '${escapeSingleQuotes(left)}', this.value)">
                                ${selectOptions}
                            </select>
                        </div>
                    </div>
                `;
            });
            optionsHtml += '</div>';

        } else if (question.type === 'short_answer') {
            optionsHtml = `
                <div style="margin-top: 1rem;">
                    <label for="short-answer-input" style="font-weight: 700; margin-bottom: 0.5rem; display: block; font-size: 0.95rem; color: var(--text-muted);">Your Response:</label>
                    <textarea id="short-answer-input" rows="4" placeholder="Write your paragraph/sentence..." 
                              oninput="handleTextAnswerSelect(this.value)">${studentAnswer || ''}</textarea>
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
            <p class="question-text">${question.question_text}</p>
            ${optionsHtml}
        `;

        // Update progress bar
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progressPercent}%`;
        progressText.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

        updateNavigationButtons();
    }

    // Handles Option selection (MCQ multi-select, True/False single, Vocabulary single)
    window.handleOptionSelect = function(option) {
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
    window.handleTextAnswerSelect = function(val) {
        const { currentQuestionIndex } = window.currentExamState;
        window.currentExamState.answers[currentQuestionIndex] = val;
        saveDraft();
    };

    // Handles word pool clicking (Arrange Sentence)
    window.handleAddWord = function(questionId, wordIndex) {
        const state = window.currentExamState;
        const pool = state.shuffledPools[questionId];
        const arranged = state.arrangedAnswers[questionId];
        
        const word = pool.splice(wordIndex, 1)[0];
        arranged.push(word);
        
        state.answers[state.currentQuestionIndex] = arranged.join(' ');
        saveDraft();
        renderCurrentQuestion();
    };

    window.handleRemoveWord = function(questionId, wordIndex) {
        const state = window.currentExamState;
        const pool = state.shuffledPools[questionId];
        const arranged = state.arrangedAnswers[questionId];
        
        const word = arranged.splice(wordIndex, 1)[0];
        pool.push(word);
        
        state.answers[state.currentQuestionIndex] = arranged.join(' ');
        saveDraft();
        renderCurrentQuestion();
    };

    // Handles matching select dropdown shifts
    window.handleMatchingSelect = function(questionId, leftItem, selectedRight) {
        const state = window.currentExamState;
        let matchedObj = {};
        const currentAnswer = state.answers[state.currentQuestionIndex];
        if (currentAnswer) {
            try { matchedObj = JSON.parse(currentAnswer); } catch (e) {}
        }

        if (selectedRight === '') {
            delete matchedObj[leftItem];
        } else {
            matchedObj[leftItem] = selectedRight;
        }

        state.answers[state.currentQuestionIndex] = JSON.stringify(matchedObj);
        saveDraft();
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

    function submitExam(isAutoSubmit = false) {
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
                            if (Object.keys(parsed).length > 0) isAnswered = true;
                        } catch(e) {}
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

        document.getElementById('confirm-submit-yes').onclick = () => {
            closeSubmitConfirmModal();
            performActualSubmission();
        };

        document.getElementById('confirm-submit-no').onclick = () => {
            closeSubmitConfirmModal();
        };
    }

    window.closeSubmitConfirmModal = function() {
        const modal = document.getElementById('submit-confirm-modal');
        if (modal) modal.remove();
    };

    async function performActualSubmission() {
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
            const points = q.points || 1;
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
                        acceptedArr = q.accepted_answers.map(normalizeAnswer).sort();
                    } else {
                        acceptedArr = [normalizeAnswer(correct_answer)];
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
                    // Evaluate matches proportionally
                    let correctPairs = 0;
                    let totalPairs = 0;
                    
                    let correctMap = {};
                    try { correctMap = JSON.parse(correct_answer); } catch(e) {}
                    
                    let studentMap = {};
                    try { studentMap = JSON.parse(student_answer); } catch(e) {}

                    const keys = Object.keys(correctMap);
                    totalPairs = keys.length;

                    keys.forEach(k => {
                        if (normalizeAnswer(studentMap[k]) === normalizeAnswer(correctMap[k])) {
                            correctPairs++;
                        }
                    });

                    if (totalPairs > 0) {
                        points_earned = (correctPairs / totalPairs) * points;
                        if (correctPairs === totalPairs) {
                            is_correct = true;
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
        if (!ans) return '';
        if (typeof ans === 'string') {
            const trimmed = ans.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) return parsed.join(', ');
                } catch(e) {}
            }
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return Object.keys(parsed).map(k => `${k} ➜ ${parsed[k]}`).join(', ');
                } catch(e) {}
            }
            return ans;
        }
        if (Array.isArray(ans)) return ans.join(', ');
        return String(ans);
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

            detailsHtml += `
                <div class="result-question ${cardClass}">
                    <span class="badge result-badge ${isCorrect ? 'badge-secondary' : (needsReview ? 'badge-warning' : 'badge-accent')}">${statusText}</span>
                    <p><strong>Q${index + 1}:</strong> ${item.question_text}</p>
                    
                    <div class="answer-comparison">
                        <div class="ans-row student-ans ${isCorrect ? 'correct' : (needsReview ? '' : 'wrong')}">
                            Your Answer: ${ansText}
                        </div>
                        ${!isCorrect && !needsReview ? `
                        <div class="ans-row correct-ans">
                            Correct Answer: ${correctText}
                        </div>` : ''}
                    </div>

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
                    statusDiv.innerHTML = `<span>💾 Đã lưu bài làm thành công trên thiết bị (Chế độ Ngoại tuyến).</span>`;
                } else {
                    statusDiv.innerHTML = `<span>✅ Kết quả đã đồng bộ thành công lên Server!</span>`;
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

    window.retrySyncResult = async function(result) {
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
                    question_id: 'Q101',
                    exam_id: 'ENG_UNIT_1',
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
                    question_id: 'Q102',
                    exam_id: 'ENG_UNIT_1',
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
                    question_id: 'Q103',
                    exam_id: 'ENG_UNIT_1',
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
                    question_id: 'Q104',
                    exam_id: 'ENG_UNIT_1',
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
                    question_id: 'Q105',
                    exam_id: 'ENG_UNIT_1',
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
                    question_id: 'Q201',
                    exam_id: 'ENG_UNIT_2',
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
                    question_id: 'Q202',
                    exam_id: 'ENG_UNIT_2',
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
            const exams = await db.getExams();
            const submissions = await db.getSubmissions();
            
            if (exams.length === 0) {
                container.innerHTML = '<p class="info-message">No exams found.</p>';
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
                            <th>Exam ID</th>
                            <th>Exam Title</th>
                            <th>Active State</th>
                            <th>Submissions Count</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            exams.forEach(exam => {
                const count = submissions.filter(s => String(s.exam_id) === String(exam.exam_id)).length;
                const isActive = exam.active === true || exam.active === 'TRUE' || exam.active === '1' || exam.active === 1;
                table += `
                    <tr>
                        <td><strong>${exam.exam_id}</strong></td>
                        <td>${exam.title}</td>
                        <td>
                            <span class="badge" style="background-color: ${isActive ? 'var(--secondary-light)' : 'var(--accent-light)'}; color: ${isActive ? '#15803d' : '#b91c1c'}; border: 1px solid ${isActive ? 'rgba(107,203,119,0.3)' : 'rgba(255,107,107,0.3)'}; font-weight:800; display:inline-block; text-align:center;">
                                ${isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td style="font-weight: 800; font-size: 1.1rem; color: var(--primary);">${count} student(s)</td>
                        <td>
                            <button class="edit-btn" style="background-color: var(--primary); color: white;" onclick="viewExamSubmissions('${exam.exam_id}')">View Submissions</button>
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

    window.viewExamSubmissions = async function(examId) {
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
            const allSubmissions = await db.getSubmissions();
            const submissions = allSubmissions.filter(s => String(s.exam_id) === String(examId));
            
            if (submissions.length === 0) {
                container.innerHTML = '<p class="info-message">No student submissions found for this exam yet.</p>';
                return;
            }

            let table = `
                <div class="table-responsive"><table class="data-table">
                    <thead>
                        <tr>
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

            submissions.forEach(sub => {
                const score = sub.score !== undefined ? sub.score : 'N/A';
                const percentage = sub.percentage !== undefined ? sub.percentage : 'N/A';
                const minutes = Math.floor(sub.duration_seconds / 60);
                const seconds = sub.duration_seconds % 60;
                const durationStr = `${minutes}m ${seconds}s`;
                const submittedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A';
                
                table += `
                    <tr>
                        <td><strong>${sub.student_name}</strong></td>
                        <td>${sub.class_name}</td>
                        <td style="font-weight: 800; color: var(--primary);">${score} / 10</td>
                        <td>${percentage}%</td>
                        <td>${durationStr}</td>
                        <td style="font-size: 0.85rem; color: var(--text-muted);">${submittedDate}</td>
                        <td>
                            <button class="edit-btn" onclick="viewSubmissionDetailsModal('${sub.submission_id}', '${escapeSingleQuotes(sub.student_name)}', '${escapeSingleQuotes(sub.exam_title || examId)}')">View Answers</button>
                            <button class="delete-btn" onclick="deleteSubmissionEntry('${sub.submission_id}', '${escapeSingleQuotes(sub.student_name)}', '${examId}')" title="Xoá kết quả & cho học sinh làm lại">🔄 Reset</button>
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

    window.deleteSubmissionEntry = async function(submissionId, studentName, examId) {
        if (!confirm(`⚠️ Are you sure you want to delete the results of "${studentName}" and allow this student to retake the test?\n\nThis action cannot be undone!`)) return;

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
    };

    window.viewSubmissionDetailsModal = async function(submissionId, studentName, examTitle) {
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

    window.closeSubmissionDetailsModal = function() {
        const modal = document.getElementById('submission-details-modal');
        if (modal) modal.remove();
    };

    // ─────────────────────────────────────────────
    //  Export Sample Template (XLSX with all types)
    // ─────────────────────────────────────────────
    function exportSampleTemplate() {
        const headers = [
            'question_id', 'exam_id', 'type', 'level',
            'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'accepted_answers',
            'explanation', 'points', 'tags', 'active'
        ];

        const sampleRows = [
            // 1. multiple_choice
            {
                question_id: 'Q001',
                exam_id: 'ENG_SAMPLE',
                type: 'multiple_choice',
                level: 'easy',
                question_text: 'Choose the correct verb: She ___ to school every day.',
                option_a: 'go',
                option_b: 'goes',
                option_c: 'went',
                option_d: 'going',
                correct_answer: 'goes',
                accepted_answers: '["goes"]',
                explanation: "In Present Simple, 'She' takes the verb ending in -es.",
                points: 2,
                tags: 'grammar;present-simple',
                active: 'TRUE'
            },
            // 2. fill_blank
            {
                question_id: 'Q002',
                exam_id: 'ENG_SAMPLE',
                type: 'fill_blank',
                level: 'easy',
                question_text: 'Complete the sentence: My brother is ___ than me. (tall)',
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: 'taller',
                correct_answer: 'taller',
                accepted_answers: '["taller"]',
                explanation: "The comparative form of 'tall' is 'taller'.",
                points: 2,
                tags: 'grammar;comparatives',
                active: 'TRUE'
            },
            // 3. true_false
            {
                question_id: 'Q003',
                exam_id: 'ENG_SAMPLE',
                type: 'true_false',
                level: 'easy',
                question_text: 'True or False: The sun rises in the west.',
                option_a: '',
                option_b: '',
                option_c: '',
                option_d: 'FALSE',
                correct_answer: 'FALSE',
                accepted_answers: '["False","false","FALSE"]',
                explanation: 'The sun rises in the east.',
                points: 1,
                tags: 'general;true-false',
                active: 'TRUE'
            },
            // 4. vocabulary
            {
                question_id: 'Q004',
                exam_id: 'ENG_SAMPLE',
                type: 'vocabulary',
                level: 'easy',
                question_text: "What is the meaning of the word 'teacher'?",
                option_a: 'Student',
                option_b: 'Doctor',
                option_c: 'Person who teaches',
                option_d: 'Engineer',
                correct_answer: 'Person who teaches',
                accepted_answers: '["Person who teaches"]',
                explanation: 'A teacher is a person who teaches students.',
                points: 2,
                tags: 'vocabulary;people',
                active: 'TRUE'
            },
            // 5. arrange_sentence
            {
                question_id: 'Q005',
                exam_id: 'ENG_SAMPLE',
                type: 'arrange_sentence',
                level: 'medium',
                question_text: 'Arrange the words to make a correct sentence:',
                option_a: 'learning',
                option_b: 'We',
                option_c: 'are',
                option_d: 'English now .',
                correct_answer: 'We are learning English now .',
                accepted_answers: '["We are learning English now ."]',
                explanation: 'Present Continuous: Subject + be + V-ing + Object.',
                points: 3,
                tags: 'grammar;sentence-structure',
                active: 'TRUE'
            },
            // 6. matching
            {
                question_id: 'Q006',
                exam_id: 'ENG_SAMPLE',
                type: 'matching',
                level: 'medium',
                question_text: 'Match the animals with their Vietnamese meanings:',
                option_a: 'cat | mèo',
                option_b: 'dog | chó',
                option_c: 'bird | chim',
                option_d: 'fish | cá',
                correct_answer: '{"cat":"mèo","dog":"chó","bird":"chim","fish":"cá"}',
                accepted_answers: '{"cat":"mèo","dog":"chó","bird":"chim","fish":"cá"}',
                explanation: 'Match each English word with its Vietnamese meaning.',
                points: 4,
                tags: 'vocabulary;animals',
                active: 'TRUE'
            },
            // 7. short_answer
            {
                question_id: 'Q007',
                exam_id: 'ENG_SAMPLE',
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
                tags: 'writing;open-ended',
                active: 'TRUE'
            }
        ];

        // ── Build worksheet data ──
        const wsData = [headers];
        sampleRows.forEach(row => {
            wsData.push(headers.map(h => row[h] !== undefined ? row[h] : ''));
        });

        // ── Guide sheet data ──
        const guideData = [
            ['📘 HƯỚNG DẪN SỬ DỤNG FILE MẪU IMPORT CÂU HỎI'],
            [],
            ['CỘT BẮT BUỘC:', ''],
            ['question_id', 'Mã câu hỏi – duy nhất trong cùng exam_id  (VD: Q001)'],
            ['exam_id',     'Mã đề thi – đề mới sẽ được TỰ ĐỘNG tạo khi import  (VD: ENG_UNIT_2)'],
            ['type',        'Loại câu hỏi – xem bảng bên dưới'],
            ['level',       'easy | medium | hard'],
            ['question_text','Nội dung câu hỏi'],
            ['active',      'TRUE hoặc FALSE'],
            [],
            ['CÁC LOẠI CÂU HỎI (type):', 'Mô tả'],
            ['multiple_choice',   '4 đáp án A/B/C/D – correct_answer = text đáp án đúng'],
            ['fill_blank',        'Điền từ vào chỗ trống – correct_answer = từ đúng'],
            ['true_false',        'Đúng/Sai – correct_answer = TRUE hoặc FALSE'],
            ['vocabulary',        'Chọn nghĩa đúng – giống multiple_choice'],
            ['arrange_sentence',  'Sắp xếp câu – option_a..d là các cụm từ rời'],
            ['matching',          'Nối cặp – correct_answer là JSON  {"cat":"mèo","dog":"chó"}'],
            ['short_answer',      'Tự luận ngắn – correct_answer để trống, giáo viên chấm tay'],
            [],
            ['ACCEPTED_ANSWERS:', 'Định dạng'],
            ['Dạng mảng JSON',  '["goes"]  hoặc  ["True","true","TRUE"]'],
            ['Dạng object JSON cho matching', '{"cat":"mèo","dog":"chó"}'],
            [],
            ['⚠️  KHÔNG thay đổi tên cột header!'],
            ['✅  Đề thi sẽ TỰ ĐỘNG được tạo theo exam_id khi import (duration 15 phút, active).'],
        ];

        // ── Create workbook using XLSX.js ──
        const wb = XLSX.utils.book_new();

        const wsQ = XLSX.utils.aoa_to_sheet(wsData);
        // Column widths
        wsQ['!cols'] = [
            {wch:12},{wch:14},{wch:18},{wch:8},
            {wch:42},
            {wch:20},{wch:20},{wch:22},{wch:22},
            {wch:30},{wch:32},
            {wch:42},{wch:8},{wch:22},{wch:8}
        ];
        XLSX.utils.book_append_sheet(wb, wsQ, 'Questions');

        const wsG = XLSX.utils.aoa_to_sheet(guideData);
        wsG['!cols'] = [{wch:30},{wch:70}];
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

    // Expose utilities for automated testing
    window.EnglishExamUtils = {
        normalizeAnswer,
        validateQuestionRow,
        gradeExam
    };
});





