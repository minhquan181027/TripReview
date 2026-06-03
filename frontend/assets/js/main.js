// ============================================
// TripGo - main.js (Trang chủ - index.html)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    loadFeaturedPlaces();
    loadLatestReviews();
    initSearch();
    initModal();
});

// ============================================
// FEATURED PLACES
// ============================================
async function loadFeaturedPlaces() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    grid.innerHTML = skeletonCards(4);

    try {
        const places = await API.getFeaturedPlaces();
        if (!places.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
                <div class="icon">🏝️</div>
                <h3>Chưa có địa điểm nào</h3>
                <p>Hãy thêm địa điểm vào database</p>
            </div>`;
            return;
        }
        grid.innerHTML = places.map(renderPlaceCard).join('');
        grid.querySelectorAll('.place-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                openModal(id);
            });
        });
    } catch (err) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="icon">⚠️</div>
            <h3>Không thể tải dữ liệu</h3>
            <p>Kiểm tra kết nối backend</p>
        </div>`;
    }
}

function renderPlaceCard(place) {
    const rating = parseFloat(place.avg_rating).toFixed(1);
    return `
        <div class="place-card" data-id="${place.place_id}">
            <div class="card-img-wrap">
                <img src="${place.image_url}" alt="${place.name}" loading="lazy"
                     onerror="this.src='https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600'">
                <div class="card-badge"><i class="fa-solid fa-location-dot"></i> ${place.location}</div>
                <button class="card-fav" onclick="event.stopPropagation()">
                    <i class="fa-regular fa-heart"></i>
                </button>
            </div>
            <div class="card-body">
                <div class="card-name">${place.name}</div>
                <div class="card-location">
                    <i class="fa-solid fa-location-dot"></i> ${place.location}
                </div>
                <div class="card-meta">
                    <div class="rating">
                        <div class="stars">${renderStars(rating)}</div>
                        <span class="rating-num">${rating}</span>
                        <span class="rating-count">(${place.review_count} đánh giá)</span>
                    </div>
                    <span class="btn-detail">Xem →</span>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// LATEST REVIEWS
// ============================================
async function loadLatestReviews() {
    const list = document.getElementById('latest-reviews');
    if (!list) return;

    list.innerHTML = `<div class="skeleton-card" style="padding:20px">
        ${Array(3).fill('<div class="skeleton skeleton-line" style="margin-bottom:10px"></div>').join('')}
    </div>`;

    try {
        const reviews = await API.getLatestReviews();
        if (!reviews.length) {
            list.innerHTML = `<div class="empty-state">
                <div class="icon">💬</div>
                <h3>Chưa có đánh giá nào</h3>
            </div>`;
            return;
        }
        list.innerHTML = reviews.map(r => `
            <div class="review-card" style="cursor:pointer" onclick="openModal(${r.place_id})">
                <img src="${r.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullname)}&background=1a6ef5&color=fff`}" 
                     class="review-avatar" alt="${r.fullname}"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullname)}&background=1a6ef5&color=fff'">
                <div class="review-content">
                    <div class="review-header">
                        <div>
                            <span class="review-author">${r.fullname}</span>
                            <span class="review-place"> · ${r.place_name}</span>
                        </div>
                        <div class="review-meta">
                            <div class="stars" style="font-size:.75rem">${renderStars(r.rating)}</div>
                            <span class="review-time">${timeAgo(r.created_at)}</span>
                        </div>
                    </div>
                    <p class="review-text">${r.comment}</p>
                </div>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p style="color:var(--gray-3);text-align:center;padding:20px">Lỗi tải đánh giá</p>';
    }
}

// ============================================
// SEARCH
// ============================================
function initSearch() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('search-input');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = `places.html?search=${encodeURIComponent(q)}`;
    });
}

// ============================================
// MODAL
// ============================================
let currentPlaceId = null;
let selectedRating = 0;

function initModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

