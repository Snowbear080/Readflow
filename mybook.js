// (ต้องโหลด supabase-client.js ก่อนไฟล์นี้)
document.addEventListener('DOMContentLoaded', () => {

    // === 1. Elements และ Constants ===
    const userBookList = document.getElementById('user-book-list');
    const bookLimitStatus = document.querySelector('.book-limit-status');
    const newBookTrigger = document.getElementById('new-book-trigger');
    
    // Modal Elements
    const newBookOverlay = document.getElementById('new-book-overlay');
    const newBookForm = document.getElementById('new-book-form');
    const modalCancel = document.getElementById('modal-cancel');
    const modalCreate = document.getElementById('modal-create');

    // Input Elements
    const coverPreview = document.getElementById('cover-preview');
    const titleInput = document.getElementById('book-title-input');
    const pagesInput = document.getElementById('book-pages-input');
    const privateToggle = document.getElementById('book-private-toggle');
    const importUrlTrigger = document.getElementById('import-url-trigger');
    const templateCards = document.querySelectorAll('.template-card:not(.import-card)');

    // Templates
    const DEFAULT_COVER_URL = 'image/cover1.png';
    const MAX_BOOKS = 10;
    let currentUserId = null;
    let editingBookId = null;
    const modalTitle = document.querySelector('.modal-header h2');


    // === 2. ฟังก์ชันควบคุม Modal ===
    function showModal(book = null) {
        // If book is provided -> open modal in edit mode, else create mode
        if (book) {
            editingBookId = book.id;
            if (modalTitle) modalTitle.textContent = 'EDIT BOOK';
            if (modalCreate) modalCreate.textContent = 'SAVE';

            // populate fields
            titleInput.value = book.title || '';
            pagesInput.value = book.page_count || '';
            privateToggle.checked = !(book.is_public === true);
            coverPreview.src = book.cover_url || DEFAULT_COVER_URL;
        } else {
            editingBookId = null;
            if (modalTitle) modalTitle.textContent = 'NEW BOOK';
            if (modalCreate) modalCreate.textContent = 'CREATE';
            newBookForm.reset();
            coverPreview.src = DEFAULT_COVER_URL;
        }

        newBookOverlay.classList.add('show');
    }
    function hideModal() {
        newBookOverlay.classList.remove('show');
        newBookForm.reset(); // รีเซ็ตฟอร์ม
        coverPreview.src = DEFAULT_COVER_URL; // รีเซ็ตปก
    }


    // === 3. ฟังก์ชันสำหรับสร้าง HTML Card ===
    function createBookCardHTML(book) {
        const progress = Math.min(100, (book.current_page / book.page_count) * 100);
            // left: current/total, right: percent% (matches requested layout)
            return `
                <div class="book-card user-created" data-book-id="${book.id}">
                    <img src="${book.cover_url || DEFAULT_COVER_URL}" alt="${book.title}" class="book-cover">
                    <div class="book-info">
                        <span class="book-title">${book.title}</span>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <div class="progress-meta">
                            <span class="progress-count">${book.current_page}/${book.page_count} Pages</span>
                            <span class="progress-percent">${progress}%</span>
                        </div>
                        <button class="delete-book-btn" data-book-id="${book.id}" onclick="deleteBook('${book.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;

        return `
            <div class="book-card user-created" data-book-id="${book.id}">
                <img src="${book.cover_url || DEFAULT_COVER_URL}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <span class="book-title">${book.title}</span>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                    </div>
                    <span class="progress-text">${progressText}</span>
                    <button class="delete-book-btn" data-book-id="${book.id}" onclick="deleteBook('${book.id}')">
                        Delete
                    </button>
                    </div>
            </div>
        `;
    }
    
    // (ฟังก์ชัน Global สำหรับลบหนังสือ - ต้องประกาศไว้ข้างนอก)
    window.deleteBook = async (bookId) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        
        try {
            const { error } = await window.supabase
                .from('user_books')
                .delete()
                .eq('id', bookId);

            if (error) throw error;
            
            alert('Book deleted successfully.');
            loadUserBooks(); // รีโหลดรายการหนังสือ
            
        } catch (error) {
            console.error('Delete failed:', error.message);
            alert('Failed to delete book: ' + error.message);
        }
    };


    // === 4. ฟังก์ชันโหลดหนังสือและอัปเดตสถานะ ===
    async function loadUserBooks() {
        if (!currentUserId) {
            userBookList.innerHTML = '<p>Please log in to manage your private books.</p>';
            return;
        }

        try {
            const { data: books, error } = await window.supabase
                .from('user_books')
                .select('*')
                .eq('user_id', currentUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            userBookList.innerHTML = ''; // ล้าง Loading text

            // อัปเดตสถานะ Limit
            const bookCount = books.length;
            if (bookLimitStatus) {
                bookLimitStatus.textContent = `${bookCount}/${MAX_BOOKS} Books Created`;
            }
            if (bookCount >= MAX_BOOKS) {
                newBookTrigger.style.display = 'none';
            } else {
                newBookTrigger.style.display = 'flex';
            }

            // ‼️ ค้นหาหนังสือที่มี progress มากที่สุด
            let highestProgressBook = null;
            if (books.length > 0) {
                highestProgressBook = books.reduce((max, book) => {
                    const maxProgress = (max.current_page || 0) / (max.page_count || 1);
                    const bookProgress = (book.current_page || 0) / (book.page_count || 1);
                    return bookProgress > maxProgress ? book : max;
                });
            }

            // Render books
            let html = `<div class="book-card create-card" id="new-book-trigger-reloaded"><span class="create-icon">+</span><p>Create New Book</p></div>`; // ปุ่มสร้างใหม่
            
            books.forEach(book => {
                html += createBookCardHTML(book);
            });
            userBookList.innerHTML = html;
            
            // Re-attach listener to the newly rendered create button
            document.getElementById('new-book-trigger-reloaded').addEventListener('click', () => showModal());

            // Attach click handlers to each user-created card to open edit modal
            document.querySelectorAll('.book-card.user-created').forEach(card => {
                card.addEventListener('click', async (e) => {
                    // Prevent clicks coming from the delete button
                    if (e.target.closest('.delete-book-btn')) return;

                    const bookId = card.dataset.bookId;
                    if (!bookId) return;

                    try {
                        const { data: book, error } = await window.supabase
                            .from('user_books')
                            .select('*')
                            .eq('id', bookId)
                            .single();
                        if (error) throw error;
                        showModal(book);
                    } catch (err) {
                        console.error('Failed to load book for editing:', err.message || err);
                    }
                });
            });

            // ‼️ Double-click book card to open focusOverlay
            document.querySelectorAll('.book-card.user-created').forEach(card => {
                card.addEventListener('dblclick', async (e) => {
                    const bookId = card.dataset.bookId;
                    if (!bookId) {
                        console.warn('❌ No bookId found');
                        return;
                    }

                    console.log('📖 Double-clicked book:', bookId);

                    // ให้ focusOverlay ดึงข้อมูลเอง
                    if (typeof window.loadBookFromSupabase === 'function') {
                        console.log('📡 Loading book from Supabase...');
                        const book = await window.loadBookFromSupabase(bookId);
                        
                        if (book) {
                            console.log('✓ Book loaded, opening focusOverlay');
                            if (typeof window.openFocusOverlay === 'function') {
                                window.openFocusOverlay((minutes) => {
                                    console.log('🎯 Focus mode started with', minutes, 'minutes for:', book.title);
                                });
                            } else {
                                console.warn('❌ openFocusOverlay not available');
                            }
                        } else {
                            console.warn('❌ Book failed to load from Supabase');
                        }
                    } else {
                        console.warn('❌ loadBookFromSupabase not available');
                    }
                });
            });

            // ‼️ NEW: Auto-open focusOverlay with highest progress book on page load (optional)
            // ‼️ Auto-load highest progress book
            if (highestProgressBook && typeof window.loadBookFromSupabase === 'function') {
                setTimeout(() => {
                    console.log('📚 Auto-loading highest progress book:', highestProgressBook.title);
                    window.loadBookFromSupabase(highestProgressBook.id);
                }, 200);
            }

        } catch (error) {
            console.error('Error loading user books:', error.message);
            userBookList.innerHTML = '<p>Error loading your book list.</p>';
        }
    }


    // === 5. ฟังก์ชันจัดการการสร้างหนังสือใหม่ ===
    newBookForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserId) {
            alert('You must be logged in to create a book.');
            return;
        }

        // Check Limit (ป้องกันการส่งซ้ำ)
        const currentBookCount = (await window.supabase.from('user_books').select('id', { count: 'exact' }).eq('user_id', currentUserId)).count;
        if (currentBookCount >= MAX_BOOKS) {
            alert('Limit reached! You can only create up to 10 books.');
            return;
        }

        // ดึงข้อมูล
        const title = titleInput.value.trim();
        const pages = parseInt(pagesInput.value);
        const isPublic = !privateToggle.checked; // ถ้า toggle OFF (ไม่ private) คือ public
        const coverUrl = coverPreview.src === DEFAULT_COVER_URL ? null : coverPreview.src;

        if (pages <= 0 || isNaN(pages)) {
            alert('Page count must be a positive number.');
            return;
        }

        try {
            if (editingBookId) {
                // Update existing book
                const { error } = await window.supabase
                    .from('user_books')
                    .update({
                        title: title,
                        page_count: pages,
                        is_public: isPublic,
                        cover_url: coverUrl
                    })
                    .eq('id', editingBookId);

                if (error) throw error;

                alert('Book updated successfully!');
                hideModal();
                loadUserBooks();
            } else {
                // Insert new book
                const { error } = await window.supabase
                    .from('user_books')
                    .insert([{
                        user_id: currentUserId,
                        title: title,
                        page_count: pages,
                        is_public: isPublic,
                        cover_url: coverUrl
                    }]);

                if (error) throw error;

                alert('New book created successfully!');
                hideModal();
                loadUserBooks(); // รีโหลดรายการหนังสือ
            }

        } catch (error) {
            console.error('Book save failed:', error.message || error);
            alert('Book save failed: ' + (error.message || error));
        }
    });


    // === 6. Event Listeners (UI Control) ===
    
    // Open Modal
    newBookTrigger.addEventListener('click', showModal);

    // Close Modal
    modalCancel.addEventListener('click', hideModal);
    newBookOverlay.addEventListener('click', (e) => {
        if (e.target === newBookOverlay) hideModal();
    });

    // Template Selection Logic
    templateCards.forEach(card => {
        card.style.backgroundImage = `url(${card.dataset.templateUrl || DEFAULT_COVER_URL})`;
        card.addEventListener('click', () => {
            document.querySelector('.template-active')?.classList.remove('template-active');
            card.classList.add('template-active');
            coverPreview.src = card.dataset.templateUrl || DEFAULT_COVER_URL;
        });
    });
    
    // Import URL Logic (basic prompt)
    importUrlTrigger.addEventListener('click', () => {
        const url = prompt('Enter image URL for cover:');
        if (url) {
            coverPreview.src = url;
            document.querySelector('.template-active')?.classList.remove('template-active');
        }
    });


    // === 7. Initial Load (ตรวจสอบสถานะ Login) ===
    window.supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUserId = session.user.id;
            loadUserBooks();
        } else {
            currentUserId = null;
            loadUserBooks(); // โชว์ข้อความ "Please log in"
        }
    });
});