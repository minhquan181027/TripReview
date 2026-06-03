// ============================================
// TripGo - API Module
// ============================================

const BASE_URL = 'http://localhost:5000/api';

// Helper: lấy token
const getToken = () => localStorage.getItem('tripgo_token');

// Helper: gọi API có auth — tự xử lý khi token hết hạn
const authFetch = async (url, options = {}) => {
    const token = getToken();
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    // Token hết hạn → xóa session + redirect login
    if (res.status === 401) {
        const data = await res.clone().json().catch(() => ({}));
        const msg  = (data.message || '').toLowerCase();
        if (msg.includes('hết hạn') || msg.includes('không hợp lệ') || msg.includes('expired') || msg.includes('invalid')) {
            Auth.logout();
            showToast('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'error');
            setTimeout(() => { window.location.href = 'auth.html'; }, 1600);
        }
    }

    return res;
};

// ============================================
// AUTH
// ============================================
const API = {
    // Đăng ký
    register: async ({ fullname, email, password }) => {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullname, email, password })
        });
        return res.json();
    },

    // Đăng nhập
    login: async ({ email, password }) => {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return res.json();
    },

    // Lấy thông tin user hiện tại
    getMe: async () => {
        const res = await authFetch(`${BASE_URL}/auth/me`);
        return res.json();
    },

    // ============================================
    // PLACES
    // ============================================
    getFeaturedPlaces: async () => {
        const res = await fetch(`${BASE_URL}/places/featured`);
        return res.json();
    },

    getAllPlaces: async (params = {}) => {
        const { search = '', page = 1, limit = 8 } = params;
        const url = `${BASE_URL}/places?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`;
        const res = await fetch(url);
        return res.json();
    },

    getPlaceById: async (id) => {
        const res = await fetch(`${BASE_URL}/places/${id}`);
        return res.json();
    },

    // ============================================
    // REVIEWS
    // ============================================
    getLatestReviews: async () => {
        const res = await fetch(`${BASE_URL}/reviews/latest`);
        return res.json();
    },

    getReviewsByPlace: async (placeId) => {
        const res = await fetch(`${BASE_URL}/reviews/place/${placeId}`);
        return res.json();
    },

    getMyReviews: async () => {
        const res = await authFetch(`${BASE_URL}/reviews/my`);
        return res.json();
    },

    addReview: async ({ place_id, rating, comment }) => {
        const res = await authFetch(`${BASE_URL}/reviews`, {
            method: 'POST',
            body: JSON.stringify({ place_id, rating, comment })
        });
        return res.json();
    },

    deleteReview: async (reviewId) => {
        const res = await authFetch(`${BASE_URL}/reviews/${reviewId}`, {
            method: 'DELETE'
        });
        return res.json();
    },

    // ============================================
    // COMMUNITY POSTS
    // ============================================
    getFeed: async (page = 1) => {
        const res = await authFetch(`${BASE_URL}/posts?page=${page}&limit=10`);
        return res.json();
    },

    createPost: async ({ content, image_url, place_id }) => {
        const res = await authFetch(`${BASE_URL}/posts`, {
            method: 'POST',
            body: JSON.stringify({ content, image_url: image_url || null, place_id: place_id || null })
        });
        return res.json();
    },

    deletePost: async (postId) => {
        const res = await authFetch(`${BASE_URL}/posts/${postId}`, { method: 'DELETE' });
        return res.json();
    },

    toggleLike: async (postId) => {
        const res = await authFetch(`${BASE_URL}/posts/${postId}/like`, { method: 'POST' });
        return res.json();
    },

    getComments: async (postId) => {
        const res = await authFetch(`${BASE_URL}/posts/${postId}/comments`);
        return res.json();
    },

    addComment: async (postId, content) => {
        const res = await authFetch(`${BASE_URL}/posts/${postId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        return res.json();
    },

    deleteComment: async (postId, commentId) => {
        const res = await authFetch(`${BASE_URL}/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
        return res.json();
    }
};

// ============================================
// AUTH HELPERS
// ============================================
const Auth = {
    isLoggedIn: () => !!localStorage.getItem('tripgo_token'),

    getUser: () => {
        try {
            return JSON.parse(localStorage.getItem('tripgo_user') || 'null');
        } catch { return null; }
    },

    saveSession: ({ token, user }) => {
        localStorage.setItem('tripgo_token', token);
        localStorage.setItem('tripgo_user', JSON.stringify(user));
    },

    logout: () => {
        localStorage.removeItem('tripgo_token');
        localStorage.removeItem('tripgo_user');
    }
};

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container') || (() => {
        const el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
        return el;
    })();

    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark';
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${msg}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// ============================================
// RENDER HELPERS
// ============================================
function renderStars(rating, interactive = false) {
    const r = Math.round(rating);
    if (interactive) {
        return Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < r ? 'solid' : 'regular'} fa-star ${i < r ? 'active' : ''}" data-star="${i + 1}"></i>`
        ).join('');
    }
    return Array.from({ length: 5 }, (_, i) =>
        `<i class="fa-${i < r ? 'solid' : 'regular'} fa-star"></i>`
    ).join('');
}

function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần trước`;
    return `${Math.floor(diff / 2592000)} tháng trước`;
}

function skeletonCards(count = 4) {
    return Array.from({ length: count }, () => `
        <div class="skeleton-card">
            <div class="skeleton skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton skeleton-line" style="width:75%"></div>
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line shorter"></div>
            </div>
        </div>
    `).join('');
}

// ============================================
// NAVBAR - khởi tạo user state
// ============================================
function initNavbar() {
    const user = Auth.getUser();
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    if (user) {
        navActions.innerHTML = `
            <div class="user-menu">
                <img src="${user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullname)}&background=1a6ef5&color=fff`}" 
                     class="nav-avatar" alt="${user.fullname}" title="${user.fullname}">
                <div class="user-dropdown">
                    <div class="dropdown-user">
                        <div class="name">${user.fullname}</div>
                        <div class="email">${user.email}</div>
                    </div>
                    <a href="my-reviews.html" class="dropdown-item">
                        <i class="fa-regular fa-star"></i> Đánh giá của tôi
                    </a>
                    <div class="dropdown-item danger" id="btn-logout">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </div>
                </div>
            </div>
        `;
        document.getElementById('btn-logout')?.addEventListener('click', () => {
            Auth.logout();
            showToast('Đã đăng xuất');
            setTimeout(() => window.location.reload(), 800);
        });
    } else {
        navActions.innerHTML = `
            <a href="auth.html" class="btn-login">
                <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
            </a>
        `;
    }

    // Highlight active nav
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-links a').forEach(a => {
        const href = a.getAttribute('href');
        if (href === path || (path === '' && href === 'index.html')) {
            a.classList.add('active');
        }
    });

    // Scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
}