async function openModal(placeId) {
    currentPlaceId = placeId;
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const content = document.getElementById('modal-content');
    content.innerHTML = `<div style="padding:60px;text-align:center">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i>
    </div>`;

    try {
        const [place, reviews] = await Promise.all([
            API.getPlaceById(placeId),
            API.getReviewsByPlace(placeId)
        ]);

        renderModalContent(place, reviews);
    } catch (err) {
        content.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Lỗi tải dữ liệu</h3></div>`;
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
    currentPlaceId = null;
    selectedRating = 0;
}

function renderModalContent(place, reviews) {
    const content = document.getElementById('modal-content');
    const rating = parseFloat(place.avg_rating).toFixed(1);
    const user = Auth.getUser();
    const isLoggedIn = Auth.isLoggedIn();

    const reviewsHtml = reviews.length
        ? reviews.map(r => `
            <div class="modal-review-item">
                <img src="${r.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullname)}&background=1a6ef5&color=fff`}" 
                     class="modal-review-avatar" alt="${r.fullname}"
                     onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(r.fullname)}&background=1a6ef5&color=fff'">
                <div class="modal-review-body">
                    <div class="modal-review-header">
                        <span class="modal-review-name">${r.fullname}</span>
                        <div style="display:flex;align-items:center;gap:8px">
                            <div class="stars" style="font-size:.75rem">${renderStars(r.rating)}</div>
                            <span class="modal-review-time">${timeAgo(r.created_at)}</span>
                        </div>
                    </div>
                    <p class="modal-review-text">${r.comment}</p>
                </div>
            </div>
        `).join('')
        : '<p style="color:var(--gray-3);font-size:.88rem;padding:12px 0">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>';

    const writeReviewHtml = isLoggedIn ? `
        <div class="write-review">
            <div class="write-review-title">Viết đánh giá của bạn</div>
            <p style="font-size:.83rem;color:var(--gray-3);margin-bottom:12px">Chọn số sao</p>
            <div class="star-select" id="star-select">
                ${[1,2,3,4,5].map(i => `<i class="fa-regular fa-star" data-star="${i}"></i>`).join('')}
            </div>
            <textarea class="review-textarea" id="review-comment" 
                placeholder="Chia sẻ trải nghiệm của bạn..."></textarea>
            <button class="btn-submit-review" id="btn-submit-review">
                <i class="fa-solid fa-paper-plane"></i> Gửi đánh giá
            </button>
        </div>
    ` : `
        <div class="login-prompt">
            <p>Đăng nhập để viết đánh giá</p>
            <a href="auth.html"><i class="fa-solid fa-right-to-bracket"></i> Đăng nhập ngay</a>
        </div>
    `;

    content.innerHTML = `
        <div class="modal-hero">
            <img src="${place.image_url}" alt="${place.name}"
                 onerror="this.src='https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800'">
            <div class="modal-hero-overlay"></div>
            <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-arrow-left"></i></button>
            <button class="modal-fav"><i class="fa-regular fa-heart"></i></button>
        </div>
        <div class="modal-body">
            <h2 class="modal-place-name">${place.name}</h2>
            <div class="modal-location">
                <i class="fa-solid fa-location-dot"></i> ${place.location}
            </div>
            <div class="modal-rating">
                <div class="stars">${renderStars(rating)}</div>
                <span style="font-weight:700;font-size:1rem;color:var(--dark)">${rating}</span>
                <span style="color:var(--gray-3);font-size:.85rem">(${place.review_count} đánh giá)</span>
            </div>
            <p class="modal-desc">${place.description || 'Chưa có mô tả.'}</p>
            
            <div class="modal-reviews-title">
                <i class="fa-regular fa-comment-dots" style="color:var(--primary)"></i>
                Đánh giá (${reviews.length})
            </div>
            <div class="modal-reviews-list">${reviewsHtml}</div>
            ${writeReviewHtml}
        </div>
    `;

    // Star rating interaction
    const starSelect = document.getElementById('star-select');
    if (starSelect) {
        const stars = starSelect.querySelectorAll('i');

        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.star);
                stars.forEach((s, i) => {
                    s.className = `fa-${i < val ? 'solid' : 'regular'} fa-star${i < val ? ' hover' : ''}`;
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach((s, i) => {
                    s.className = `fa-${i < selectedRating ? 'solid' : 'regular'} fa-star${i < selectedRating ? ' active' : ''}`;
                });
            });

            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.star);
                stars.forEach((s, i) => {
                    s.className = `fa-${i < selectedRating ? 'solid' : 'regular'} fa-star${i < selectedRating ? ' active' : ''}`;
                });
            });
        });
    }

    // Submit review
    document.getElementById('btn-submit-review')?.addEventListener('click', submitReview);
}

async function submitReview() {
    const comment = document.getElementById('review-comment')?.value.trim();
    if (!selectedRating) return showToast('Vui lòng chọn số sao', 'error');
    if (!comment) return showToast('Vui lòng nhập nhận xét', 'error');

    const btn = document.getElementById('btn-submit-review');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...';
    btn.disabled = true;

    try {
        const res = await API.addReview({ place_id: currentPlaceId, rating: selectedRating, comment });
        if (res.message === 'Đánh giá thành công!') {
            showToast('Đánh giá thành công! 🎉');
            // Reload modal
            await openModal(currentPlaceId);
        } else {
            showToast(res.message || 'Có lỗi xảy ra', 'error');
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đánh giá';
            btn.disabled = false;
        }
    } catch {
        showToast('Lỗi kết nối server', 'error');
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đánh giá';
        btn.disabled = false;
    }
}