
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

  function showToast(msg, type = 'success', undoCallback = null) {
    toastText.innerText = msg;
    toastIcon.className = type === 'error' ? 'fas fa-exclamation-triangle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
    toastEl.classList.add('show');
    if (undoCallback && typeof undoCallback === 'function') { undoBtn.classList.remove('hidden'); undoBtn.onclick = () => { undoCallback(); toastEl.classList.remove('show'); }; }
    else { undoBtn.classList.add('hidden'); undoBtn.onclick = null; }
    setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  function saveUserData() {
    if (!currentUser) return;
    const users = JSON.parse(localStorage.getItem('bookmark_vault_pro_users') || '{}');
    users[currentUser] = { password: users[currentUser]?.password || null, bookmarks: bookmarks };
    localStorage.setItem('bookmark_vault_pro_users', JSON.stringify(users));
    localStorage.setItem('bookmark_current_user_pro', currentUser);
  }
  function loadUserData() {
    if (!currentUser) return;
    const users = JSON.parse(localStorage.getItem('bookmark_vault_pro_users') || '{}');
    const userData = users[currentUser];
    bookmarks = (userData && userData.bookmarks) ? userData.bookmarks : [];
    bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: b.createdAt || new Date().toISOString(), priority: b.priority || 'medium' }));
    saveUserData();
    renderBookmarks();
  }

  function updateStats() {
    const total = bookmarks.length;
    const work = bookmarks.filter(b => b.category === 'work').length;
    const personal = bookmarks.filter(b => b.category === 'personal').length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const recent = bookmarks.filter(b => new Date(b.createdAt) >= weekAgo).length;
    statTotal.innerText = total; statWork.innerText = work; statPersonal.innerText = personal; statRecent.innerText = recent;
  }

  function getSorted(filtered) {
    const type = sortSelect.value;
    const arr = [...filtered];
    if (type === 'date') return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (type === 'title') return arr.sort((a, b) => a.title.localeCompare(b.title));
    if (type === 'priority') { const order = { high: 3, medium: 2, low: 1 }; return arr.sort((a, b) => (order[b.priority || 'medium'] || 2) - (order[a.priority || 'medium'] || 2)); }
    return arr;
  }
  function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  function renderBookmarks() {
    const term = searchField.value.trim().toLowerCase();
    const catVal = categoryFilter.value;
    let filtered = bookmarks.filter(b => {
      const matchSearch = term === '' || b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term) || (b.description && b.description.toLowerCase().includes(term));
      const matchCat = catVal === 'all' || b.category === catVal;
      return matchSearch && matchCat;
    });
    filtered = getSorted(filtered);
    if (filtered.length === 0) { bookmarksDiv.innerHTML = `<div class="text-center py-20 text-gray-400"><i class="fas fa-folder-open text-7xl mb-4 opacity-30"></i><p class="font-semibold text-lg">Empty vault</p><p class="text-xs">Click + to add your first treasure</p></div>`; updateStats(); return; }
    let html = '';
    filtered.forEach(bm => {
      let chipClass = bm.category === 'work' ? 'chip-work' : bm.category === 'personal' ? 'chip-personal' : bm.category === 'learning' ? 'chip-learning' : 'chip-entertainment';
      let catDisplay = bm.category.charAt(0).toUpperCase() + bm.category.slice(1);
      let priorityClass = bm.priority === 'high' ? 'priority-high' : bm.priority === 'medium' ? 'priority-medium' : 'priority-low';
      let priorityIcon = bm.priority === 'high' ? '🔴' : bm.priority === 'medium' ? '🟡' : '🟢';
      html += `<div class="bookmark-card-pro p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-id="${escapeHtml(bm.id)}">
            <div class="flex gap-3 flex-1 min-w-0"><div class="favicon-badge !w-12 !h-12 !rounded-xl text-base shadow-md"><i class="fa-regular fa-bookmark"></i></div>
            <div class="flex-1"><a href="${escapeHtml(bm.url)}" target="_blank" class="text-blue-700 dark:text-blue-400 font-extrabold text-base hover:underline break-all">${escapeHtml(bm.title)}</a>
            <div class="text-gray-500 text-xs truncate">${escapeHtml(bm.url)}</div>${bm.description ? `<p class="text-gray-500 dark:text-gray-400 text-xs mt-1 italic">${escapeHtml(bm.description)}</p>` : ''}
            <div class="flex flex-wrap gap-2 mt-2"><span class="chip-pro ${chipClass} text-[11px] font-bold"><i class="fas fa-tag"></i> ${catDisplay}</span><span class="priority-tag ${priorityClass} text-[11px] font-bold"><i class="fas fa-flag"></i> ${priorityIcon} ${bm.priority.toUpperCase()}</span></div>
            </div></div>
            <div class="flex gap-2"><button class="edit-action p-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-700 transition-all"><i class="fas fa-pen"></i></button><button class="delete-action p-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-gray-700 text-red-500 transition-all"><i class="fas fa-trash-alt"></i></button></div>
          </div>`;
    });
    bookmarksDiv.innerHTML = html;
    updateStats();
    document.querySelectorAll('.edit-action').forEach(btn => btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) editBookmark(card.dataset.id); }));
    document.querySelectorAll('.delete-action').forEach(btn => btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) deleteBookmark(card.dataset.id); }));
  }

  function resetFormUI() { form.reset(); editIdInp.value = ''; isEditing = false; formTitleSpan.innerText = '✨ New Bookmark'; cancelBtn.classList.add('hidden'); priorityInp.value = 'medium'; }
  function editBookmark(id) { const bm = bookmarks.find(b => b.id === id); if (!bm) return; titleInp.value = bm.title; urlInp.value = bm.url; catInp.value = bm.category; priorityInp.value = bm.priority || 'medium'; descInp.value = bm.description || ''; editIdInp.value = bm.id; isEditing = true; formTitleSpan.innerText = '✏️ Edit Bookmark'; cancelBtn.classList.remove('hidden'); document.querySelector('.glass-premium').scrollIntoView({ behavior: 'smooth' }); }
  function deleteBookmark(id) { const idx = bookmarks.findIndex(b => b.id === id); if (idx === -1) return; lastDeletedItem = bookmarks[idx]; bookmarks.splice(idx, 1); saveUserData(); renderBookmarks(); showToast('🗑️ Removed', 'info', () => { if (lastDeletedItem) { bookmarks.push(lastDeletedItem); saveUserData(); renderBookmarks(); showToast('↩️ Restored', 'success'); lastDeletedItem = null; } }); }
  function addOrUpdate(e) { e.preventDefault(); const title = titleInp.value.trim(), url = urlInp.value.trim(), category = catInp.value, priority = priorityInp.value, description = descInp.value.trim(); if (!title || !url) { showToast('Title & URL required', 'error'); return; } try { new URL(url); } catch (e) { urlInp.classList.add('border-red-500'); showToast('Valid URL needed (https://)', 'error'); return; } urlInp.classList.remove('border-red-500'); if (isEditing && editIdInp.value) { const idx = bookmarks.findIndex(b => b.id === editIdInp.value); if (idx !== -1) { bookmarks[idx] = { ...bookmarks[idx], title, url, category, priority, description }; saveUserData(); showToast('✏️ Updated', 'success'); resetFormUI(); renderBookmarks(); } } else { const newBm = { id: Date.now() + '-' + Math.random().toString(36).substring(2, 10), title, url, category, priority, description: description || '', createdAt: new Date().toISOString() }; bookmarks.unshift(newBm); saveUserData(); showToast('✅ Added', 'success'); resetFormUI(); renderBookmarks(); } renderBookmarks(); }
  function exportData() { const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `vault_${currentUser}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); showToast('📦 Exported', 'success'); }
  function importData(file) { const reader = new FileReader(); reader.onload = (ev) => { try { const imported = JSON.parse(ev.target.result); if (!Array.isArray(imported)) throw new Error(); let added = 0; imported.forEach(item => { if (item.url && item.title && !bookmarks.some(b => b.url === item.url)) { bookmarks.push({ id: Date.now() + '-' + Math.random().toString(36).substr(2, 8), title: item.title, url: item.url, category: item.category || 'personal', priority: item.priority || 'medium', description: item.description || '', createdAt: item.createdAt || new Date().toISOString() }); added++; } }); if (added) { saveUserData(); renderBookmarks(); showToast(`📥 Imported ${added}`, 'success'); } else showToast('No new items', 'info'); } catch (e) { showToast('Invalid JSON', 'error'); } }; reader.readAsText(file); }
  function clearAll() { if (bookmarks.length === 0) return; if (confirm(`⚠️ Delete ${bookmarks.length} bookmarks permanently?`)) { bookmarks = []; saveUserData(); renderBookmarks(); showToast('🧹 Cleared', 'info'); } }
  function loadSamples() { const samples = [{ title: "GitHub", url: "https://github.com", category: "work", priority: "high", description: "Development platform" }, { title: "YouTube", url: "https://youtube.com", category: "entertainment", priority: "medium", description: "Video hub" }, { title: "MDN Docs", url: "https://developer.mozilla.org", category: "learning", priority: "high", description: "Web reference" }, { title: "Pinterest", url: "https://pinterest.com", category: "personal", priority: "low", description: "Inspiration" }]; let added = 0; samples.forEach(s => { if (!bookmarks.some(b => b.url === s.url)) { bookmarks.push({ ...s, id: Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: new Date().toISOString() }); added++; } }); if (added) { saveUserData(); renderBookmarks(); showToast(`✨ ${added} demos added`, 'success'); } else showToast('Samples exist', 'info'); }
  function showStatsModalFunc() { const total = bookmarks.length; const high = bookmarks.filter(b => b.priority === 'high').length; const cats = { work: 0, personal: 0, learning: 0, entertainment: 0 }; bookmarks.forEach(b => { if (cats[b.category] !== undefined) cats[b.category]++; }); document.getElementById('modalStatsContent').innerHTML = `<div class="space-y-2"><div class="flex justify-between"><span>📦 Total:</span><strong>${total}</strong></div><div class="flex justify-between"><span>🔴 High priority:</span><strong>${high}</strong></div><div class="flex justify-between"><span>💼 Work:</span>${cats.work}</div><div class="flex justify-between"><span>❤️ Personal:</span>${cats.personal}</div><div class="flex justify-between"><span>📚 Learning:</span>${cats.learning}</div><div class="flex justify-between"><span>🎬 Entertainment:</span>${cats.entertainment}</div></div>`; statsModal.classList.remove('hidden'); }
  function closeModal() { statsModal.classList.add('hidden'); }
  function setTheme(theme) { if (theme === 'dark') { document.body.classList.add('theme-dark'); document.body.classList.remove('theme-light'); themeBtn.innerHTML = '<i class="fas fa-sun"></i>'; localStorage.setItem('vault_theme_premium', 'dark'); } else { document.body.classList.add('theme-light'); document.body.classList.remove('theme-dark'); themeBtn.innerHTML = '<i class="fas fa-moon"></i>'; localStorage.setItem('vault_theme_premium', 'light'); } }
  function initTheme() { setTheme(localStorage.getItem('vault_theme_premium') || 'light'); }

  function handleAuthSubmit(e) { e.preventDefault(); const username = authUsername.value.trim().toLowerCase(); const password = authPassword.value.trim(); if (!username || !password) { showToast('All fields required', 'error'); return; } const users = JSON.parse(localStorage.getItem('bookmark_vault_pro_users') || '{}'); if (isLoginMode) { if (users[username] && users[username].password === password) { currentUser = username; bookmarks = users[username].bookmarks || []; bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: b.createdAt || new Date().toISOString(), priority: b.priority || 'medium' })); localStorage.setItem('bookmark_current_user_pro', currentUser); saveUserData(); authModal.style.display = 'none'; mainApp.style.display = 'block'; currentUserSpan.innerText = currentUser; renderBookmarks(); showToast(`Welcome ${username}!`, 'success'); } else { showToast('Invalid credentials', 'error'); } } else { if (users[username]) { showToast('Username taken', 'error'); return; } users[username] = { password: password, bookmarks: [] }; localStorage.setItem('bookmark_vault_pro_users', JSON.stringify(users)); currentUser = username; bookmarks = []; localStorage.setItem('bookmark_current_user_pro', currentUser); saveUserData(); authModal.style.display = 'none'; mainApp.style.display = 'block'; currentUserSpan.innerText = currentUser; renderBookmarks(); showToast(`🎉 Account created! Welcome ${username}`, 'success'); } }
  function switchMode() { isLoginMode = !isLoginMode; if (isLoginMode) { authTitle.innerText = 'Welcome Back'; authSubtitle.innerText = 'Sign in to your vault'; switchBtn.innerText = 'Sign up'; authForm.querySelector('button').innerHTML = '<i class="fas fa-arrow-right-to-bracket mr-2"></i> Access Vault'; } else { authTitle.innerText = 'Create Account'; authSubtitle.innerText = 'Start your secure journey'; switchBtn.innerText = 'Login'; authForm.querySelector('button').innerHTML = '<i class="fas fa-user-plus mr-2"></i> Create Account'; } }
  function logout() { currentUser = null; bookmarks = []; localStorage.removeItem('bookmark_current_user_pro'); mainApp.style.display = 'none'; authModal.style.display = 'flex'; authForm.reset(); isLoginMode = true; authTitle.innerText = 'Welcome Back'; authSubtitle.innerText = 'Sign in to your vault'; authForm.querySelector('button').innerHTML = '<i class="fas fa-arrow-right-to-bracket mr-2"></i> Access Vault'; switchBtn.innerText = 'Sign up'; showToast('Logged out', 'info'); }
  function checkAutoLogin() { const saved = localStorage.getItem('bookmark_current_user_pro'); if (saved) { const users = JSON.parse(localStorage.getItem('bookmark_vault_pro_users') || '{}'); if (users[saved]) { currentUser = saved; bookmarks = users[saved].bookmarks || []; bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: b.createdAt || new Date().toISOString(), priority: b.priority || 'medium' })); authModal.style.display = 'none'; mainApp.style.display = 'block'; currentUserSpan.innerText = currentUser; renderBookmarks(); } else { authModal.style.display = 'flex'; mainApp.style.display = 'none'; } } else { authModal.style.display = 'flex'; mainApp.style.display = 'none'; } setTimeout(() => loader.classList.add('hide'), 500); }

  authForm.addEventListener('submit', handleAuthSubmit);
  switchBtn.addEventListener('click', switchMode);
  logoutBtn.addEventListener('click', logout);
  form.addEventListener('submit', addOrUpdate);
  cancelBtn.addEventListener('click', resetFormUI);
  searchField.addEventListener('input', renderBookmarks);
  categoryFilter.addEventListener('change', renderBookmarks);
  sortSelect.addEventListener('change', renderBookmarks);
  fab.addEventListener('click', () => { resetFormUI(); document.querySelector('.glass-premium').scrollIntoView({ behavior: 'smooth' }); titleInp.focus(); });
  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); importFileInput.value = ''; });
  clearAllBtn.addEventListener('click', clearAll);
  sampleBtn.addEventListener('click', loadSamples);
  statsModalBtn.addEventListener('click', showStatsModalFunc);
  closeModalBtn.addEventListener('click', closeModal);
  statsModal.addEventListener('click', (e) => { if (e.target === statsModal) closeModal(); });
  themeBtn.addEventListener('click', () => setTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'));
  initTheme();
  checkAutoLogin();
})();
