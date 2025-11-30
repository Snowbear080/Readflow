document.addEventListener('DOMContentLoaded', async () => {

    // === 1. ตัวแปรและ Elements ===
    let currentUser = null;
    let createPostTags = new Set();
    let allFeedPosts = [];
    let topPostsCache = [];
    let likedPostIds = new Set(); // เก็บ ID ที่เราไลค์แล้ว

    // -- Elements: Create Post --
    const createPostBtn = document.getElementById('create-post-btn');
    const createModal = document.getElementById('create-post-modal');
    const closeCreateModalBtn = createModal.querySelector('.close-modal-btn');
    const publishBtn = document.getElementById('publish-btn');

    const postContentInput = document.getElementById('post-content');
    const customTagInput = document.getElementById('custom-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const selectedTagsContainer = document.getElementById('selected-tags-container');
    const modalUserName = document.getElementById('modal-user-name');
    const privacySelect = document.getElementById('post-privacy');

    // -- Elements: Detail Modal --
    const detailModal = document.getElementById('post-detail-modal');
    const closeDetailBtn = detailModal.querySelector('.close-detail-btn');
    const detailContent = document.getElementById('detail-content-area');
    const commentListEl = document.getElementById('detail-comment-list');
    const commentInput = document.getElementById('new-comment-input');
    const sendCommentBtn = document.getElementById('send-comment-btn');
    let currentDetailPostId = null;

    // -- Elements: Search & Feed --
    const searchInput = document.getElementById('blog-search-input');
    let debounceTimer;


    // === 2. Helper Functions (ฟังก์ชันช่วย) ===

    // ฟังก์ชันเปิด/ปิด Modal พร้อมจัดการ Scroll Lock
    function toggleModal(modal, show) {
        if (show) {
            modal.classList.add('show');
            document.body.classList.add('modal-open'); // ล็อค Scroll
        } else {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open'); // ปลดล็อค
        }
    }

    function timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + " hr" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + " min" + (interval > 1 ? "s" : "") + " ago";
        return "Just now";
    }

    async function fetchUserLikes() {
        if (!currentUser) return;
        const { data } = await window.supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', currentUser.id);
        if (data) {
            likedPostIds = new Set(data.map(like => like.post_id));
        }
    }

    function createPostHTML(post, isRanked, index) {
        const timeString = timeAgo(post.created_at);
        const tagsHtml = (post.tags || []).map(t => `<span>${t}</span>`).join('');
        const isLong = post.content.length > 300 || post.content.split('\n').length > 5;

        const contentHtml = `
            <div class="post-content-text" id="content-${post.id}">
                ${post.content}
            </div>
            ${isLong ? `<span class="see-more-btn" onclick="toggleSeeMore('${post.id}', event)">See More</span>` : ''}
        `;

        const rankClass = isRanked ? `rank-${index + 1}` : '';
        const rankBadge = isRanked ? `<div class="rank-badge">${index + 1}</div>` : '';
        const username = post.profiles?.username || 'Unknown User';

        // เช็กสถานะ Like
        const isLiked = likedPostIds.has(post.id);
        const likeClass = isLiked ? 'liked' : '';
        const likeIcon = isLiked ? 'icons/icon/heart-filled.svg' : 'icons/icon/heart.svg';

        return `
            <div class="post-card ${rankClass}" onclick="openDetail('${post.id}')" id="post-card-${post.id}">
                <button class="post-menu-btn" onclick="event.stopPropagation()">...</button>
                
                <div class="post-header">
                    ${rankBadge}
                    <div class="user-avatar-small"></div> 
                    <div class="post-info-col">
                        <strong>${username}</strong>
                        <span class="post-time">${timeString}</span>
                    </div>
                </div>
                
                <div class="post-content">
                    ${contentHtml}
                    <div class="post-tags" style="margin-top:8px;">${tagsHtml}</div>
                </div>
                
                <div class="post-actions">
                    <div class="action-pill like-btn-group ${likeClass}" data-post-id="${post.id}" onclick="toggleLike('${post.id}', this, event)">
                        <img src="${likeIcon}" class="like-icon-img" alt="Like"> 
                        <span class="like-count">${post.like_count || 0}</span>
                    </div>
                    <div class="action-pill">
                        <img src="icons/icon/Comment.svg" alt="Comment"> 
                        <span>${post.comment_count || 0}</span>
                    </div>
                    <div class="action-pill" ">
                        <img src="icons/icon/Eye.svg" alt="View"> 
                        <span class="view-count-display">${post.view_count || 0}</span>
                    </div>
                </div>
            </div>
        `;
    }


    // === 3. Load Data Logic ===

    async function loadPosts(query = '') {
        const feedContainer = document.getElementById('feed-list');
        const topContainer = document.getElementById('top-blogs-list');

        // 3.1 โหลด Top 5 (ถ้ายังไม่มี Query)
        if (!query && topContainer) {
            const { data: topPosts } = await window.supabase
                .from('posts')
                .select('*, profiles!posts_user_id_fkey(username)')
                .eq('status', 'approved')
                .eq('visibility', 'public')
                .order('like_count', { ascending: false })
                .limit(5);

            topPostsCache = topPosts || [];
            renderFeed('top-blogs-list', topPosts, true);
        }

        // 3.2 โหลด Newest Feed
        let queryBuilder = window.supabase
            .from('posts')
            .select('*, profiles!posts_user_id_fkey(username)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (query) {
            queryBuilder = queryBuilder.ilike('content', `%${query}%`);
        }

        const { data: newPosts, error } = await queryBuilder.limit(20);

        if (error) {
            console.error("Error loading posts:", error);
            return;
        }

        allFeedPosts = newPosts || [];
        renderFeed('feed-list', newPosts, false);
    }

    function renderFeed(containerId, posts, isRanked) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (!posts || posts.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888; padding:20px;">No posts found.</p>';
            return;
        }

        posts.forEach((post, index) => {
            container.insertAdjacentHTML('beforeend', createPostHTML(post, isRanked, index));
        });
    }


    // === 4. Global Interactive Functions ===

    // 4.1 เปิด Modal ดูรายละเอียด
    window.openDetail = async (postId) => {
        currentDetailPostId = postId;

        const post = allFeedPosts.find(p => p.id === postId) ||
            topPostsCache.find(p => p.id === postId);

        if (!post) return;

        const timeString = timeAgo(post.created_at);
        const tagsHtml = (post.tags || []).map(t => `<span>${t}</span>`).join('');
        const username = post.profiles?.username || 'Unknown';

        // เช็กสถานะไลค์สำหรับ Modal
        const isLiked = likedPostIds.has(post.id);
        const likeClass = isLiked ? 'liked' : '';
        const likeIcon = isLiked ? 'icons/icon/heart-filled.svg' : 'icons/icon/heart.svg';

        detailContent.innerHTML = `
            <div class="post-header" style="margin-bottom:20px;">
                <div class="user-avatar-small" style="width:50px;height:50px;"></div>
                <div class="post-info-col">
                    <strong style="font-size:18px; color:#284062;">${username}</strong>
                    <div class="post-meta" style=" display:flex; align-items:center; gap:8px;">
                        <span class="post-time" style="font-size:12px;">${timeString}</span>
                        <span style="font-size:10px; color:#888; border:1px solid #ddd; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:4px;">
                            ${post.visibility === 'public' ? '🌎 Public' : (post.visibility === 'friends' ? '👥 Friends' : '🔒 Private')}
                        </span>
                    </div>
                </div>
            </div>
            <div class="post-content" style="font-size:14px; line-height:1.8; color:#333;">
                ${post.content}
                <div class="post-tags" style="margin-top:20px;">${tagsHtml}</div>
            </div>
            <div class="post-actions" style="margin-top:30px; padding-top:20px; border-top:1px solid #eee;">
                <div class="action-pill like-btn-group ${likeClass}" data-post-id="${post.id}" onclick="toggleLike('${post.id}', this, event)">
                    <img src="${likeIcon}" class="like-icon-img"> <span class="like-count">${post.like_count}</span> Likes
                </div>
                <div class="action-pill">
                    <img src="icons/icon/Eye.svg"> <span id="modal-view-count">${post.view_count}</span> Views
                </div>
            </div>
        `;

        toggleModal(detailModal, true); // เปิด Modal ด้วยฟังก์ชันใหม่

        await window.supabase.rpc('increment_view_count', { p_post_id: postId });
        const viewEl = document.getElementById('modal-view-count');
        if (viewEl) viewEl.textContent = parseInt(viewEl.textContent) + 1;

        // อัปเดตวิวใน Feed ด้วย
        const feedCardView = document.querySelector(`#post-card-${postId} .view-count-display`);
        if (feedCardView) feedCardView.textContent = parseInt(feedCardView.textContent) + 1;

        loadComments(postId);
    };

    // 4.2 See More
    window.toggleSeeMore = (id, e) => {
        e.stopPropagation();
        const content = document.getElementById(`content-${id}`);
        const btn = e.target;
        content.classList.toggle('expanded');
        btn.textContent = content.classList.contains('expanded') ? 'Show Less' : 'See More';
    };

    // 4.3 Like (ซิงค์ทุกที่)
    window.toggleLike = async (postId, btn, e) => {
        if (e) e.stopPropagation();
        if (!currentUser) return alert('Please login to like posts.');

        // Optimistic Update
        const isLiked = likedPostIds.has(postId);
        if (isLiked) likedPostIds.delete(postId);
        else likedPostIds.add(postId);

        const currentCountSpan = btn.querySelector('.like-count');
        let currentCount = parseInt(currentCountSpan.textContent) || 0;
        let newCount = isLiked ? currentCount - 1 : currentCount + 1;

        // อัปเดตปุ่มทุกที่ที่มี data-post-id นี้
        const allButtons = document.querySelectorAll(`.like-btn-group[data-post-id="${postId}"]`);
        allButtons.forEach(button => {
            const countSpan = button.querySelector('.like-count');
            const iconImg = button.querySelector('.like-icon-img');

            if (countSpan) countSpan.textContent = newCount;

            if (!isLiked) { // Liked
                button.classList.add('liked');
                if (iconImg) iconImg.src = 'icons/icon/heart-filled.svg';
            } else { // Unliked
                button.classList.remove('liked');
                if (iconImg) iconImg.src = 'icons/icon/heart.svg';
            }
        });

        const { error } = await window.supabase.rpc('toggle_post_like', {
            p_post_id: postId,
            p_user_id: currentUser.id
        });

        if (error) console.error('Like error:', error);
    };

    // 4.4 Add Tag
    window.addCreateTag = (tagName) => {
        if (createPostTags.has(tagName)) return;
        createPostTags.add(tagName);
        renderCreateTags();
    };


    // === 5. Create Post Logic ===

    function renderCreateTags() {
        selectedTagsContainer.innerHTML = '';
        createPostTags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag-chip';
            span.style.background = '#284062';
            span.style.color = '#fff';
            span.innerHTML = `${tag} &times;`;
            span.onclick = () => { createPostTags.delete(tag); renderCreateTags(); };
            selectedTagsContainer.appendChild(span);
        });
    }

    createPostBtn.addEventListener('click', async () => {
        if (!currentUser) return alert('Please login to create a post.');
        if (modalUserName) {
            const { data: profile } = await window.supabase.from('profiles').select('username').eq('id', currentUser.id).single();
            modalUserName.textContent = profile?.username || currentUser.email;
        }
        toggleModal(createModal, true);
    });

    closeCreateModalBtn.addEventListener('click', () => toggleModal(createModal, false));

    // ปิดเมื่อกดพื้นหลัง (Create Modal)
    createModal.addEventListener('click', (e) => {
        if (e.target === createModal) toggleModal(createModal, false);
    });

    addTagBtn.addEventListener('click', () => {
        const val = customTagInput.value.trim();
        if (val) {
            const tag = val.startsWith('#') ? val : `#${val}`;
            window.addCreateTag(tag);
            customTagInput.value = '';
        }
    });

    publishBtn.addEventListener('click', async () => {
        const content = postContentInput.value.trim();
        const visibility = privacySelect ? privacySelect.value : 'public';
        if (!content) return alert("Content cannot be empty.");

        try {
            const { error } = await window.supabase.from('posts').insert([{
                user_id: currentUser.id,
                content: content,
                tags: Array.from(createPostTags),
                status: 'pending',
                visibility: visibility
            }]);
            if (error) throw error;
            alert('Post submitted successfully! Waiting for admin approval.');
            toggleModal(createModal, false);

            postContentInput.value = '';
            createPostTags.clear();
            renderCreateTags();
            if (privacySelect) privacySelect.value = 'public';
        } catch (err) { console.error('Error posting:', err); alert('Failed to publish post.'); }
    });


    // === 6. Comments & Initialization ===

    async function loadComments(postId) {
        commentListEl.innerHTML = '<p style="color:#999;">Loading comments...</p>';

        // ลอง fetch แบบที่ 1 (ระบุ FK)
        const { data: comments, error } = await window.supabase
            .from('post_comments')
            .select('*, profiles!post_comments_user_id_fkey(username)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            // Fallback fetch
            const { data: retryData } = await window.supabase.from('post_comments').select('*, profiles(username)').eq('post_id', postId).order('created_at', { ascending: true });
            if (retryData) { renderComments(retryData); return; }
            commentListEl.innerHTML = '<p>Error loading comments.</p>'; return;
        }
        renderComments(comments);
    }

    function renderComments(comments) {
        if (!comments || comments.length === 0) {
            commentListEl.innerHTML = '<p style="color:#999; font-size: 14px;">No comments yet. Be the first!</p>';
            return;
        }
        commentListEl.innerHTML = '';
        comments.forEach(c => {
            const date = timeAgo(c.created_at);
            const username = c.profiles?.username || 'Unknown';
            const html = `
                <div class="comment-item" style="display:flex; gap:10px; margin-bottom:15px;">
                    <div class="user-avatar-small" style="width:32px; height:32px;"></div>
                    <div class="comment-bubble" style="background:#F0F2F5; padding:10px; border-radius:12px; ;">
                        <div style="font-weight:bold; font-size:13px; color:#284062;">
                            ${username}
                            <span style="font-weight:normal; color:#999; font-size:11px; margin-left:5px;">${date}</span>
                        </div>
                        <div style="font-size:14px; margin-top:2px;">${c.content}</div>
                    </div>
                </div>
            `;
            commentListEl.insertAdjacentHTML('beforeend', html);
        });
        commentListEl.scrollTop = commentListEl.scrollHeight;
    }

    sendCommentBtn.addEventListener('click', async () => {
        const content = commentInput.value.trim();
        if (!content) return;
        if (!currentUser) return alert("Please login to comment.");
        try {
            const { error } = await window.supabase.from('post_comments').insert([{
                post_id: currentDetailPostId,
                user_id: currentUser.id,
                content: content
            }]);
            if (error) throw error;
            await window.supabase.rpc('increment_comment_count', { p_post_id: currentDetailPostId });
            commentInput.value = '';
            loadComments(currentDetailPostId);
        } catch (err) { console.error("Error sending comment:", err); }
    });

    // Event Listeners (Detail Modal)
    closeDetailBtn.addEventListener('click', () => toggleModal(detailModal, false));

    // ปิดเมื่อกดพื้นหลัง (Detail Modal)
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) toggleModal(detailModal, false);
    });

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { loadPosts(e.target.value.trim()); }, 500);
    });

    // Init
    const { data: { user } } = await window.supabase.auth.getUser();
    currentUser = user;
    await fetchUserLikes(); // โหลด Like ก่อน
    loadPosts(); // แล้วโหลดโพสต์
});