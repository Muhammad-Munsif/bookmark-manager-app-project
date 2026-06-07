<script>
    (function () {
      // DOM elements
      const loader = document.getElementById('loaderOverlay');
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
      const toastTextSpan = document.getElementById('toastText');
      const toastIconSpan = document.getElementById('toastIcon');
      const undoBtn = document.getElementById('undoActionBtn');

      const statTotal = document.getElementById('statTotal');
      const statWork = document.getElementById('statWork');
      const statPersonal = document.getElementById('statPersonal');
      const statRecent = document.getElementById('statRecent');

      let bookmarks = [];
      let isEditing = false;
      let lastDeletedItem = null;

      // helpers
      function isValidUrl(str) { try { new URL(str); return true; } catch { return false; } }
      function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m)); }

      function showToast(msg, type = 'success', withUndo = null) {
        toastTextSpan.innerText = msg;
        toastIconSpan.className = type === 'error' ? 'fas fa-exclamation-triangle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
        toastEl.classList.add('show');
        if (withUndo && typeof withUndo === 'function') {
          undoBtn.classList.remove('hidden');
          undoBtn.onclick = () => { withUndo(); toastEl.classList.remove('show'); clearTimeout(window.undoTimer); };
        } else { undoBtn.classList.add('hidden'); undoBtn.onclick = null; }
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3800);
      }

      function saveToLocal() { localStorage.setItem('bookmark_vault_pro', JSON.stringify(bookmarks)); }

      function loadFromLocal() {
        try {
          const stored = localStorage.getItem('bookmark_vault_pro');
          bookmarks = stored ? JSON.parse(stored) : [];
          if (!Array.isArray(bookmarks)) bookmarks = [];
          bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: b.createdAt || new Date().toISOString() }));
        } catch (e) { bookmarks = []; }
      }

      function updateStats() {
        const total = bookmarks.length;
        const work = bookmarks.filter(b => b.category === 'work').length;
        const personal = bookmarks.filter(b => b.category === 'personal').length;
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = bookmarks.filter(b => new Date(b.createdAt) >= weekAgo).length;
        statTotal.innerText = total;
        statWork.innerText = work;
        statPersonal.innerText = personal;
        statRecent.innerText = recent;
      }

      function renderBookmarks() {
        const searchTerm = searchField.value.trim().toLowerCase();
        const catVal = categoryFilter.value;
        let filtered = bookmarks.filter(b => {
          const matchSearch = searchTerm === '' || b.title.toLowerCase().includes(searchTerm) || b.url.toLowerCase().includes(searchTerm) || (b.description && b.description.toLowerCase().includes(searchTerm));
          const matchCat = catVal === 'all' || b.category === catVal;
          return matchSearch && matchCat;
        });
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (filtered.length === 0) {
          bookmarksDiv.innerHTML = `<div class="empty-zone flex flex-col items-center py-20 text-gray-400"><i class="fas fa-folder-open text-7xl mb-5 opacity-30"></i><p class="text-xl font-semibold">No treasures found</p><p class="text-sm mt-1">Add a bookmark or adjust filters</p></div>`;
          updateStats(); return;
        }

        let html = '';
        filtered.forEach(bm => {
          let chipClass = '';
          if (bm.category === 'work') chipClass = 'chip-work';
          else if (bm.category === 'personal') chipClass = 'chip-personal';
          else if (bm.category === 'learning') chipClass = 'chip-learning';
          else chipClass = 'chip-entertainment';
          const catDisplay = bm.category.charAt(0).toUpperCase() + bm.category.slice(1);
          const descHtml = bm.description ? `<p class="text-gray-500 dark:text-gray-400 text-sm mt-1.5 line-clamp-2 break-words">${escapeHtml(bm.description)}</p>` : '';
          html += `
            <div class="bookmark-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-id="${escapeHtml(bm.id)}">
              <div class="flex gap-4 flex-1 min-w-0">
                <div class="bookmark-favicon !w-12 !h-12 !rounded-xl flex-shrink-0"><i class="fa-regular fa-bookmark"></i></div>
                <div class="flex-1 min-w-0">
                  <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener" class="text-blue-700 dark:text-blue-400 font-extrabold text-lg hover:underline break-all">${escapeHtml(bm.title)}</a>
                  <div class="text-gray-500 dark:text-gray-400 text-sm truncate">${escapeHtml(bm.url)}</div>
                  ${descHtml}
                  <div class="mt-2"><span class="chip-category ${chipClass}"><i class="fas fa-tag text-xs"></i> ${catDisplay}</span></div>
                </div>
              </div>
              <div class="flex gap-2 self-end sm:self-center">
                <button class="edit-action p-3 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-600 transition-all"><i class="fas fa-edit text-lg"></i></button>
                <button class="delete-action p-3 rounded-xl hover:bg-red-100 dark:hover:bg-gray-700 text-red-500 transition-all"><i class="fas fa-trash-alt text-lg"></i></button>
              </div>
            </div>`;
        });
        bookmarksDiv.innerHTML = html;
        updateStats();

        document.querySelectorAll('.edit-action').forEach(btn => {
          btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) editBookmark(card.dataset.id); });
        });
        document.querySelectorAll('.delete-action').forEach(btn => {
          btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) deleteBookmark(card.dataset.id); });
        });
      }

      function resetFormUI() {
        form.reset();
        editIdInp.value = '';
        isEditing = false;
        formTitleSpan.innerHTML = '✨ Create new bookmark';
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> <span>Save Bookmark</span>';
        cancelBtn.classList.add('hidden');
        urlInp.classList.remove('border-red-500');
      }

      function editBookmark(id) {
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) return;
        titleInp.value = bm.title;
        urlInp.value = bm.url;
        catInp.value = bm.category;
        descInp.value = bm.description || '';
        editIdInp.value = bm.id;
        isEditing = true;
        formTitleSpan.innerHTML = '✏️ Edit bookmark';
        submitBtn.innerHTML = '<i class="fas fa-pen-fancy"></i> <span>Update Changes</span>';
        cancelBtn.classList.remove('hidden');
        document.querySelector('.card-glass').scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInp.focus();
      }

      function deleteBookmark(id) {
        const index = bookmarks.findIndex(b => b.id === id);
        if (index === -1) return;
        lastDeletedItem = bookmarks[index];
        bookmarks.splice(index, 1);
        saveToLocal();
        renderBookmarks();
        showToast('🗑️ Bookmark deleted', 'info', () => {
          if (lastDeletedItem) {
            bookmarks.push(lastDeletedItem);
            saveToLocal();
            renderBookmarks();
            showToast('↩️ Restored successfully', 'success');
            lastDeletedItem = null;
          }
        });
      }

      function addOrUpdate(e) {
        e.preventDefault();
        const title = titleInp.value.trim();
        let url = urlInp.value.trim();
        const category = catInp.value;
        const description = descInp.value.trim();
        if (!title || !url) { showToast('Title & URL are required', 'error'); return; }
        if (!isValidUrl(url)) { urlInp.classList.add('border-red-500'); showToast('Please enter a valid URL (https://...)', 'error'); return; }
        urlInp.classList.remove('border-red-500');

        if (isEditing && editIdInp.value) {
          const idx = bookmarks.findIndex(b => b.id === editIdInp.value);
          if (idx !== -1) {
            bookmarks[idx] = { ...bookmarks[idx], title, url, category, description };
            saveToLocal();
            showToast('✏️ Bookmark updated', 'success');
            resetFormUI();
            renderBookmarks();
          }
        } else {
          const newBm = { id: Date.now() + '-' + Math.random().toString(36).substring(2, 10), title, url, category, description: description || '', createdAt: new Date().toISOString() };
          bookmarks.unshift(newBm);
          saveToLocal();
          showToast('✅ Bookmark added to vault', 'success');
          resetFormUI();
          renderBookmarks();
        }
        searchField.value = '';
        categoryFilter.value = 'all';
        renderBookmarks();
      }

      function cancelEdit() { resetFormUI(); }
      function exportData() {
        const dataStr = JSON.stringify(bookmarks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `bookmarks_backup_${new Date().toISOString().slice(0, 19)}.json`;
        a.click(); URL.revokeObjectURL(a.href);
        showToast('📦 Exported vault backup', 'success');
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
                bookmarks.push({ id: Date.now() + '-' + Math.random().toString(36).substr(2, 8), title: item.title, url: item.url, category: item.category || 'personal', description: item.description || '', createdAt: item.createdAt || new Date().toISOString() });
                added++;
              }
            });
            if (added) { saveToLocal(); renderBookmarks(); showToast(`📥 Imported ${added} new bookmarks`, 'success'); }
            else showToast('No new items (duplicates skipped)', 'info');
          } catch (e) { showToast('Invalid JSON file', 'error'); }
        };
        reader.readAsText(file);
      }
      function clearAll() {
        if (bookmarks.length === 0) return;
        if (confirm(`⚠️ PERMANENT: Delete ${bookmarks.length} bookmarks?`)) { bookmarks = []; saveToLocal(); renderBookmarks(); showToast('🧹 All bookmarks cleared', 'info'); }
      }

      // theme
      function setTheme(theme) {
        if (theme === 'dark') {
          document.body.classList.add('theme-dark'); document.body.classList.remove('theme-light');
          themeBtn.innerHTML = '<i class="fas fa-sun"></i>'; localStorage.setItem('vault_theme', 'dark');
        } else {
          document.body.classList.add('theme-light'); document.body.classList.remove('theme-dark');
          themeBtn.innerHTML = '<i class="fas fa-moon"></i>'; localStorage.setItem('vault_theme', 'light');
        }
      }
      function initTheme() { setTheme(localStorage.getItem('vault_theme') || 'light'); }

      // keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchField)) { e.preventDefault(); searchField.focus(); }
        if (e.key === 'Escape') searchField.blur();
      });

      function init() {
        loadFromLocal(); initTheme(); renderBookmarks();
        setTimeout(() => loader.classList.add('hide'), 500);
        form.addEventListener('submit', addOrUpdate);
        cancelBtn.addEventListener('click', cancelEdit);
        searchField.addEventListener('input', renderBookmarks);
        categoryFilter.addEventListener('change', renderBookmarks);
        fab.addEventListener('click', () => { resetFormUI(); document.querySelector('.card-glass').scrollIntoView({ behavior: 'smooth' }); titleInp.focus(); });
        exportBtn.addEventListener('click', exportData);
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); importFileInput.value = ''; });
        clearAllBtn.addEventListener('click', clearAll);
        themeBtn.addEventListener('click', () => setTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'));
      }
      init();
    })();
  </script></script>