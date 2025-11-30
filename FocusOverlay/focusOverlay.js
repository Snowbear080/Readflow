(function() {
    
    // === 1. ส่วนคำนวณ Scrollbar ===
    let scrollbarWidth = 0;
    function calculateScrollbarWidth() {
        if (scrollbarWidth > 0) return;
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll';
        document.body.appendChild(outer);
        const inner = document.createElement('div');
        outer.appendChild(inner);
        scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
        outer.parentNode.removeChild(outer);
    }
    calculateScrollbarWidth();


    // === 2. ส่วนควบคุม Timer และตัวแปรหลัก ===
    const MIN_TIME = 25;
    const TIME_STEP = 5;
    let settingsCurrentMinutes = MIN_TIME;
    
    // (Elements)
    let overlayElement = null;
    let closeBtn, startBtn, subtractBtn, addBtn, timerDisplay = null;
    let bookSelect, bookTitleInput, bookPagesInput, bookCurrentInput, bookGoalInput, bookCoverPreview = null;
    let progressFill, displayTotalPages, percentageLabel = null;

    // (Logic Variables)
    let onStartCallback = null; 
    let isInitialized = false;  
    let shouldOpenWhenReady = false; 
    let currentAudio = null;
    let currentPlayingItem = null;

    function updateSettingsTimer() {
        if (!timerDisplay || !subtractBtn) return;
        if (settingsCurrentMinutes < 60) {
            timerDisplay.textContent = `${settingsCurrentMinutes}:00`;
        } else {
            const hours = Math.floor(settingsCurrentMinutes / 60);
            const minutes = settingsCurrentMinutes % 60;
            const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
            timerDisplay.textContent = `${hours}:${formattedMinutes} hr`;
        }
        subtractBtn.disabled = (settingsCurrentMinutes === MIN_TIME);
    }

    // === 3. ‼️ ฟังก์ชันอัปเดต Progress Bar (อ่านจาก Text) ‼️ ===
    function updateProgressBar() {
        if (!bookCurrentInput || !bookPagesInput) return;

        // ‼️ (แก้ไข) ใช้ textContent แทน value เพราะเป็น span ‼️
        const current = parseInt(bookCurrentInput.textContent) || 0;
        const total = parseInt(bookPagesInput.value) || 0; 
        
        // อัปเดตตัวเลข Total Pages
        if (displayTotalPages) displayTotalPages.textContent = total;

        if (total > 0) {
            const percent = Math.min(100, Math.round((current / total) * 100));
            if (progressFill) progressFill.style.width = `${percent}%`;
            if (percentageLabel) percentageLabel.textContent = `${percent}%`;
        } else {
            if (progressFill) progressFill.style.width = `0%`;
            if (percentageLabel) percentageLabel.textContent = `0%`;
        }
    }


    // === 4. ฟังก์ชันเปิด/ปิด Overlay ===
    window.openFocusOverlay = (startCallback) => {
        onStartCallback = startCallback;
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        if (isInitialized) {
            overlayElement.classList.add('show');
            document.body.classList.add('overlay-active');
            updateSettingsTimer();
            loadUserBooksOptions(); 
        } else {
            shouldOpenWhenReady = true;
        }
    };

    window.closeFocusOverlay = () => {
        if (!overlayElement) return;
        document.body.style.paddingRight = '';
        overlayElement.classList.remove('show');
        document.body.classList.remove('overlay-active');
        onStartCallback = null; 
        shouldOpenWhenReady = false; 
        if (currentAudio) { currentAudio.pause(); if(currentPlayingItem) currentPlayingItem.classList.remove('playing'); }
    };


    // === 6. ฟังก์ชันย่อย: ดึงข้อมูลหนังสือ ===
    async function loadUserBooksOptions() {
        if (!bookSelect || !window.supabase) return;
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (!user) return;
            const { data: books, error } = await window.supabase.from('user_books').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
            if (error) throw error;

            bookSelect.innerHTML = '<option value="">-- Select from My Books --</option>';
            books.forEach(book => {
                const option = document.createElement('option');
                option.value = book.id;
                option.textContent = book.title;
                option.dataset.title = book.title;
                option.dataset.pages = book.page_count;
                option.dataset.current = book.current_page || 0;
                option.dataset.cover = book.cover_url || ''; 
                bookSelect.appendChild(option);
            });
        } catch (err) { console.error('Error loading user books:', err); }
    }

    // (ฟังก์ชัน initSelectionLogic, handleSoundClick ... เหมือนเดิม)
    function initSelectionLogic(items, storageKey, valueSelector) {
        const savedValue = localStorage.getItem(storageKey);
        items.forEach((item, index) => {
            const itemValue = item.querySelector(valueSelector).textContent.trim();
            if (savedValue === itemValue || (!savedValue && index === 0)) item.classList.add('active');
            else item.classList.remove('active');
            if (storageKey === 'focusTheme') { 
                item.addEventListener('click', () => {
                    items.forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    localStorage.setItem(storageKey, itemValue);
                });
            }
        });
    }
    function handleSoundClick(item, allItems) {
        const audioSrc = item.dataset.audio;
        const soundName = item.querySelector('.sound-name').textContent.trim();
        allItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        localStorage.setItem('focusSound', soundName);
        if (currentPlayingItem === item && !currentAudio.paused) {
            currentAudio.pause();
            item.classList.remove('playing');
            currentPlayingItem = null;
        } else {
            if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
            if (currentPlayingItem) { currentPlayingItem.classList.remove('playing'); }
            if (audioSrc) {
                currentAudio = new Audio(audioSrc);
                currentAudio.loop = true;
                currentAudio.volume = 0.5;
                currentAudio.play().catch(e => console.warn("Audio play error:", e));
                item.classList.add('playing');
                currentPlayingItem = item;
            }
        }
    }


    // === Initialize ===
    function initializeComponent() {
        overlayElement = document.getElementById('focus-mode-overlay');
        closeBtn = document.getElementById('focus-overlay-close-btn');
        startBtn = document.getElementById('focus-overlay-start-btn');
        subtractBtn = document.getElementById('timer-subtract');
        addBtn = document.getElementById('timer-add');
        timerDisplay = document.getElementById('timer-display');
        
        bookSelect = document.getElementById('focus-book-select');
        bookTitleInput = document.getElementById('focus-book-title');
        bookPagesInput = document.getElementById('focus-book-pages');
        bookCoverPreview = document.getElementById('focus-book-cover-preview');
        
        // ‼️ (จับ Elements) ‼️
        bookCurrentInput = document.getElementById('focus-book-current'); // ตอนนี้เป็น <span>
        bookGoalInput = document.getElementById('focus-book-goal');
        progressFill = document.getElementById('book-progress-fill');
        displayTotalPages = document.getElementById('display-total-pages');
        percentageLabel = document.getElementById('book-percentage');

        const themeItems = document.querySelectorAll('.theme-item');
        const soundItems = document.querySelectorAll('.sound-item');

        if (!overlayElement) { setTimeout(initializeComponent, 100); return; }

        // (Listeners เดิม)
        closeBtn.addEventListener('click', window.closeFocusOverlay);
        addBtn.addEventListener('click', () => { settingsCurrentMinutes += TIME_STEP; updateSettingsTimer(); });
        subtractBtn.addEventListener('click', () => { if (settingsCurrentMinutes > MIN_TIME) { settingsCurrentMinutes -= TIME_STEP; updateSettingsTimer(); } });
        overlayElement.addEventListener('click', (e) => { if (e.target === overlayElement) window.closeFocusOverlay(); });

        startBtn.addEventListener('click', () => {
            const selectedTheme = localStorage.getItem('focusTheme') || 'Default';
            const selectedSound = localStorage.getItem('focusSound') || 'Quiet Mind';
            
            // ดึงข้อมูลหนังสือ
            const selectedBookId = bookSelect ? bookSelect.value : null;
            const bookTitle = bookTitleInput ? bookTitleInput.value : '';
            const startPage = bookCurrentInput ? parseInt(bookCurrentInput.textContent) : 0; // (อ่านจาก span)
            const goalPage = bookGoalInput ? parseInt(bookGoalInput.value) : 0;
            
            // สร้าง Object ข้อมูล Session
            const sessionData = {
                minutes: settingsCurrentMinutes,
                theme: selectedTheme,
                sound: selectedSound,
                bookId: selectedBookId,
                bookTitle: bookTitle,
                startPage: startPage,
                goalPage: goalPage
            };
            
            // ส่งไปให้หน้าแม่
            if (typeof onStartCallback === 'function') {
                onStartCallback(sessionData);
            }
            window.closeFocusOverlay(); 
        });

        // ‼️ (แก้ไข) Event Listener สำหรับ Book Select ‼️
        if (bookSelect) {
            bookSelect.addEventListener('change', (e) => {
                const selectedOption = e.target.options[e.target.selectedIndex];
                
                if (selectedOption.value) {
                    // (เลือกหนังสือ)
                    bookTitleInput.value = selectedOption.dataset.title;
                    bookPagesInput.value = selectedOption.dataset.pages;
                    
                    // ‼️ (แก้ไข) ใส่ค่าลงใน span (textContent) ‼️
                    bookCurrentInput.textContent = selectedOption.dataset.current;

                    // Lock fields (ไม่จำเป็นสำหรับ span แต่ใส่ไว้เพื่อความชัวร์)
                    bookTitleInput.disabled = true;
                    bookPagesInput.disabled = true;
                    
                    // Styles
                    bookTitleInput.style.backgroundColor = "#f0f0f0";
                    bookPagesInput.style.backgroundColor = "#f0f0f0";

                    if (selectedOption.dataset.cover) {
                        bookCoverPreview.style.backgroundImage = `url(${selectedOption.dataset.cover})`;
                        bookCoverPreview.style.backgroundSize = 'cover';
                        bookCoverPreview.innerHTML = ''; 
                    } else {
                        bookCoverPreview.style.backgroundImage = 'none';
                    }
                    
                    updateProgressBar();
                    
                } else {
                    // (ไม่เลือก - Reset)
                    bookTitleInput.value = '';
                    bookPagesInput.value = '';
                    
                    // ‼️ (แก้ไข) รีเซ็ต span เป็น 0 ‼️
                    bookCurrentInput.textContent = '0'; 
                    bookCoverPreview.style.backgroundImage = 'none';

                    bookTitleInput.disabled = false;
                    bookPagesInput.disabled = false;

                    bookTitleInput.style.backgroundColor = "";
                    bookPagesInput.style.backgroundColor = "";
                    
                    updateProgressBar(); 
                }
            });
        }

        // ‼️ (ส่วนใหม่: VALIDATION LOGIC for GOAL) ‼️
        if (bookGoalInput) {
            bookGoalInput.addEventListener('input', () => {
                // 1. ดึงค่าทั้งหมด
                const total = parseInt(bookPagesInput.value) || 0;
                const current = parseInt(bookCurrentInput.textContent) || 0;
                let goal = parseInt(bookGoalInput.value);

                // (ถ้าไม่ได้กรอก หรือไม่ใช่ตัวเลข ให้ข้าม)
                if (isNaN(goal)) return;

                // 2. คำนวณหน้าที่เหลือ
                const remainingPages = total - current;

                // 3. ตรวจสอบ: ถ้าเป้าหมาย > หน้าที่เหลือ
                if (goal > remainingPages) {
                    // บังคับให้เท่ากับหน้าที่เหลือ
                    goal = remainingPages;
                    bookGoalInput.value = goal;
                    
                    // (Optional: แจ้งเตือนเล็กน้อยใน Console)
                    console.warn(`Goal limited to remaining pages (${remainingPages})`);
                }
                
                // 4. ตรวจสอบ: ห้ามติดลบ
                if (goal < 0) {
                    bookGoalInput.value = 0;
                }
            });
        }
        
        // (ลบ Listener 'input' ของ bookCurrentInput ออก เพราะ user พิมพ์ไม่ได้แล้ว)

        initSelectionLogic(themeItems, 'focusTheme', 'span');
        initSelectionLogic(soundItems, 'focusSound', '.sound-name');
        soundItems.forEach(item => { item.addEventListener('click', () => { handleSoundClick(item, soundItems); }); });

        isInitialized = true;
        console.log('FocusOverlay Component Initialized!');
        if (shouldOpenWhenReady) { window.openFocusOverlay(onStartCallback); }
    }

    fetch('FocusOverlay/focusOverlay.html')
        .then(response => response.text())
        .then(html => {
            const placeholder = document.getElementById('focus-overlay-placeholder');
            if (placeholder) {
                placeholder.innerHTML = html;
                initializeComponent(); 
            }
        })
        .catch(error => { console.error('Error fetching focus overlay HTML:', error); });

})();