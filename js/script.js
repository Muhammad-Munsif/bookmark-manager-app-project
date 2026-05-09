
    (function () {
      "use strict";

      // ========== DOM elements ==========
      const body = document.body;
      const themeToggle = document.getElementById('themeToggle');
      const bookmarkForm = document.getElementById('bookmarkForm');
      const titleInput = document.getElementById('title');
      const urlInput = document.getElementById('url');
      const categoryInput = document.getElementById('category');
      const descriptionInput = document.getElementById('description');
      const bookmarkIdInput = document.getElementById('bookmarkId');
      const cancelBtn = document.getElementById('cancelBtn');
      const saveBtn = document.getElementById('saveBtn');
      const bookmarksList = document.getElementById('bookmarksList');
      const searchInput = document.getElementById('searchInput');
      const categoryFilter = document.getElementById('categoryFilter');
      const addBookmarkBtn = document.getElementById('addBookmarkBtn');
      const toast = document.getElementById('toast');
      const toastMessage = document.getElementById('toastMessage');
      const toastIcon = document.getElementById('toastIcon');
      const toastUndoBtn = document.getElementById('toastUndoBtn');
      const formHeading = document.getElementById('formHeading');
      const loadingOverlay = document.getElementById('loadingOverlay');
      const exportBtn = document.getElementById('exportBtn');
      const importBtn = document.getElementById('importBtn');
      const importFileInput = document.getElementById('importFileInput');
      const clearAllBtn = document.getElementById('clearAllBtn');

      // Stats
      const totalEl = document.getElementById('totalBookmarks');
      const workEl = document.getElementById('workBookmarks');
      const personalEl = document.getElementById('personalBookmarks');
      const recentEl = document.getElementById('recentBookmarks');

      let bookmarks = [];
      let isEditing = false;
      let lastDeleted = null; // for undo

      // ========== localStorage ==========
      function loadBookmarks() {
        try {
          const stored = localStorage.getItem('bm_advanced');
          bookmarks = stored ? JSON.parse(stored) : [];
          bookmarks = bookmarks.map(b => ({
            id: b.id || Date.now() + '-' + Math.random().toString(36).substring(2, 8),
            title: b.title || 'Untitled',
            url: b.url || '',
            category: b.category || 'personal',
            description: b.description || '',
            createdAt: b.createdAt || new Date().toISOString()
          }));
        } catch { bookmarks = []; }
      }

      function saveToStorage() {
        localStorage.setItem('bm_advanced', JSON.stringify(bookmarks));
      }

      // ========== theme ==========
      function initTheme() {
        const stored = localStorage.getItem('theme_advanced') || 'light';
        if (stored === 'dark') {
          body.classList.remove('theme-light');
          body.classList.add('theme-dark');
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
          body.classList.remove('theme-dark');
          body.classList.add('theme-light');
          themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
      }

      function toggleTheme() {
        if (body.classList.contains('theme-light')) {
          body.classList.replace('theme-light', 'theme-dark');
          themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
          localStorage.setItem('theme_advanced', 'dark');
        } else {
          body.classList.replace('theme-dark', 'theme-light');
          themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
          localStorage.setItem('theme_advanced', 'light');
        }
      }

      // ========== helpers ==========
      function isValidUrl(str) {
        try { new URL(str); return true; } catch { return false; }
      }

      function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"]/g, c => {
          if (c === '&') return '&amp;';
          if (c === '<') return '&lt;';
          if (c === '>') return '&gt;';
          if (c === '"') return '&quot;';
          return c;
        });
      }

      function showToast(msg, type = 'success', undoCallback = null) {
        toastMessage.textContent = msg;
        toast.className = 'toast';
        toast.classList.add(type, 'show');
        toastIcon.className = type === 'error' ? 'fas fa-exclamation-circle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
        if (undoCallback) {
          toastUndoBtn.classList.remove('hidden');
          toastUndoBtn.onclick = () => {
            undoCallback();
            toast.classList.remove('show');
          };
        } else {
          toastUndoBtn.classList.add('hidden');
          toastUndoBtn.onclick = null;
        }
        // auto hide after 4s
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => toast.classList.remove('show'), 4000);
      }

      // ========== render ==========
      function renderBookmarks() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const catFilter = categoryFilter.value;

        let filtered = bookmarks.filter(b => {
          const matchSearch = searchTerm === '' ||
            b.title.toLowerCase().includes(searchTerm) ||
            b.url.toLowerCase().includes(searchTerm) ||
            (b.description && b.description.toLowerCase().includes(searchTerm));
          const matchCat = catFilter === 'all' || b.category === catFilter;
          return matchSearch && matchCat;
        });

        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        updateStats();

        if (filtered.length === 0) {
          if (bookmarks.length === 0) {
            bookmarksList.innerHTML = `
              <div class="empty-illustration text-center py-16 text-gray-400 flex flex-col items-center">
                <i class="fas fa-book-open text-7xl mb-5 opacity-40"></i>
                <p class="text-xl font-medium">No bookmarks yet</p>
                <p class="text-sm mt-2">Add one using the form or the + button</p>
              </div>`;
          } else {
            bookmarksList.innerHTML = `
              <div class="text-center py-20 text-gray-500 flex flex-col items-center">
                <i class="fas fa-search text-6xl mb-4 opacity-30"></i>
                <p class="text-xl font-medium">No matches</p>
                <p class="text-sm mt-2">Try another filter</p>
              </div>`;
          }
          return;
        }

        let html = '';
        filtered.forEach(bm => {
          const catClass = `category-tag category-${bm.category}`;
          const catDisplay = bm.category.charAt(0).toUpperCase() + bm.category.slice(1);
          const descHtml = bm.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mt-2 line-clamp-2">${escapeHTML(bm.description)}</p>` : '';

          html += `
            <div class="bookmark-item p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start gap-3" data-id="${escapeHTML(bm.id)}">
              <div class="flex items-start gap-4 min-w-0 flex-1 w-full">
                <div class="bookmark-icon shadow-md flex-shrink-0">
                  <i class="fas fa-bookmark"></i>
                </div>
                <div class="truncate flex-1">
                  <a href="${escapeHTML(bm.url)}" target="_blank" rel="noopener" class="text-blue-700 dark:text-blue-400 hover:underline font-bold block truncate text-lg">${escapeHTML(bm.title)}</a>
                  <span class="text-gray-500 dark:text-gray-400 text-sm block truncate">${escapeHTML(bm.url)}</span>
                  ${descHtml}
                  <div class="mt-3 flex flex-wrap">
                    <span class="${catClass}">${catDisplay}</span>
                  </div>
                </div>
              </div>
              <div class="bookmark-actions flex gap-2 self-end sm:self-start w-full sm:w-auto justify-end">
                <button class="edit-btn p-3 text-blue-600 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-2xl transition-all active:bg-blue-200" title="Edit">
                  <i class="fas fa-edit text-xl"></i>
                </button>
                <button class="delete-btn p-3 text-red-500 hover:bg-red-100 dark:hover:bg-gray-700 rounded-2xl transition-all active:bg-red-200" title="Delete">
                  <i class="fas fa-trash-alt text-xl"></i>
                </button>
              </div>
            </div>`;
        });

        bookmarksList.innerHTML = html;

        // event delegation for edit/delete
        document.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            const item = e.target.closest('.bookmark-item');
            if (item?.dataset.id) editBookmark(item.dataset.id);
          });
        });
        document.querySelectorAll('.delete-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            const item = e.target.closest('.bookmark-item');
            if (item?.dataset.id) deleteBookmark(item.dataset.id);
          });
        });
      }

      // ========== CRUD ==========
      function saveBookmark(e) {
        e.preventDefault();
        const title = titleInput.value.trim();
        const url = urlInput.value.trim();
        const category = categoryInput.value;
        const description = descriptionInput.value.trim();
        const id = bookmarkIdInput.value;

        if (!title || !url) {
          showToast('Title and URL are required', 'error');
          return;
        }
        if (!isValidUrl(url)) {
          urlInput.classList.add('border-red-500', 'ring-red-200');
          showToast('Enter a valid URL (include https://)', 'error');
          urlInput.focus();
          return;
        }
        urlInput.classList.remove('border-red-500', 'ring-red-200');

        if (isEditing && id) {
          const index = bookmarks.findIndex(b => b.id === id);
          if (index > -1) {
            bookmarks[index] = { ...bookmarks[index], title, url, category, description };
          }
          showToast('Bookmark updated', 'success');
          resetFormState();
        } else {
          const newBm = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 8),
            title, url, category, description: description || '',
            createdAt: new Date().toISOString()
          };
          bookmarks.push(newBm);
          showToast('Bookmark added', 'success');
        }

        saveToStorage();
        bookmarkForm.reset();
        bookmarkIdInput.value = '';
        renderBookmarks();
        resetFormState();
      }

      function resetFormState() {
        isEditing = false;
        formHeading.innerText = '✨ Add new bookmark';
        saveBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> <span>Add</span>';
        cancelBtn.classList.add('hidden');
        urlInput.classList.remove('border-red-500');
      }

      function editBookmark(id) {
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) return;
        titleInput.value = bm.title;
        urlInput.value = bm.url;
        categoryInput.value = bm.category || 'personal';
        descriptionInput.value = bm.description || '';
        bookmarkIdInput.value = bm.id;

        isEditing = true;
        formHeading.innerText = '✏️ Edit bookmark';
        saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i> <span>Save changes</span>';
        cancelBtn.classList.remove('hidden');
        document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
        titleInput.focus();
      }

      function deleteBookmark(id) {
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) return;
        // save last deleted for undo
        lastDeleted = bm;
        bookmarks = bookmarks.filter(b => b.id !== id);
        saveToStorage();
        renderBookmarks();
        showToast('Bookmark deleted', 'info', () => {
          // undo: reinsert at the same position (sort by creation time won't be exact but okay)
          bookmarks.push(lastDeleted);
          saveToStorage();
          renderBookmarks();
          showToast('Undo successful', 'success');
          lastDeleted = null;
        });
      }

      function cancelEdit() {
        bookmarkForm.reset();
        resetFormState();
        bookmarkIdInput.value = '';
      }

      // ========== stats ==========
      function updateStats() {
        const total = bookmarks.length;
        const work = bookmarks.filter(b => b.category === 'work').length;
        const personal = bookmarks.filter(b => b.category === 'personal').length;
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recent = bookmarks.filter(b => new Date(b.createdAt) >= weekAgo).length;
        totalEl.textContent = total;
        workEl.textContent = work;
        personalEl.textContent = personal;
        recentEl.textContent = recent;
      }

      // ========== import / export / clear ==========
      function exportBookmarks() {
        const dataStr = JSON.stringify(bookmarks, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookmarks_hub_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Exported successfully', 'success');
      }

      function importBookmarks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('Invalid format');
            // merge imported bookmarks (avoid duplicates by URL? simple push)
            let added = 0;
            imported.forEach(bm => {
              if (bm.url && bm.title) {
                // optional: skip if url already exists
                if (!bookmarks.some(b => b.url === bm.url)) {
                  bookmarks.push({
                    id: Date.now() + '-' + Math.random().toString(36).substring(2, 8),
                    title: bm.title,
                    url: bm.url,
                    category: bm.category || 'personal',
                    description: bm.description || '',
                    createdAt: bm.createdAt || new Date().toISOString()
                  });
                  added++;
                }
              }
            });
            saveToStorage();
            renderBookmarks();
            showToast(`Imported ${added} new bookmarks`, 'success');
          } catch (err) {
            showToast('Invalid JSON file', 'error');
          }
        };
        reader.readAsText(file);
      }

      function clearAllBookmarks() {
        if (bookmarks.length === 0) return;
        if (window.confirm(`Delete all ${bookmarks.length} bookmarks? This cannot be undone.`)) {
          bookmarks = [];
          saveToStorage();
          renderBookmarks();
          showToast('All bookmarks cleared', 'info');
        }
      }

      // ========== keyboard shortcuts ==========
      function handleKeyboard(e) {
        // Ctrl+K or '/' to focus search
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.ctrlKey && document.activeElement !== searchInput)) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        // Escape to blur search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
          searchInput.blur();
        }
      }

      // ========== loading spinner ==========
      function showLoader() {
        loadingOverlay.classList.remove('hidden');
      }
      function hideLoader() {
        loadingOverlay.classList.add('hidden');
      }

      // ========== init ==========
      function init() {
        showLoader();

        loadBookmarks();
        initTheme();
        renderBookmarks();

        // simulate initial loading (remove after 600ms)
        setTimeout(hideLoader, 600);

        themeToggle.addEventListener('click', toggleTheme);
        bookmarkForm.addEventListener('submit', saveBookmark);
        cancelBtn.addEventListener('click', cancelEdit);
        searchInput.addEventListener('input', renderBookmarks);
        categoryFilter.addEventListener('change', renderBookmarks);
        addBookmarkBtn.addEventListener('click', () => {
          document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
          titleInput.focus();
        });

        urlInput.addEventListener('focus', () => urlInput.classList.remove('border-red-500'));

        exportBtn.addEventListener('click', exportBookmarks);
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', (e) => {
          if (e.target.files[0]) importBookmarks(e.target.files[0]);
          importFileInput.value = '';
        });
        clearAllBtn.addEventListener('click', clearAllBookmarks);

        document.addEventListener('keydown', handleKeyboard);
      }

      init();
    })();
  