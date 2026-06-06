
(function () {
  // ----- DOM elements
  const loader = document.getElementById('loader');
  const themeBtn = document.getElementById('themeSwitch');
  const form = document.getElementById('bookmarkForm');
  const titleInp = document.getElementById('title');
  const urlInp = document.getElementById('url');
  const catInp = document.getElementById('category');
  const descInp = document.getElementById('description');
  const editIdInp = document.getElementById('editId');
  const cancelBtn = document.getElementById('cancelFormBtn');
  const submitBtn = document.getElementById('submitBtn');
  const formTitleSpan = document.getElementById('formTitle');
  const searchField = document.getElementById('searchField');
  const categoryFilter = document.getElementById('categoryFilter');
  const bookmarksDiv = document.getElementById('bookmarksContainer');
  const fab = document.getElementById('fabAddBtn');
  const exportBtn = document.getElementById('exportDataBtn');
  const importBtn = document.getElementById('importDataBtn');
  const importFileInput = document.getElementById('importFile');
  const clearAllBtn = document.getElementById('clearEverythingBtn');
  const toastEl = document.getElementById('toastMsg');
  const toastText = document.getElementById('toastText');
  const toastIconSpan = document.getElementById('toastIcon');
  const undoBtn = document.getElementById('undoActionBtn');

  // stats
  const statTotal = document.getElementById('statTotal');
  const statWork = document.getElementById('statWork');
  const statPersonal = document.getElementById('statPersonal');
  const statRecent = document.getElementById('statRecent');

  let bookmarks = [];
  let isEditing = false;
  let lastDeletedItem = null;
  let undoTimeout = null;

  // helpers
  function isValidHttpUrl(str) {
    try { new URL(str); return true; } catch { return false; }
  }
  function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, function (m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

  function showToast(message, type = 'success', withUndo = null) {
    toastText.innerText = message;
    toastIconSpan.className = type === 'error' ? 'fas fa-exclamation-triangle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
    toastEl.classList.add('show');
    if (withUndo && typeof withUndo === 'function') {
      undoBtn.classList.remove('hidden');
      undoBtn.onclick = () => { withUndo(); toastEl.classList.remove('show'); clearTimeout(undoTimeout); };
    } else { undoBtn.classList.add('hidden'); undoBtn.onclick = null; }
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3800);
  }

  function saveToLocal() { localStorage.setItem('bookmark_pro_v2', JSON.stringify(bookmarks)); }

  function loadFromLocal() {
    try {
      const stored = localStorage.getItem('bookmark_pro_v2');
      if (stored) bookmarks = JSON.parse(stored);
      else bookmarks = [];
      if (!Array.isArray(bookmarks)) bookmarks = [];
      bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 6), createdAt: b.createdAt || new Date().toISOString() }));
    } catch (e) { bookmarks = []; }
  }

  function updateStatsUI() {
    const total = bookmarks.length;
    const workCount = bookmarks.filter(b => b.category === 'work').length;
    const personalCount = bookmarks.filter(b => b.category === 'personal').length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const recentCount = bookmarks.filter(b => new Date(b.createdAt) >= weekAgo).length;
    statTotal.innerText = total;
    statWork.innerText = workCount;
    statPersonal.innerText = personalCount;
    statRecent.innerText = recentCount;
  }

  function renderBookmarks() {
    const searchTerm = searchField.value.trim().toLowerCase();
    const catVal = categoryFilter.value;
    let filtered = bookmarks.filter(b => {
      const matchesSearch = searchTerm === '' || b.title.toLowerCase().includes(searchTerm) || b.url.toLowerCase().includes(searchTerm) || (b.description && b.description.toLowerCase().includes(searchTerm));
      const matchesCat = catVal === 'all' || b.category === catVal;
      return matchesSearch && matchesCat;
    });
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (filtered.length === 0) {
      bookmarksDiv.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-gray-400"><i class="fas fa-inbox text-6xl mb-4 opacity-50"></i><p class="text-lg font-medium">No bookmarks found</p><p class="text-sm">Create your first one ✨</p></div>`;
      updateStatsUI();
      return;
    }

    let html = '';
    filtered.forEach(bm => {
      let catClass = `category-badge `;
      if (bm.category === 'work') catClass += 'badge-work';
      else if (bm.category === 'personal') catClass += 'badge-personal';
      else if (bm.category === 'learning') catClass += 'badge-learning';
      else catClass += 'badge-entertainment';
      const catDisplay = bm.category.charAt(0).toUpperCase() + bm.category.slice(1);
      const descHtml = bm.description ? `<p class="text-gray-500 dark:text-gray-400 text-sm mt-1.5 line-clamp-2">${escapeHtml(bm.description)}</p>` : '';
      html += `
            <div class="bookmark-item-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade" data-id="${escapeHtml(bm.id)}">
              <div class="flex gap-4 flex-1 min-w-0">
                <div class="icon-fav !w-12 !h-12 !rounded-xl text-lg"><i class="fa-solid fa-link"></i></div>
                <div class="flex-1 min-w-0">
                  <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener" class="text-blue-700 dark:text-blue-400 font-bold text-lg hover:underline break-all">${escapeHtml(bm.title)}</a>
                  <div class="text-gray-500 dark:text-gray-400 text-sm truncate">${escapeHtml(bm.url)}</div>
                  ${descHtml}
                  <div class="mt-2 flex flex-wrap gap-1"><span class="${catClass}">${catDisplay}</span></div>
                </div>
              </div>
              <div class="flex gap-2 self-end sm:self-center">
                <button class="edit-bookmark p-2.5 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-600 transition"><i class="fas fa-pen text-lg"></i></button>
                <button class="del-bookmark p-2.5 rounded-xl hover:bg-red-100 dark:hover:bg-gray-700 text-red-500 transition"><i class="fas fa-trash-can text-lg"></i></button>
              </div>
            </div>`;
    });
    bookmarksDiv.innerHTML = html;
    updateStatsUI();

    document.querySelectorAll('.edit-bookmark').forEach(btn => {
      btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) editBookmarkById(card.dataset.id); });
    });
    document.querySelectorAll('.del-bookmark').forEach(btn => {
      btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) deleteBookmarkById(card.dataset.id); });
    });
  }

  function resetForm() {
    form.reset();
    editIdInp.value = '';
    isEditing = false;
    formTitleSpan.innerHTML = '➕ Add new bookmark';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> <span>Save</span>';
    cancelBtn.classList.add('hidden');
    urlInp.classList.remove('border-red-500');
  }

  function editBookmarkById(id) {
    const bm = bookmarks.find(b => b.id === id);
    if (!bm) return;
    titleInp.value = bm.title;
    urlInp.value = bm.url;
    catInp.value = bm.category;
    descInp.value = bm.description || '';
    editIdInp.value = bm.id;
    isEditing = true;
    formTitleSpan.innerHTML = '✏️ Edit bookmark';
    submitBtn.innerHTML = '<i class="fas fa-pen"></i> <span>Update</span>';
    cancelBtn.classList.remove('hidden');
    document.querySelector('.card-modern').scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleInp.focus();
  }

  function deleteBookmarkById(id) {
    const index = bookmarks.findIndex(b => b.id === id);
    if (index === -1) return;
    lastDeletedItem = bookmarks[index];
    bookmarks.splice(index, 1);
    saveToLocal();
    renderBookmarks();
    showToast('Bookmark removed', 'info', () => {
      if (lastDeletedItem) {
        bookmarks.push(lastDeletedItem);
        saveToLocal();
        renderBookmarks();
        showToast('Restored bookmark', 'success');
        lastDeletedItem = null;
      }
    });
  }

  function addOrUpdateBookmark(e) {
    e.preventDefault();
    const title = titleInp.value.trim();
    let url = urlInp.value.trim();
    const category = catInp.value;
    const description = descInp.value.trim();
    if (!title || !url) { showToast('Title & URL required', 'error'); return; }
    if (!isValidHttpUrl(url)) { urlInp.classList.add('border-red-500'); showToast('Enter a valid URL (https://...)', 'error'); return; }
    urlInp.classList.remove('border-red-500');

    if (isEditing && editIdInp.value) {
      const idx = bookmarks.findIndex(b => b.id === editIdInp.value);
      if (idx !== -1) {
        bookmarks[idx] = { ...bookmarks[idx], title, url, category, description };
        saveToLocal();
        showToast('Updated successfully', 'success');
        resetForm();
        renderBookmarks();
      }
    } else {
      const newBookmark = {
        id: Date.now() + '-' + Math.random().toString(36).substring(2, 10),
        title, url, category, description: description || '',
        createdAt: new Date().toISOString()
      };
      bookmarks.unshift(newBookmark);
      saveToLocal();
      showToast('Bookmark added', 'success');
      resetForm();
      renderBookmarks();
    }
    searchField.value = '';
    categoryFilter.value = 'all';
    renderBookmarks();
  }

  function cancelEditing() { resetForm(); }

  function exportData() {
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookmark_export_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Exported JSON', 'success');
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error();
        let added = 0;
        imported.forEach(item => {
          if (item.url && item.title && !bookmarks.some(b => b.url === item.url)) {
            bookmarks.push({
              id: Date.now() + '-' + Math.random().toString(36).substr(2, 8),
              title: item.title,
              url: item.url,
              category: item.category || 'personal',
              description: item.description || '',
              createdAt: item.createdAt || new Date().toISOString()
            });
            added++;
          }
        });
        if (added) { saveToLocal(); renderBookmarks(); showToast(`Imported ${added} items`, 'success'); }
        else showToast('No new bookmarks added (duplicates)', 'info');
      } catch (e) { showToast('Invalid JSON file', 'error'); }
    };
    reader.readAsText(file);
  }

  function clearAll() {
    if (bookmarks.length === 0) return;
    if (confirm(`⚠️ Permanently delete ${bookmarks.length} bookmarks?`)) {
      bookmarks = [];
      saveToLocal();
      renderBookmarks();
      showToast('All bookmarks cleared', 'info');
    }
  }

  // Theme
  function setTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
      themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
      localStorage.setItem('bm_theme', 'dark');
    } else {
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
      themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
      localStorage.setItem('bm_theme', 'light');
    }
  }
  function initTheme() {
    const saved = localStorage.getItem('bm_theme') || 'light';
    setTheme(saved);
  }
  function toggleThemeAction() {
    const isDark = document.body.classList.contains('theme-dark');
    setTheme(isDark ? 'light' : 'dark');
  }

  // keyboard
  function keyHandler(e) {
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchField)) {
      e.preventDefault(); searchField.focus();
    }
    if (e.key === 'Escape') searchField.blur();
  }

  function init() {
    loadFromLocal();
    initTheme();
    renderBookmarks();
    setTimeout(() => { loader.classList.add('hide'); }, 400);
    form.addEventListener('submit', addOrUpdateBookmark);
    cancelBtn.addEventListener('click', cancelEditing);
    searchField.addEventListener('input', renderBookmarks);
    categoryFilter.addEventListener('change', renderBookmarks);
    fab.addEventListener('click', () => { resetForm(); document.querySelector('.card-modern').scrollIntoView({ behavior: 'smooth' }); titleInp.focus(); });
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); importFileInput.value = ''; });
    clearAllBtn.addEventListener('click', clearAll);
    themeBtn.addEventListener('click', toggleThemeAction);
    document.addEventListener('keydown', keyHandler);
    window.addEventListener('load', () => { if (bookmarks.length === 0) renderBookmarks(); });
  }
  init();
})();
