

// js/script.js - Complete Backend Integration
// Bookmark Vault with MongoDB Backend

// ==================== API CONFIGURATION ====================
const API_BASE_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('auth_token');

// ==================== API HELPER FUNCTIONS ====================
async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    let url = `${API_BASE_URL}${endpoint}`;

    // For GET and DELETE requests, add token as query param
    if ((method === 'GET' || method === 'DELETE') && authToken) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${authToken}`;
    }

    const config = {
        method,
        headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'API request failed');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== AUTHENTICATION FUNCTIONS ====================
async function registerUser(username, password, email = '') {
    try {
        const result = await apiRequest('/auth/register', 'POST', {
            username,
            password,
            email: email || undefined
        });

        if (result.access_token) {
            authToken = result.access_token;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return { success: true, user: result.user };
        }
        return { success: false, error: 'Registration failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUser(username, password) {
    try {
        const result = await apiRequest('/auth/login', 'POST', { username, password });

        if (result.access_token) {
            authToken = result.access_token;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('current_user', JSON.stringify(result.user));
            return { success: true, user: result.user };
        }
        return { success: false, error: 'Login failed' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function logoutUser() {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    location.reload();
}

async function verifyToken() {
    if (!authToken) return false;
    try {
        const result = await apiRequest('/auth/verify', 'GET');
        return result.success;
    } catch {
        return false;
    }
}

// ==================== BOOKMARK API FUNCTIONS ====================
async function fetchBookmarksFromAPI(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.search) params.append('search', filters.search);

        const endpoint = `/bookmarks${params.toString() ? '?' + params.toString() : ''}`;
        const result = await apiRequest(endpoint, 'GET');
        return result.bookmarks || [];
    } catch (error) {
        console.error('Fetch bookmarks error:', error);
        return [];
    }
}

async function createBookmarkInAPI(bookmark) {
    try {
        const result = await apiRequest('/bookmarks', 'POST', bookmark);
        return { success: true, bookmark_id: result.bookmark_id };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteBookmarkFromAPI(bookmarkId) {
    try {
        await apiRequest(`/bookmarks/${bookmarkId}`, 'DELETE');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function fetchStatsFromAPI() {
    try {
        const result = await apiRequest('/bookmarks/stats', 'GET');
        return result.stats || {};
    } catch (error) {
        console.error('Fetch stats error:', error);
        return {};
    }
}

// ==================== MAIN APPLICATION ====================
(function () {
    let currentUser = null;
    let bookmarks = [];
    let isEditing = false;
    let lastDeletedItem = null;

    // DOM elements
    const authModal = document.getElementById('authModal');
    const mainApp = document.getElementById('mainApp');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const switchBtn = document.getElementById('switchToSignupBtn');
    let isLoginMode = true;

    const themeBtn = document.getElementById('themeSwitch');
    const logoutBtn = document.getElementById('logoutBtn');
    const currentUserSpan = document.getElementById('currentUserSpan');
    const form = document.getElementById('bookmarkForm');
    const titleInp = document.getElementById('title');
    const urlInp = document.getElementById('url');
    const catInp = document.getElementById('category');
    const priorityInp = document.getElementById('priority');
    const descInp = document.getElementById('description');
    const editIdInp = document.getElementById('editId');
    const cancelBtn = document.getElementById('cancelFormBtn');
    const formTitleSpan = document.getElementById('formTitle');
    const searchField = document.getElementById('searchField');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortBy');
    const bookmarksDiv = document.getElementById('bookmarksContainer');
    const fab = document.getElementById('fabAddBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFile');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const statsModalBtn = document.getElementById('statsModalBtn');
    const statsModal = document.getElementById('statsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const toastEl = document.getElementById('toastMsg');
    const toastText = document.getElementById('toastText');
    const toastIcon = document.getElementById('toastIcon');
    const undoBtn = document.getElementById('undoActionBtn');
    const statTotal = document.getElementById('statTotal');
    const statWork = document.getElementById('statWork');
    const statPersonal = document.getElementById('statPersonal');
    const statRecent = document.getElementById('statRecent');
    const loader = document.getElementById('loaderOverlay');

    // ==================== UI HELPER FUNCTIONS ====================
    function showToast(msg, type = 'success', undoCallback = null) {
        toastText.innerText = msg;
        toastIcon.className = type === 'error' ? 'fas fa-exclamation-triangle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
        toastEl.classList.add('show');
        if (undoCallback && typeof undoCallback === 'function') {
            undoBtn.classList.remove('hidden');
            undoBtn.onclick = () => { undoCallback(); toastEl.classList.remove('show'); };
        } else {
            undoBtn.classList.add('hidden');
            undoBtn.onclick = null;
        }
        setTimeout(() => toastEl.classList.remove('show'), 3200);
    }

    async function updateStatsUI() {
        const stats = await fetchStatsFromAPI();
        statTotal.innerText = stats.total || 0;
        statWork.innerText = stats.work || 0;
        statPersonal.innerText = stats.personal || 0;

        // Calculate recent (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentCount = bookmarks.filter(b => new Date(b.created_at) >= weekAgo).length;
        statRecent.innerText = recentCount;
    }

    function getSortedBookmarks(filtered) {
        const type = sortSelect.value;
        const arr = [...filtered];
        if (type === 'date') return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (type === 'title') return arr.sort((a, b) => a.title.localeCompare(b.title));
        if (type === 'priority') {
            const order = { high: 3, medium: 2, low: 1 };
            return arr.sort((a, b) => (order[b.priority] || 2) - (order[a.priority] || 2));
        }
        return arr;
    }

    function escapeHtml(s) {
        if (!s) return '';
        return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    async function renderBookmarks() {
        const term = searchField.value.trim().toLowerCase();
        const catVal = categoryFilter.value;

        let filtered = bookmarks.filter(b => {
            const matchSearch = term === '' || b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term) || (b.description && b.description.toLowerCase().includes(term));
            const matchCat = catVal === 'all' || b.category === catVal;
            return matchSearch && matchCat;
        });

        filtered = getSortedBookmarks(filtered);

        if (filtered.length === 0) {
            bookmarksDiv.innerHTML = `<div class="text-center py-20 text-gray-400"><i class="fas fa-folder-open text-7xl mb-4 opacity-30"></i><p class="font-semibold text-lg">Empty vault</p><p class="text-xs">Click + to add your first treasure</p></div>`;
            await updateStatsUI();
            return;
        }

        let html = '';
        filtered.forEach(bm => {
            let chipClass = bm.category === 'work' ? 'chip-work' : bm.category === 'personal' ? 'chip-personal' : bm.category === 'learning' ? 'chip-learning' : 'chip-entertainment';
            let catDisplay = bm.category.charAt(0).toUpperCase() + bm.category.slice(1);
            let priorityClass = bm.priority === 'high' ? 'priority-high' : bm.priority === 'medium' ? 'priority-medium' : 'priority-low';
            let priorityIcon = bm.priority === 'high' ? '🔴' : bm.priority === 'medium' ? '🟡' : '🟢';

            html += `<div class="bookmark-card-pro p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-id="${escapeHtml(bm.id)}">
                <div class="flex gap-3 flex-1 min-w-0">
                    <div class="favicon-badge !w-12 !h-12 !rounded-xl text-base shadow-md"><i class="fa-regular fa-bookmark"></i></div>
                    <div class="flex-1">
                        <a href="${escapeHtml(bm.url)}" target="_blank" class="text-blue-700 dark:text-blue-400 font-extrabold text-base hover:underline break-all">${escapeHtml(bm.title)}</a>
                        <div class="text-gray-500 text-xs truncate">${escapeHtml(bm.url)}</div>
                        ${bm.description ? `<p class="text-gray-500 dark:text-gray-400 text-xs mt-1 italic">${escapeHtml(bm.description)}</p>` : ''}
                        <div class="flex flex-wrap gap-2 mt-2">
                            <span class="chip-pro ${chipClass} text-[11px] font-bold"><i class="fas fa-tag"></i> ${catDisplay}</span>
                            <span class="priority-tag ${priorityClass} text-[11px] font-bold"><i class="fas fa-flag"></i> ${priorityIcon} ${bm.priority.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="edit-action p-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-700 transition-all"><i class="fas fa-pen"></i></button>
                    <button class="delete-action p-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-gray-700 text-red-500 transition-all"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
        });

        bookmarksDiv.innerHTML = html;
        await updateStatsUI();

        document.querySelectorAll('.edit-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('[data-id]');
                if (card) editBookmark(card.dataset.id);
            });
        });

        document.querySelectorAll('.delete-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('[data-id]');
                if (card) deleteBookmark(card.dataset.id);
            });
        });
    }

    async function loadBookmarksFromBackend() {
        if (!authToken) return;
        try {
            bookmarks = await fetchBookmarksFromAPI();
            await renderBookmarks();
        } catch (error) {
            console.error('Failed to load bookmarks:', error);
            showToast('Failed to load bookmarks', 'error');
        }
    }

    function resetFormUI() {
        form.reset();
        editIdInp.value = '';
        isEditing = false;
        formTitleSpan.innerText = '✨ New Bookmark';
        cancelBtn.classList.add('hidden');
        priorityInp.value = 'medium';
    }

    async function editBookmark(id) {
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) return;
        titleInp.value = bm.title;
        urlInp.value = bm.url;
        catInp.value = bm.category;
        priorityInp.value = bm.priority;
        descInp.value = bm.description || '';
        editIdInp.value = bm.id;
        isEditing = true;
        formTitleSpan.innerText = '✏️ Edit Bookmark';
        cancelBtn.classList.remove('hidden');
        document.querySelector('.glass-premium').scrollIntoView({ behavior: 'smooth' });
    }

    async function deleteBookmark(id) {
        const result = await deleteBookmarkFromAPI(id);
        if (result.success) {
            const deletedItem = bookmarks.find(b => b.id === id);
            lastDeletedItem = deletedItem;
            bookmarks = bookmarks.filter(b => b.id !== id);
            await renderBookmarks();
            showToast('🗑️ Removed', 'info', async () => {
                if (lastDeletedItem) {
                    await createBookmarkInAPI(lastDeletedItem);
                    bookmarks = await fetchBookmarksFromAPI();
                    await renderBookmarks();
                    showToast('↩️ Restored', 'success');
                    lastDeletedItem = null;
                }
            });
        } else {
            showToast(result.error, 'error');
        }
    }

    async function addOrUpdateBookmark(e) {
        e.preventDefault();
        const title = titleInp.value.trim();
        let url = urlInp.value.trim();
        const category = catInp.value;
        const priority = priorityInp.value;
        const description = descInp.value.trim();

        if (!title || !url) {
            showToast('Title & URL required', 'error');
            return;
        }

        try {
            new URL(url);
        } catch (e) {
            urlInp.classList.add('border-red-500');
            showToast('Valid URL needed (https://)', 'error');
            return;
        }
        urlInp.classList.remove('border-red-500');

        if (isEditing && editIdInp.value) {
            // Update existing bookmark
            const result = await apiRequest(`/bookmarks/${editIdInp.value}`, 'PUT', {
                title, url, category, priority, description
            });
            if (result.success) {
                showToast('✏️ Updated', 'success');
                resetFormUI();
                bookmarks = await fetchBookmarksFromAPI();
                await renderBookmarks();
            }
        } else {
            // Create new bookmark
            const result = await createBookmarkInAPI({ title, url, category, priority, description });
            if (result.success) {
                showToast('✅ Added to vault', 'success');
                resetFormUI();
                bookmarks = await fetchBookmarksFromAPI();
                await renderBookmarks();
            } else {
                showToast(result.error, 'error');
            }
        }
        await renderBookmarks();
    }

    async function exportData() {
        const dataStr = JSON.stringify(bookmarks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `bookmark_vault_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('📦 Exported successfully', 'success');
    }

    async function importData(file) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const imported = JSON.parse(ev.target.result);
                if (!Array.isArray(imported)) throw new Error();

                for (const item of imported) {
                    if (item.url && item.title) {
                        await createBookmarkInAPI({
                            title: item.title,
                            url: item.url,
                            category: item.category || 'personal',
                            priority: item.priority || 'medium',
                            description: item.description || ''
                        });
                    }
                }

                bookmarks = await fetchBookmarksFromAPI();
                await renderBookmarks();
                showToast(`📥 Imported ${imported.length} bookmarks`, 'success');
            } catch (e) {
                showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    }

    async function clearAllBookmarks() {
        if (bookmarks.length === 0) return;
        if (confirm(`⚠️ Delete ${bookmarks.length} bookmarks permanently?`)) {
            for (const bm of bookmarks) {
                await deleteBookmarkFromAPI(bm.id);
            }
            bookmarks = [];
            await renderBookmarks();
            showToast('🧹 All cleared', 'info');
        }
    }

    async function loadSampleBookmarks() {
        const samples = [
            { title: "GitHub", url: "https://github.com", category: "work", priority: "high", description: "Development platform" },
            { title: "YouTube", url: "https://youtube.com", category: "entertainment", priority: "medium", description: "Video hub" },
            { title: "MDN Docs", url: "https://developer.mozilla.org", category: "learning", priority: "high", description: "Web reference" },
            { title: "Pinterest", url: "https://pinterest.com", category: "personal", priority: "low", description: "Inspiration" }
        ];

        for (const sample of samples) {
            await createBookmarkInAPI(sample);
        }

        bookmarks = await fetchBookmarksFromAPI();
        await renderBookmarks();
        showToast(`✨ Added ${samples.length} demo bookmarks`, 'success');
    }

    function showStatsModalFunc() {
        const total = bookmarks.length;
        const high = bookmarks.filter(b => b.priority === 'high').length;
        const work = bookmarks.filter(b => b.category === 'work').length;
        const personal = bookmarks.filter(b => b.category === 'personal').length;
        const learning = bookmarks.filter(b => b.category === 'learning').length;
        const entertainment = bookmarks.filter(b => b.category === 'entertainment').length;

        document.getElementById('modalStatsContent').innerHTML = `
            <div class="space-y-3">
                <div class="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span>📦 Total Bookmarks:</span>
                    <strong class="text-lg">${total}</strong>
                </div>
                <div class="flex justify-between"><span>🔴 High Priority:</span><strong>${high}</strong></div>
                <div class="flex justify-between"><span>💼 Work:</span>${work}</div>
                <div class="flex justify-between"><span>❤️ Personal:</span>${personal}</div>
                <div class="flex justify-between"><span>📚 Learning:</span>${learning}</div>
                <div class="flex justify-between"><span>🎬 Entertainment:</span>${entertainment}</div>
            </div>
        `;
        statsModal.classList.remove('hidden');
    }

    function closeModal() {
        statsModal.classList.add('hidden');
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('theme-dark');
            document.body.classList.remove('theme-light');
            themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem('vault_theme', 'dark');
        } else {
            document.body.classList.add('theme-light');
            document.body.classList.remove('theme-dark');
            themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem('vault_theme', 'light');
        }
    }

    function initTheme() {
        setTheme(localStorage.getItem('vault_theme') || 'light');
    }

    // ==================== AUTHENTICATION UI HANDLERS ====================
    async function handleAuthSubmit(e) {
        e.preventDefault();
        const username = authUsername.value.trim().toLowerCase();
        const password = authPassword.value.trim();

        if (!username || !password) {
            showToast('All fields required', 'error');
            return;
        }

        let result;
        if (isLoginMode) {
            result = await loginUser(username, password);
        } else {
            result = await registerUser(username, password);
        }

        if (result.success) {
            authModal.style.display = 'none';
            mainApp.style.display = 'block';
            currentUserSpan.innerText = result.user.username;
            authToken = localStorage.getItem('auth_token');

            // Load bookmarks from backend
            bookmarks = await fetchBookmarksFromAPI();
            await renderBookmarks();

            showToast(isLoginMode ? `Welcome back ${username}!` : `🎉 Account created! Welcome ${username}`, 'success');
            authForm.reset();
        } else {
            showToast(result.error, 'error');
        }
    }

    function switchMode() {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.innerText = 'Welcome Back';
            authSubtitle.innerText = 'Sign in to your secure vault';
            switchBtn.innerText = 'Sign up';
            authForm.querySelector('button').innerHTML = '<i class="fas fa-arrow-right-to-bracket mr-2"></i> Access Vault';
        } else {
            authTitle.innerText = 'Create Account';
            authSubtitle.innerText = 'Start your secure journey';
            switchBtn.innerText = 'Login';
            authForm.querySelector('button').innerHTML = '<i class="fas fa-user-plus mr-2"></i> Create Account';
        }
    }

    function handleLogout() {
        logoutUser();
    }

    async function checkAutoLogin() {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('current_user');

        if (savedToken && savedUser) {
            try {
                const isValid = await verifyToken();
                if (isValid) {
                    authToken = savedToken;
                    const user = JSON.parse(savedUser);
                    currentUserSpan.innerText = user.username;
                    authModal.style.display = 'none';
                    mainApp.style.display = 'block';

                    // Load bookmarks from backend
                    bookmarks = await fetchBookmarksFromAPI();
                    await renderBookmarks();
                } else {
                    authModal.style.display = 'flex';
                    mainApp.style.display = 'none';
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('current_user');
                }
            } catch {
                authModal.style.display = 'flex';
                mainApp.style.display = 'none';
            }
        } else {
            authModal.style.display = 'flex';
            mainApp.style.display = 'none';
        }
        setTimeout(() => loader.classList.add('hide'), 500);
    }

    // ==================== EVENT LISTENERS ====================
    authForm.addEventListener('submit', handleAuthSubmit);
    switchBtn.addEventListener('click', switchMode);
    logoutBtn.addEventListener('click', handleLogout);
    form.addEventListener('submit', addOrUpdateBookmark);
    cancelBtn.addEventListener('click', resetFormUI);
    searchField.addEventListener('input', renderBookmarks);
    categoryFilter.addEventListener('change', renderBookmarks);
    sortSelect.addEventListener('change', renderBookmarks);
    fab.addEventListener('click', () => {
        resetFormUI();
        document.querySelector('.glass-premium').scrollIntoView({ behavior: 'smooth' });
        titleInp.focus();
    });
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) importData(e.target.files[0]);
        importFileInput.value = '';
    });
    clearAllBtn.addEventListener('click', clearAllBookmarks);
    sampleBtn.addEventListener('click', loadSampleBookmarks);
    statsModalBtn.addEventListener('click', showStatsModalFunc);
    closeModalBtn.addEventListener('click', closeModal);
    statsModal.addEventListener('click', (e) => {
        if (e.target === statsModal) closeModal();
    });
    themeBtn.addEventListener('click', () => setTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'));

    // ==================== INITIALIZATION ====================
    initTheme();
    checkAutoLogin();
})();

