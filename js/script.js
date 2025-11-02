<script>
      document.addEventListener("DOMContentLoaded", function () {
        // DOM Elements
        const body = document.body;
        const themeToggle = document.getElementById("themeToggle");
        const bookmarkForm = document.getElementById("bookmarkForm");
        const titleInput = document.getElementById("title");
        const urlInput = document.getElementById("url");
        const categoryInput = document.getElementById("category");
        const descriptionInput = document.getElementById("description");
        const bookmarkIdInput = document.getElementById("bookmarkId");
        const cancelBtn = document.getElementById("cancelBtn");
        const saveBtn = document.getElementById("saveBtn");
        const bookmarksList = document.getElementById("bookmarksList");
        const searchInput = document.getElementById("searchInput");
        const categoryFilter = document.getElementById("categoryFilter");
        const emptyState = document.getElementById("emptyState");
        const addBookmarkBtn = document.getElementById("addBookmarkBtn");
        const toast = document.getElementById("toast");
        const toastMessage = document.getElementById("toastMessage");
        
        // Stats elements
        const totalBookmarksEl = document.getElementById("totalBookmarks");
        const workBookmarksEl = document.getElementById("workBookmarks");
        const personalBookmarksEl = document.getElementById("personalBookmarks");
        const recentBookmarksEl = document.getElementById("recentBookmarks");

        // State
        let isEditing = false;
        let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];

        // Initialize
        renderBookmarks();
        initTheme();
        updateStats();

        // Event Listeners
        themeToggle.addEventListener("click", toggleTheme);
        bookmarkForm.addEventListener("submit", saveBookmark);
        cancelBtn.addEventListener("click", cancelEdit);
        searchInput.addEventListener("input", filterBookmarks);
        categoryFilter.addEventListener("change", filterBookmarks);
        addBookmarkBtn.addEventListener("click", scrollToForm);

        // Theme Functions
        function toggleTheme() {
          if (body.classList.contains("theme-light")) {
            body.classList.replace("theme-light", "theme-dark");
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            localStorage.setItem("theme", "dark");
          } else {
            body.classList.replace("theme-dark", "theme-light");
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            localStorage.setItem("theme", "light");
          }
        }

        function initTheme() {
          const savedTheme = localStorage.getItem("theme") || "light";

          if (savedTheme === "dark") {
            body.classList.replace("theme-light", "theme-dark");
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
          } else {
            body.classList.replace("theme-dark", "theme-light");
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
          }
        }

        // Bookmark Functions
        function saveBookmark(e) {
          e.preventDefault();

          const title = titleInput.value.trim();
          const url = urlInput.value.trim();
          const category = categoryInput.value;
          const description = descriptionInput.value.trim();
          const id = bookmarkIdInput.value;

          // Validate URL
          if (!isValidUrl(url)) {
            urlInput.classList.add("border-red-500");
            urlInput.focus();
            showToast("Please enter a valid URL", "error");
            return;
          }

          const bookmark = { title, url, category, description };

          if (isEditing) {
            // Update existing bookmark
            const index = bookmarks.findIndex((b) => b.id === id);
            if (index !== -1) {
              bookmark.id = id;
              bookmark.createdAt = bookmarks[index].createdAt;
              bookmarks[index] = bookmark;
            }
            isEditing = false;
            showToast("Bookmark updated successfully", "success");
          } else {
            // Add new bookmark
            bookmark.id = Date.now().toString();
            bookmark.createdAt = new Date().toISOString();
            bookmarks.push(bookmark);
            showToast("Bookmark added successfully", "success");
          }

          // Save to localStorage and reset form
          localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
          bookmarkForm.reset();
          renderBookmarks();
          updateStats();

          // Update UI
          saveBtn.innerHTML =
            '<i class="fas fa-plus mr-2"></i><span class="hidden sm:inline">Add Bookmark</span><span class="sm:hidden">Add</span>';
          cancelBtn.classList.add("hidden");
          urlInput.classList.remove("border-red-500");
        }

        function renderBookmarks() {
          const searchTerm = searchInput.value.trim().toLowerCase();
          const categoryFilterValue = categoryFilter.value;

          if (bookmarks.length === 0) {
            emptyState.classList.remove("hidden");
            bookmarksList.innerHTML = "";
            bookmarksList.appendChild(emptyState);
            return;
          }

          emptyState.classList.add("hidden");

          let filteredBookmarks = bookmarks;
          
          // Apply search filter
          if (searchTerm) {
            filteredBookmarks = filteredBookmarks.filter(
              (bookmark) =>
                bookmark.title.toLowerCase().includes(searchTerm) ||
                bookmark.url.toLowerCase().includes(searchTerm) ||
                (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm))
            );
          }
          
          // Apply category filter
          if (categoryFilterValue !== "all") {
            filteredBookmarks = filteredBookmarks.filter(
              (bookmark) => bookmark.category === categoryFilterValue
            );
          }

          if (filteredBookmarks.length === 0) {
            bookmarksList.innerHTML = `
              <div class="text-center py-12 text-gray-500">
                <i class="fas fa-search text-5xl mb-4 text-gray-300"></i>
                <p class="text-lg">No bookmarks found matching your criteria</p>
              </div>
            `;
            return;
          }

          // Sort by creation date (newest first)
          filteredBookmarks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          bookmarksList.innerHTML = filteredBookmarks
            .map(
              (bookmark) => `
                <div class="bookmark-item card rounded-lg p-4 flex justify-between items-center fade-in" data-id="${bookmark.id}">
                  <div class="flex items-center overflow-hidden flex-1">
                    <div class="bookmark-icon mr-4 flex-shrink-0">
                      <i class="fas fa-bookmark"></i>
                    </div>
                    <div class="truncate flex-1">
                      <a href="${bookmark.url}" target="_blank" class="text-blue-500 hover:underline font-medium block truncate">${bookmark.title}</a>
                      <span class="text-gray-500 dark:text-gray-400 text-sm block truncate">${bookmark.url}</span>
                      ${bookmark.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mt-1">${bookmark.description}</p>` : ''}
                      <div class="mt-2">
                        <span class="category-tag category-${bookmark.category}">${bookmark.category.charAt(0).toUpperCase() + bookmark.category.slice(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div class="bookmark-actions flex gap-2 ml-4">
                    <button class="edit-btn p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-lg transition" title="Edit bookmark">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-lg transition" title="Delete bookmark">
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              `
            )
            .join("");

          // Add event listeners to edit and delete buttons
          document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const bookmarkId = e.target.closest(".bookmark-item").dataset.id;
              editBookmark(bookmarkId);
            });
          });

          document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              const bookmarkId = e.target.closest(".bookmark-item").dataset.id;
              deleteBookmark(bookmarkId);
            });
          });
        }

        function editBookmark(id) {
          const bookmark = bookmarks.find((b) => b.id === id);
          if (!bookmark) return;

          titleInput.value = bookmark.title;
          urlInput.value = bookmark.url;
          categoryInput.value = bookmark.category;
          descriptionInput.value = bookmark.description || '';
          bookmarkIdInput.value = bookmark.id;

          // Update UI for editing
          isEditing = true;
          saveBtn.innerHTML =
            '<i class="fas fa-save mr-2"></i><span class="hidden sm:inline">Save Changes</span><span class="sm:hidden">Save</span>';
          cancelBtn.classList.remove("hidden");
          titleInput.focus();
          
          // Scroll to form
          scrollToForm();
        }

        function deleteBookmark(id) {
          if (confirm("Are you sure you want to delete this bookmark?")) {
            bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
            localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
            renderBookmarks();
            updateStats();
            showToast("Bookmark deleted successfully", "info");
          }
        }

        function cancelEdit() {
          bookmarkForm.reset();
          isEditing = false;
          saveBtn.innerHTML =
            '<i class="fas fa-plus mr-2"></i><span class="hidden sm:inline">Add Bookmark</span><span class="sm:hidden">Add</span>';
          cancelBtn.classList.add("hidden");
        }

        function filterBookmarks() {
          renderBookmarks();
        }

        function isValidUrl(url) {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        }

        function scrollToForm() {
          document.querySelector('#bookmarkForm').scrollIntoView({ 
            behavior: 'smooth' 
          });
        }

        function showToast(message, type = "success") {
          toastMessage.textContent = message;
          toast.className = "toast";
          toast.classList.add(type, "show");
          
          setTimeout(() => {
            toast.classList.remove("show");
          }, 3000);
        }

        function updateStats() {
          const total = bookmarks.length;
          const work = bookmarks.filter(b => b.category === "work").length;
          const personal = bookmarks.filter(b => b.category === "personal").length;
          
          // Count bookmarks added in the last 7 days
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const recent = bookmarks.filter(b => new Date(b.createdAt) > oneWeekAgo).length;
          
          totalBookmarksEl.textContent = total;
          workBookmarksEl.textContent = work;
          personalBookmarksEl.textContent = personal;
          recentBookmarksEl.textContent = recent;
        }
      });
    </script>