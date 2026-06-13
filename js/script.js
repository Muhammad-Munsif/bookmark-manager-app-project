// Updated frontend script with backend integration
// js/script.js

// API Configuration
const API_BASE_URL = 'http://localhost:8000/api';
let authToken = localStorage.getItem('auth_token');

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const url = `${API_BASE_URL}${endpoint}`;
    let fullUrl = url;
    
    // Add token as query param for GET requests (simpler for demo)
    if (method === 'GET' && authToken) {
        const separator = url.includes('?') ? '&' : '?';
        fullUrl = `${url}${separator}token=${authToken}`;
    }
    
    const config = {
        method,
        headers,
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
        if (method === 'POST') {
            fullUrl = `${url}?token=${authToken}`;
        } else if (method === 'PUT') {
            fullUrl = `${url}?token=${authToken}`;
        }
    }
    
    const response = await fetch(fullUrl, config);
    const result = await response.json();
    
    if (!response.ok) {
        throw new Error(result.detail || 'API request failed');
    }
    
    return result;
}

// Authentication Functions
async function register(username, password, email = '') {
    const result = await apiRequest('/auth/register', 'POST', { username, password, email });
    if (result.access_token) {
        authToken = result.access_token;
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('current_user', JSON.stringify(result.user));
    }
    return result;
}

async function login(username, password) {
    const result = await apiRequest('/auth/login', 'POST', { username, password });
    if (result.access_token) {
        authToken = result.access_token;
        localStorage.setItem('auth_token', authToken);
        localStorage.setItem('current_user', JSON.stringify(result.user));
    }
    return result;
}

function logout() {
    authToken = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    location.reload();
}

// Bookmark Functions
async function fetchBookmarks(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const endpoint = `/bookmarks${params ? `?${params}` : ''}`;
    const result = await apiRequest(endpoint, 'GET');
    return result.bookmarks || [];
}

async function createBookmark(bookmark) {
    return await apiRequest('/bookmarks', 'POST', bookmark);
}

async function updateBookmark(id, bookmark) {
    return await apiRequest(`/bookmarks/${id}`, 'PUT', bookmark);
}

async function deleteBookmark(id) {
    return await apiRequest(`/bookmarks/${id}`, 'DELETE');
}

async function getStats() {
    return await apiRequest('/bookmarks/stats', 'GET');
}

// Update existing UI functions to use backend
// Replace the existing CRUD functions with these