document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const bookmarkForm = document.getElementById("bookmarkForm");
  const titleInput = document.getElementById("title");
  const urlInput = document.getElementById("url");
  const bookmarkIdInput = document.getElementById("bookmarkId");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveBtn = document.getElementById("saveBtn");
  const bookmarksList = document.getElementById("bookmarksList");
  const searchInput = document.getElementById("searchInput");
  const emptyState = document.getElementById("emptyState");
  const themeToggle = document.getElementById("themeToggle");

  // State
  let isEditing = false;
  let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];

  // Initialize
  renderBookmarks();
  initTheme();

  // Event Listeners
  bookmarkForm.addEventListener("submit", saveBookmark);
  cancelBtn.addEventListener("click", cancelEdit);
  searchInput.addEventListener("input", filterBookmarks);
  themeToggle.addEventListener("click", toggleTheme);

  // Functions
  function saveBookmark(e) {
    e.preventDefault();

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const id = bookmarkIdInput.value;

    // Validate URL
    if (!isValidUrl(url)) {
      urlInput.classList.add("input-error");
      urlInput.focus();
      return;
    }

    const bookmark = { title, url };

    if (isEditing) {
      // Update existing bookmark
      const index = bookmarks.findIndex((b) => b.id === id);
      if (index !== -1) {
        bookmarks[index] = { ...bookmark, id };
      }
      isEditing = false;
    } else {
      // Add new bookmark
      bookmark.id = Date.now().toString();
      bookmarks.push(bookmark);
    }

    // Save to localStorage and reset form
    localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    bookmarkForm.reset();
    renderBookmarks();

    // Update UI
    saveBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Add Bookmark';
    cancelBtn.classList.add("hidden");
    urlInput.classList.remove("input-error");
  }

  function renderBookmarks(filter = "") {
    if (bookmarks.length === 0) {
      emptyState.classList.remove("hidden");
      bookmarksList.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    let filteredBookmarks = bookmarks;
    if (filter) {
      const searchTerm = filter.toLowerCase();
      filteredBookmarks = bookmarks.filter(
        (bookmark) =>
          bookmark.title.toLowerCase().includes(searchTerm) ||
          bookmark.url.toLowerCase().includes(searchTerm)
      );
    }

    if (filteredBookmarks.length === 0) {
      bookmarksList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search text-4xl mb-3 text-gray-300"></i>
          <p>No bookmarks found matching "${filter}"</p>
        </div>
      `;
      return;
    }

    bookmarksList.innerHTML = filteredBookmarks
      .map(
        (bookmark) => `
      <div class="bookmark-item bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex justify-between items-center" data-id="${bookmark.id}">
        <div class="flex items-center overflow-hidden">
          <div class="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg mr-4">
            <i class="fas fa-bookmark text-blue-500 dark:text-blue-300"></i>
          </div>
          <div class="truncate">
            <a href="${bookmark.url}" target="_blank" class="text-blue-500 hover:underline font-medium block truncate">${bookmark.title}</a>
            <span class="text-gray-500 text-sm block truncate">${bookmark.url}</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="edit-btn p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-lg">
            <i class="fas fa-edit"></i>
          </button>
          <button class="delete-btn p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-lg">
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
    bookmarkIdInput.value = bookmark.id;

    // Update UI for editing
    isEditing = true;
    saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Save Changes';
    cancelBtn.classList.remove("hidden");
    titleInput.focus();
  }

  function deleteBookmark(id) {
    if (confirm("Are you sure you want to delete this bookmark?")) {
      bookmarks = bookmarks.filter((bookmark) => bookmark.id !== id);
      localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
      renderBookmarks();
    }
  }

  function cancelEdit() {
    bookmarkForm.reset();
    isEditing = false;
    saveBtn.innerHTML = '<i class="fas fa-plus mr-2"></i> Add Bookmark';
    cancelBtn.classList.add("hidden");
  }

  function filterBookmarks() {
    renderBookmarks(searchInput.value.trim());
  }

  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Theme functions
  function toggleTheme() {
    document.body.classList.toggle("dark");

    const icon = themeToggle.querySelector("i");
    if (document.body.classList.contains("dark")) {
      icon.classList.remove("fa-sun");
      icon.classList.add("fa-moon");
      localStorage.setItem("theme", "dark");
    } else {
      icon.classList.remove("fa-moon");
      icon.classList.add("fa-sun");
      localStorage.setItem("theme", "light");
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.body.classList.add(savedTheme);

    const icon = themeToggle.querySelector("i");
    if (savedTheme === "dark") {
      icon.classList.add("fa-moon");
      icon.classList.remove("fa-sun");
    } else {
      icon.classList.add("fa-sun");
      icon.classList.remove("fa-moon");
    }
  }
});
