<script>
    (function() {
      const loader = document.getElementById('loaderOverlay');
      const themeBtn = document.getElementById('themeSwitch');
      const form = document.getElementById('bookmarkForm');
      const titleInp = document.getElementById('title');
      const urlInp = document.getElementById('url');
      const catInp = document.getElementById('category');
      const priorityInp = document.getElementById('priority');
      const descInp = document.getElementById('description');
      const editIdInp = document.getElementById('editId');
      const cancelBtn = document.getElementById('cancelFormBtn');
      const submitBtn = document.getElementById('submitBtn');
      const formTitleSpan = document.getElementById('formTitle');
      const searchField = document.getElementById('searchField');
      const categoryFilter = document.getElementById('categoryFilter');
      const sortSelect = document.getElementById('sortBy');
      const bookmarksDiv = document.getElementById('bookmarksContainer');
      const fab = document.getElementById('fabAddBtn');
      const exportBtn = document.getElementById('exportDataBtn');
      const importBtn = document.getElementById('importDataBtn');
      const importFileInput = document.getElementById('importFile');
      const clearAllBtn = document.getElementById('clearEverythingBtn');
      const sampleBtn = document.getElementById('sampleDataBtn');
      const toastEl = document.getElementById('toastMsg');
      const toastTextSpan = document.getElementById('toastText');
      const toastIconSpan = document.getElementById('toastIcon');
      const undoBtn = document.getElementById('undoActionBtn');
      const statsModal = document.getElementById('statsModal');
      const statsModalBtn = document.getElementById('statsModalBtn');
      const closeModalBtn = document.getElementById('closeModalBtn');

      const statTotal = document.getElementById('statTotal');
      const statWork = document.getElementById('statWork');
      const statPersonal = document.getElementById('statPersonal');
      const statRecent = document.getElementById('statRecent');

      let bookmarks = [];
      let isEditing = false;
      let lastDeletedItem = null;

      function isValidUrl(str) { try { new URL(str); return true; } catch { return false; } }
      function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m] || m)); }

      function showToast(msg, type = 'success', withUndo = null) {
        toastTextSpan.innerText = msg;
        toastIconSpan.className = type === 'error' ? 'fas fa-exclamation-triangle text-red-500 text-xl' : 'fas fa-check-circle text-green-500 text-xl';
        toastEl.classList.add('show');
        if (withUndo && typeof withUndo === 'function') {
          undoBtn.classList.remove('hidden');
          undoBtn.onclick = () => { withUndo(); toastEl.classList.remove('show'); };
        } else { undoBtn.classList.add('hidden'); undoBtn.onclick = null; }
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
      }

      function saveToLocal() { localStorage.setItem('bookmark_vault_ultra', JSON.stringify(bookmarks)); }

      function loadFromLocal() {
        try {
          const stored = localStorage.getItem('bookmark_vault_ultra');
          bookmarks = stored ? JSON.parse(stored) : [];
          if (!Array.isArray(bookmarks)) bookmarks = [];
          bookmarks = bookmarks.map(b => ({ ...b, id: b.id || Date.now() + '-' + Math.random().toString(36).substr(2, 8), createdAt: b.createdAt || new Date().toISOString(), priority: b.priority || 'medium' }));
        } catch(e) { bookmarks = []; }
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

      function getSortedBookmarks(filtered) {
        const sortType = sortSelect.value;
        const arr = [...filtered];
        if (sortType === 'date') return arr.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (sortType === 'oldest') return arr.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
        if (sortType === 'title') return arr.sort((a,b) => a.title.localeCompare(b.title));
        if (sortType === 'priority') {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return arr.sort((a,b) => (priorityOrder[b.priority||'medium'] || 2) - (priorityOrder[a.priority||'medium'] || 2));
        }
        return arr;
      }

      function renderBookmarks() {
        const searchTerm = searchField.value.trim().toLowerCase();
        const catVal = categoryFilter.value;
        let filtered = bookmarks.filter(b => {
          const matchSearch = searchTerm === '' || b.title.toLowerCase().includes(searchTerm) || b.url.toLowerCase().includes(searchTerm) || (b.description && b.description.toLowerCase().includes(searchTerm));
          const matchCat = catVal === 'all' || b.category === catVal;
          return matchSearch && matchCat;
        });
        filtered = getSortedBookmarks(filtered);
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
          let priorityClass = '', priorityIcon = '';
          if (bm.priority === 'high') { priorityClass = 'priority-high'; priorityIcon = '🔴'; }
          else if (bm.priority === 'medium') { priorityClass = 'priority-medium'; priorityIcon = '🟡'; }
          else { priorityClass = 'priority-low'; priorityIcon = '🟢'; }
          const descHtml = bm.description ? `<p class="text-gray-500 dark:text-gray-400 text-sm mt-1.5 line-clamp-2 break-words">${escapeHtml(bm.description)}</p>` : '';
          html += `<div class="bookmark-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" data-id="${escapeHtml(bm.id)}">
              <div class="flex gap-4 flex-1 min-w-0">
                <div class="bookmark-favicon !w-12 !h-12 !rounded-xl flex-shrink-0"><i class="fa-regular fa-bookmark"></i></div>
                <div class="flex-1 min-w-0">
                  <a href="${escapeHtml(bm.url)}" target="_blank" rel="noopener" class="text-blue-700 dark:text-blue-400 font-extrabold text-lg hover:underline break-all">${escapeHtml(bm.title)}</a>
                  <div class="text-gray-500 dark:text-gray-400 text-sm truncate">${escapeHtml(bm.url)}</div>
                  ${descHtml}
                  <div class="mt-2 flex flex-wrap gap-2 items-center"><span class="chip-category ${chipClass}"><i class="fas fa-tag text-xs"></i> ${catDisplay}</span><span class="priority-badge ${priorityClass}"><i class="fas fa-flag"></i> ${priorityIcon} ${bm.priority.toUpperCase()}</span></div>
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
        document.querySelectorAll('.edit-action').forEach(btn => { btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) editBookmark(card.dataset.id); }); });
        document.querySelectorAll('.delete-action').forEach(btn => { btn.addEventListener('click', (e) => { const card = e.target.closest('[data-id]'); if (card) deleteBookmark(card.dataset.id); }); });
      }

      function resetFormUI() {
        form.reset();
        editIdInp.value = '';
        isEditing = false;
        formTitleSpan.innerHTML = '✨ Create new bookmark';
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> <span>Save Bookmark</span>';
        cancelBtn.classList.add('hidden');
        urlInp.classList.remove('border-red-500');
        priorityInp.value = 'medium';
      }

      function editBookmark(id) {
        const bm = bookmarks.find(b => b.id === id);
        if (!bm) return;
        titleInp.value = bm.title;
        urlInp.value = bm.url;
        catInp.value = bm.category;
        priorityInp.value = bm.priority || 'medium';
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
        showToast('🗑️ Bookmark deleted', 'info', () => { if (lastDeletedItem) { bookmarks.push(lastDeletedItem); saveToLocal(); renderBookmarks(); showToast('↩️ Restored', 'success'); lastDeletedItem = null; } });
      }

      function addOrUpdate(e) {
        e.preventDefault();
        const title = titleInp.value.trim();
        let url = urlInp.value.trim();
        const category = catInp.value;
        const priority = priorityInp.value;
        const description = descInp.value.trim();
        if (!title || !url) { showToast('Title & URL required', 'error'); return; }
        if (!isValidUrl(url)) { urlInp.classList.add('border-red-500'); showToast('Valid URL needed (https://)', 'error'); return; }
        urlInp.classList.remove('border-red-500');
        if (isEditing && editIdInp.value) {
          const idx = bookmarks.findIndex(b => b.id === editIdInp.value);
          if (idx !== -1) { bookmarks[idx] = { ...bookmarks[idx], title, url, category, priority, description }; saveToLocal(); showToast('✏️ Updated', 'success'); resetFormUI(); renderBookmarks(); }
        } else {
          const newBm = { id: Date.now() + '-' + Math.random().toString(36).substring(2, 10), title, url, category, priority, description: description || '', createdAt: new Date().toISOString() };
          bookmarks.unshift(newBm);
          saveToLocal();
          showToast('✅ Added to vault', 'success');
          resetFormUI();
          renderBookmarks();
        }
        renderBookmarks();
      }

      function exportData() { const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`bookmarks_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href); showToast('Exported', 'success'); }
      function importData(file) { const reader = new FileReader(); reader.onload = (ev) => { try { const imported = JSON.parse(ev.target.result); if (!Array.isArray(imported)) throw new Error(); let added=0; imported.forEach(item => { if(item.url && item.title && !bookmarks.some(b=>b.url===item.url)) { bookmarks.push({ id:Date.now()+'-'+Math.random().toString(36).substr(2,8), title:item.title, url:item.url, category:item.category||'personal', priority:item.priority||'medium', description:item.description||'', createdAt:item.createdAt||new Date().toISOString() }); added++; } }); if(added) { saveToLocal(); renderBookmarks(); showToast(`Imported ${added} items`, 'success'); } else showToast('No new items', 'info'); } catch(e) { showToast('Invalid JSON', 'error'); } }; reader.readAsText(file); }
      function clearAll() { if(bookmarks.length===0) return; if(confirm(`Delete ${bookmarks.length} bookmarks permanently?`)) { bookmarks=[]; saveToLocal(); renderBookmarks(); showToast('All cleared', 'info'); } }
      function loadSamples() { const samples = [{ title:"GitHub", url:"https://github.com", category:"work", priority:"high", description:"Code hosting" },{ title:"YouTube", url:"https://youtube.com", category:"entertainment", priority:"medium", description:"Video platform" },{ title:"MDN Web Docs", url:"https://developer.mozilla.org", category:"learning", priority:"high", description:"Web dev docs" },{ title:"Pinterest", url:"https://pinterest.com", category:"personal", priority:"low", description:"Inspiration" }]; let added=0; samples.forEach(s=>{ if(!bookmarks.some(b=>b.url===s.url)) { bookmarks.push({ ...s, id:Date.now()+'-'+Math.random().toString(36).substr(2,8), createdAt:new Date().toISOString() }); added++; } }); if(added) { saveToLocal(); renderBookmarks(); showToast(`✨ Added ${added} demo bookmarks`, 'success'); } else showToast('Samples already exist', 'info'); }
      function showStatsModal() { const total=bookmarks.length; const high=bookmarks.filter(b=>b.priority==='high').length; const cats={work:0,personal:0,learning:0,entertainment:0}; bookmarks.forEach(b=>{if(cats[b.category]!==undefined) cats[b.category]++;}); document.getElementById('modalStatsContent').innerHTML=`<p><i class="fas fa-database"></i> Total: <strong>${total}</strong></p><p><i class="fas fa-flag"></i> High priority: <strong>${high}</strong></p><p><i class="fas fa-briefcase"></i> Work: ${cats.work}</p><p><i class="fas fa-heart"></i> Personal: ${cats.personal}</p><p><i class="fas fa-graduation-cap"></i> Learning: ${cats.learning}</p><p><i class="fas fa-gamepad"></i> Entertainment: ${cats.entertainment}</p>`; statsModal.classList.remove('hidden'); }
      function closeModal() { statsModal.classList.add('hidden'); }

      function setTheme(theme) { if(theme==='dark'){ document.body.classList.add('theme-dark'); document.body.classList.remove('theme-light'); themeBtn.innerHTML='<i class="fas fa-sun"></i>'; localStorage.setItem('vault_theme','dark'); } else { document.body.classList.add('theme-light'); document.body.classList.remove('theme-dark'); themeBtn.innerHTML='<i class="fas fa-moon"></i>'; localStorage.setItem('vault_theme','light'); } }
      function initTheme() { setTheme(localStorage.getItem('vault_theme') || 'light'); }

      document.addEventListener('keydown', (e) => { if((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== searchField)) { e.preventDefault(); searchField.focus(); } if(e.key === 'Escape') searchField.blur(); if(e.key === 'Escape' && statsModal.classList.contains('hidden')===false) closeModal(); });

      function init() { loadFromLocal(); initTheme(); renderBookmarks(); setTimeout(()=>loader.classList.add('hide'),400); form.addEventListener('submit',addOrUpdate); cancelBtn.addEventListener('click',resetFormUI); searchField.addEventListener('input',renderBookmarks); categoryFilter.addEventListener('change',renderBookmarks); sortSelect.addEventListener('change',renderBookmarks); fab.addEventListener('click',()=>{ resetFormUI(); document.querySelector('.card-glass').scrollIntoView({behavior:'smooth'}); titleInp.focus(); }); exportBtn.addEventListener('click',exportData); importBtn.addEventListener('click',()=>importFileInput.click()); importFileInput.addEventListener('change',(e)=>{ if(e.target.files[0]) importData(e.target.files[0]); importFileInput.value=''; }); clearAllBtn.addEventListener('click',clearAll); sampleBtn.addEventListener('click',loadSamples); themeBtn.addEventListener('click',()=>setTheme(document.body.classList.contains('theme-dark')?'light':'dark')); statsModalBtn.addEventListener('click',showStatsModal); closeModalBtn.addEventListener('click',closeModal); statsModal.addEventListener('click',(e)=>{if(e.target===statsModal) closeModal();}); }
      init();
    })();
  </script></script>