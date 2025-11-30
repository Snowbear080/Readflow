document.addEventListener('DOMContentLoaded', async () => {
    
    const pendingListEl = document.getElementById('pending-list');
    const pendingCountEl = document.getElementById('pending-count');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Preview Elements
    const previewContent = document.getElementById('preview-content');
    const emptyState = document.getElementById('empty-state');
    const pUsername = document.getElementById('preview-username');
    const pDate = document.getElementById('preview-date');
    const pText = document.getElementById('preview-text');
    const pTags = document.getElementById('preview-tags');
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');

    let currentSelectedPostId = null;
    let postsData = [];

    // === 1. ตรวจสอบสิทธิ์ Admin ===
    async function checkAdmin() {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        // ดึงข้อมูล Profile เพื่อดู Role
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile.role !== 'admin') {
            alert('Access Denied: Admins only.');
            window.location.href = 'index.html'; // ดีดกลับหน้าแรก
        } else {
            loadPendingPosts(); // เป็น Admin -> โหลดข้อมูล
        }
    }

    // === 2. โหลดโพสต์ที่รออนุมัติ ===
    async function loadPendingPosts() {
        pendingListEl.innerHTML = '<div class="placeholder">Loading...</div>';
        
        const { data: posts, error } = await window.supabase
            .from('posts')
            // ‼️ (แก้ไข) ระบุชื่อ Foreign Key ที่นี่ด้วย ‼️
            .select('*, profiles!posts_user_id_fkey(username)') 
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            pendingListEl.innerHTML = '<div class="placeholder">Error loading posts.</div>';
            return;
        }

        postsData = posts;
        renderList(posts);
    }

    // === 3. วาดรายการทางซ้าย ===
    function renderList(posts) {
        pendingCountEl.textContent = posts.length;
        pendingListEl.innerHTML = '';

        if (posts.length === 0) {
            pendingListEl.innerHTML = '<div class="placeholder">No pending posts.</div>';
            clearPreview();
            return;
        }

        posts.forEach(post => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.dataset.id = post.id;
            div.innerHTML = `
                <h4>${post.profiles?.username || 'Unknown'}</h4>
                <p>${post.content.substring(0, 50)}...</p>
            `;
            
            div.addEventListener('click', () => selectPost(post, div));
            pendingListEl.appendChild(div);
        });
    }

    // === 4. เลือกโพสต์เพื่อดูรายละเอียด ===
    function selectPost(post, listItemElement) {
        currentSelectedPostId = post.id;

        // Highlight รายการที่เลือก
        document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
        listItemElement.classList.add('active');

        // แสดง Preview (ขวา)
        emptyState.classList.add('hidden');
        previewContent.classList.remove('hidden'); // แสดงกล่อง
        emptyState.style.display = 'none'; // ซ่อนข้อความว่าง

        // เติมข้อมูล
        pUsername.textContent = post.profiles?.username || 'Unknown';
        pDate.textContent = new Date(post.created_at).toLocaleString();
        pText.textContent = post.content;
        
        // เติม Tags
        pTags.innerHTML = '';
        if (post.tags && post.tags.length > 0) {
            post.tags.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'tag-chip';
                span.textContent = tag;
                pTags.appendChild(span);
            });
        }
    }

    function clearPreview() {
        currentSelectedPostId = null;
        previewContent.classList.add('hidden');
        emptyState.style.display = 'block';
    }

    // === 5. ‼️ ฟังก์ชันจัดการ (Approve = อัปเดต / Reject = ลบ) ‼️ ===
    async function updatePostStatus(action) {
        if (!currentSelectedPostId) return;

        // 1. ข้อความยืนยัน (ต่างกันตาม Action)
        const confirmMsg = action === 'approve' 
            ? 'Are you sure you want to APPROVE this post?' 
            : '⚠️ Are you sure you want to DELETE this post permanently?';

        if (!confirm(confirmMsg)) return;

        try {
            let error;

            if (action === 'approve') {
                // ✅ กรณี Approve: อัปเดตสถานะเป็น 'approved'
                const response = await window.supabase
                    .from('posts')
                    .update({ status: 'approved' })
                    .eq('id', currentSelectedPostId);
                error = response.error;

            } else if (action === 'reject') {
                // ❌ กรณี Reject: "ลบ" ทิ้งจาก Database เลย
                const response = await window.supabase
                    .from('posts')
                    .delete() // ‼️ ใช้คำสั่ง delete()
                    .eq('id', currentSelectedPostId);
                error = response.error;
            }

            if (error) throw error;

            // 2. แจ้งเตือนความสำเร็จ
            const successMsg = action === 'approve' ? 'Post Approved!' : 'Post Deleted!';
            alert(successMsg);
            
            // 3. รีโหลดรายการ
            loadPendingPosts();
            clearPreview();

        } catch (err) {
            console.error('Error managing post:', err.message);
            alert('Failed to process request: ' + err.message);
        }
    }

    // === 6. Event Listeners (แก้ไขการส่งค่า) ===
    // ส่งค่า 'approve' หรือ 'reject' เข้าไปในฟังก์ชัน
    approveBtn.addEventListener('click', () => updatePostStatus('approve'));
    rejectBtn.addEventListener('click', () => updatePostStatus('reject'));
    refreshBtn.addEventListener('click', loadPendingPosts);

    // เริ่มต้นทำงาน
    checkAdmin();
});