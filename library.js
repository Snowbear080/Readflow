// (รอให้หน้าเว็บโหลดเสร็จ)
document.addEventListener('DOMContentLoaded', () => {
    
    // (เลือก "พื้นที่" ที่เราจะเติมหนังสือ)
    const popularList = document.getElementById('popular-list');
    const forYouList = document.getElementById('for-you-list');
    const newList = document.getElementById('new-releases-list');
    const collectionList = document.getElementById('collection-list');

    // ‼️ (เลือก Elements ใหม่) ‼️
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    const searchResultsSection = document.getElementById('search-results-section');
    const searchResultsList = document.getElementById('search-results-list');
    const searchResultsTitle = document.getElementById('search-results-title');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const categoryTabsContainer = document.getElementById('category-tabs-container');
    const mainSectionTitle = document.getElementById('main-section-title');
    const seeAllLink = document.getElementById('see-all-link');
    const allCatLink = document.getElementById('all-category-link');

    const defaultSections = [
        document.getElementById('category-section'),
        document.getElementById('popular-section'),
        document.getElementById('for-you-section'),
        document.getElementById('new-releases-section'),
        document.getElementById('collection-section'),
        document.getElementById('pagination-section')
    ];

    let debounceTimer;

    function loadDefaultView() {
        // 1. ตรวจสอบว่าทุกอย่างแสดงผล
        defaultSections.forEach(section => { 
            if (section) section.style.display = 'block';
        });
        if(backBtn) backBtn.style.display = 'none';
        if(categorySection) categorySection.style.display = 'block';
        if(paginationSection) paginationSection.style.display = 'flex';
        
        // 2. ซ่อนส่วนค้นหา
        searchResultsSection.style.display = 'none';
        loadTabContent('Popular', 'categories');
        
        // 3. ‼️ สั่งให้โหลดข้อมูลทั้งหมด ‼️
        renderBooks('Popular', popularList, 5,'categories'); 
        renderBooks('For You', forYouList, 10,'categories');
        renderBooks('New Release', newList, 5,'categories');
        renderBooks('Collection', collectionList, 5,'categories');
    }

    // === 2. ฟังก์ชันแสดง/ซ่อน Sections ===
    function showDefaultSections() {
        defaultSections.forEach(section => { if (section) section.style.display = 'block'; });
        searchResultsSection.style.display = 'none';
        searchSuggestions.classList.remove('active'); // (ซ่อน Suggestion)
    }
    function showSearchResults() {
        defaultSections.forEach(section => { if (section) section.style.display = 'none'; });
        searchResultsSection.style.display = 'block';
        searchSuggestions.classList.remove('active'); // (ซ่อน Suggestion)
    }
    function hideSuggestions() {
        searchSuggestions.classList.remove('active');
    }

    // === 3. ฟังก์ชัน "ค้นหา" (ทั้ง 2 แบบ) ===

    // (A. ค้นหาแบบ "Live" (สำหรับ Suggestion))
    async function fetchSuggestions(query) {
        if (query.length < 2) { // (ไม่ค้นหาถ้าคำสั้นไป)
            hideSuggestions();
            return;
        }

        try {
            // (เรียก RPC Function เดิม แต่ Limit 5 อัน)
            const { data: books, error } = await window.supabase.rpc('search_books', {
                search_term: query
            }).limit(5);

            if (error) throw error;
            if (books.length > 0) {
                renderSuggestions(books);
            } else {
                hideSuggestions();
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error.message);
            hideSuggestions();
        }
    }

    // (B. ค้นหาแบบ "เต็ม" (เมื่อกด Enter หรือ คลิก))
    async function performSearch(query) {
        if (!query || query.trim() === '') {
            loadDefaultView();
            return;
        }
        
        console.log(`Performing full search for: ${query}`);
        showSearchResults();
        searchResultsList.innerHTML = '<div class="book-card-placeholder">Searching...</div>';
        searchResultsTitle.textContent = `SEARCH RESULTS FOR "${query.toUpperCase()}"`;

        try {
            const { data: books, error } = await window.supabase.rpc('search_books', {
                search_term: query
            });

            if (error) throw error;
            if (books.length === 0) {
                searchResultsList.innerHTML = '<div class="book-card-placeholder">No books found matching your search.</div>';
                return;
            }

            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            searchResultsList.innerHTML = html;

        } catch (error) {
            console.error('Error performing search:', error.message);
            searchResultsList.innerHTML = '<div class="book-card-placeholder">Error loading results.</div>';
        }
    }

    // (A. วาดกล่อง Suggestion)
    function renderSuggestions(books) {
        searchSuggestions.innerHTML = ''; // (ล้างของเก่า)
        books.forEach(book => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            // (สร้าง HTML แบบในรูป)
            item.innerHTML = `<strong>${book.title}</strong> <span>by ${book.author}</span>`;
            
            // (ถ้า "คลิก" คำแนะนำ)
            item.addEventListener('click', () => {
                searchInput.value = book.title; // (Autofill)
                hideSuggestions();
                performSearch(book.title); // (ค้นหาเต็มทันที)
            });
            searchSuggestions.appendChild(item);
        });
        searchSuggestions.classList.add('active'); // (แสดงกล่อง)
    }

    /**
    * สร้าง HTML สำหรับแสดงดาวตามเรตติ้ง (เต็ม/ครึ่ง/ว่าง)
    * @param {number} rating - คะแนน (เช่น 4.5)
    * @returns {string} - สตริง HTML ของ <img> ดาว 5 ดวง
    */
    function generateStarRating(rating) {
        // ‼️ (สำคัญ) แก้ Path 3 บรรทัดนี้ให้เป็นรูปของคุณ ‼️
        const fullStarSrc = 'icons/icon/star-full.svg'; // (1. ดาวเต็ม)
        const halfStarSrc = 'icons/icon/star-half.svg'; // (2. ดาวครึ่ง)
        const emptyStarSrc = 'icons/icon/star-empty.svg'; // (3. ดาวไม่เต็ม)

        let starsHTML = '';
        
        // 1. คำนวณจำนวนดาว
        const fullStars = Math.floor(rating); // (ดาวเต็ม = 4)
        const decimal = rating - fullStars;    // (ทศนิยม = 0.5)
        
        // (โลจิกตามเงื่อนไขของคุณ)
        const halfStars = (decimal >= 0.5) ? 1 : 0; // (ถ้า 4.5-4.9 = 1 ดาวครึ่ง)
        const emptyStars = 5 - fullStars - halfStars; // (ที่เหลือคือดาวไม่เต็ม)

        // 2. สร้าง HTML (เรียง: เต็ม -> ครึ่ง -> ว่าง)
        for (let i = 0; i < fullStars; i++) {
            starsHTML += `<img src="${fullStarSrc}" alt="Full Star">`;
        }
        for (let i = 0; i < halfStars; i++) {
            starsHTML += `<img src="${halfStarSrc}" alt="Half Star">`;
        }
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += `<img src="${emptyStarSrc}" alt="Empty Star">`;
        }
        
        return starsHTML;
    }

    // (ฟังก์ชันสำหรับ "สร้าง" HTML ของการ์ดหนังสือ 1 ใบ)
    function createBookCard(book) {
    
    // (จัดเรตติ้งให้มี 1 ทศนิยมเสมอ เช่น 4 -> 4.0)
    const formattedRating = book.average_rating.toFixed(1);

    // (สร้างลิงก์ปลายทาง)
    const detailUrl = `book-detail.html?id=${book.id}`;

        return `
            <div class="book-card">
                
                <a href="${detailUrl}" class="book-cover-link">
                    <img src="${book.cover_image_url}" alt="${book.title}" class="book-cover">
                </a>
                
                <div class="book-info">
                    <a href="${detailUrl}" class="book-title-link">
                        <span class="book-title">${book.title}</span>
                    </a>
                    <span class="book-author">${book.author}</span>
                    
                    <div class="book-footer">
                        <div class="rating-display">
                            <span class="rating-score">${formattedRating}</span>
                            <div class="rating-stars">
                                ${generateStarRating(book.average_rating)}
                            </div>
                        </div>
                        
                        <button class="book-fav-btn" data-book-id="${book.id}" onclick="alert('Like/Buy/Review ยังไม่เปิดให้บริการครับ')">
                        <img src="icons/icon/heart.svg" alt="Like">
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    

    // (ฟังก์ชันสำหรับ "โหลด" และ "วาด" หนังสือลงใน List)
    async function renderBooks(categoryName, listElement, limit = 5, columnName = 'categories') {
        if (!listElement) return;

        try {
            // ‼️ (แก้ไข) ใช้ ColumnName ที่รับเข้ามาใน contains() ‼️
            const { data: books, error } = await window.supabase
                .from('books')
                .select('*') 
                .contains(columnName, [categoryName]) 
                .limit(limit);

            if (error) throw error;
            
            if (books.length === 0) {
                listElement.innerHTML = '<div class="book-card-placeholder">No books in this category yet.</div>';
                return;
            }
            
            let html = '';
            books.forEach(book => { html += createBookCard(book); });
            listElement.innerHTML = html;

        } catch (error) {
            console.error(`Error fetching "${categoryName}" books:`, error.message);
            listElement.innerHTML = '<div class="book-card-placeholder">Error loading books.</div>';
        }
    }

    // ‼️ (ฟังก์ชันใหม่: สำหรับแสดง/ซ่อน Section) ‼️
    function showDefaultSections() {
        defaultSections.forEach(section => {
            if (section) section.style.display = 'block';
        });
        searchResultsSection.style.display = 'none';
    }
    function showSearchResults() {
        defaultSections.forEach(section => {
            if (section) section.style.display = 'none';
        });
        searchResultsSection.style.display = 'block';
    }

    // ‼️ (ฟังก์ชันใหม่: สำหรับ "ค้นหา") ‼️
    async function performSearch(query) {
        if (!query || query.trim() === '') {
            showDefaultSections();
            return;
        }

        console.log(`Searching for: ${query}`);
        showSearchResults(); // (แสดงส่วนผลลัพธ์)
        searchResultsList.innerHTML = '<div class="book-card-placeholder">Searching...</div>';
        searchResultsTitle.textContent = `SEARCH RESULTS FOR "${query.toUpperCase()}"`;

        try {
            // 1. ‼️ เรียก RPC Function ที่เราสร้างใน SQL ‼️
            const { data: books, error } = await window.supabase.rpc('search_books', {
                search_term: query
            });

            if (error) throw error;

            if (books.length === 0) {
                searchResultsList.innerHTML = '<div class="book-card-placeholder">No books found matching your search.</div>';
                return;
            }

            // 2. วาดผลลัพธ์
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            searchResultsList.innerHTML = html;

        } catch (error) {
            console.error('Error performing search:', error.message);
            searchResultsList.innerHTML = '<div class="book-card-placeholder">Error loading results.</div>';
        }
    }
    
    // ‼️ (ฟังก์ชันใหม่: สำหรับกรองหนังสือตามหมวดหมู่) ‼️
    async function loadTabContent(categoryName, columnName) { // ‼️ รับ ColumnName ‼️
        if (!popularList) return;
        
        // 1. UI: Set the header title and See All Link
        mainSectionTitle.textContent = categoryName.toUpperCase();
        seeAllLink.href = `?view=${encodeURIComponent(categoryName)}&column=${columnName}`; // ‼️ ส่ง column ไปด้วย
        
        // 2. UI: จัดการพื้นหลัง Dynamic (ตามที่เห็นในคลิป)
        const sectionElement = document.getElementById('popular-section');
        if (sectionElement) {
            // สร้างชื่อ Class (เช่น Best Selling -> category-bestselling)
            const newClass = `category-${categoryName.toLowerCase().replace(/\s/g, '')}`;
            
            // ลบ Class เก่าทั้งหมดที่ขึ้นต้นด้วย 'category-'
            sectionElement.className = sectionElement.className
                .split(' ')
                .filter(c => !c.startsWith('category-'))
                .join(' ');
                
            // เพิ่ม Class ใหม่
            sectionElement.classList.add(newClass);
        }
        
        // 3. UI: Show loading
        popularList.innerHTML = '<div class="book-card-placeholder">Loading books...</div>';

        try {
            // 3. Query Supabase
            const { data: books, error } = await window.supabase
                .from('books')
                .select('*') 
                // ‼️ (แก้ไข) ใช้ ColumnName ที่รับเข้ามา ‼️
                .contains(columnName, [categoryName]) 
                .limit(5); 

            if (error) throw error

            // 5. Render books
            if (books.length > 0) {
                let html = '';
                books.forEach(book => { html += createBookCard(book); });
                popularList.innerHTML = html; 
            } else {
                popularList.innerHTML = '<div class="book-card-placeholder">No books found in this category.</div>';
            }

        } catch (error) {
            console.error(`Error during tab load:`, error.message);
            popularList.innerHTML = `<div class="book-card-placeholder">Error loading category results: ${error.message}</div>`;
        }
    }


    if (categoryTabsContainer) {
        categoryTabsContainer.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('button');
            if (targetBtn) {
                const categoryName = targetBtn.dataset.category;
                const columnName = targetBtn.dataset.column; // ‼️ อ่าน data-column

                if (!categoryName || !columnName) {
                    console.warn('Category button clicked but data-category or data-column is missing!');
                    return; 
                }

                // 1. Update active state (UI)
                document.querySelectorAll('.category-tabs button').forEach(btn => {
                    btn.classList.remove('active');
                });
                targetBtn.classList.add('active');

                // 2. ‼️ โหลดเนื้อหาหลัก ‼️
                loadTabContent(categoryName, columnName); // ‼️ ส่ง ColumnName เข้าไป
            }
        });
    }

    // ‼️ (เชื่อม Event Listener) ‼️
    // (ค้นหาเมื่อกด "Enter")
    if(searchInput) {
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                clearTimeout(debounceTimer); 
                hideSuggestions();           

                const query = searchInput.value.trim(); 

                if (query === '') {
                    // === กรณีที่ 1: ช่องค้นหาว่างเปล่า (เคลียร์ URL และโหลดข้อมูล) ===
                    
                    // 1. ล้าง URL ให้สะอาด (เอา ?q=... ออก)
                    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.pushState({ path: newUrl }, '', newUrl);

                    // 2. ‼️ (แก้ไข) เรียกฟังก์ชันโหลดหน้าแรก ‼️
                    loadDefaultView(); 
                } else {
                    // === กรณีที่ 2: มีคำค้นหา ===
                    const newUrl = `${window.location.pathname}?q=${encodeURIComponent(query)}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                    performSearch(query);
                }
            }
        });
    }

    // (โค้ดสำหรับ Live Search input และ Debounce ... เหมือนเดิม)
    if(searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer); 
            const query = searchInput.value;
            
            if (query.length < 2) {
                hideSuggestions();
                return;
            }
            
            debounceTimer = setTimeout(() => {
                fetchSuggestions(query);
            }, 300); 
        });
    }

    // (ล้างการค้นหาจากปุ่ม "Clear Search" - แก้ไขให้เรียก loadDefaultView)
    if(clearSearchBtn) {
        clearSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchInput.value = '';
            
            // ‼️ (สำคัญ) ล้าง URL และเรียกโหลดหน้าแรก ‼️
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            loadDefaultView();
        });
    }

    // (โค้ด Event Listener อื่นๆ - เหมือนเดิม)
    document.addEventListener('click', (e) => {
        if (searchInput && searchSuggestions && !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSuggestions();
        }
    });

    const backBtn = document.getElementById('library-back-btn');
    const categorySection = document.getElementById('category-section');
    const paginationSection = document.getElementById('pagination-section');

    // 2. อ่าน URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const queryFromUrl = urlParams.get('q');     
    const viewFromUrl = urlParams.get('view');  

    // ‼️ ฟังก์ชันใหม่: ซ่อนทุกอย่างแบบ "กวาดเรียบ" ‼️
    function hideAllSections() {
        // 1. ซ่อน Category Tabs
        if(categorySection) categorySection.style.display = 'none';
        
        // 2. ซ่อนผลการค้นหา
        if(searchResultsSection) searchResultsSection.style.display = 'none';

        // 3. ‼️ ซ่อน "ทุก Section หนังสือ" (โดยใช้ Class) ‼️
        const allBookSections = document.querySelectorAll('.book-section');
        allBookSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // 4. ซ่อน Pagination
        if(paginationSection) paginationSection.style.display = 'none';
    }

    // ฟังก์ชันแสดงเฉพาะ Section ที่ต้องการ
    // เพิ่มพารามิเตอร์ `columnName` เพื่อให้สามารถแสดงทั้ง `categories` และ `genres`
    function showTargetSection(sectionId, listId, categoryName, columnName = 'categories') {
        hideAllSections(); // (ซ่อนทุกอย่างก่อน)

        // แสดงปุ่ม Back
        if(backBtn) backBtn.style.display = 'flex';

        // อัปเดตหัวข้อของ section/See All link (ถ้ามี)
        if (mainSectionTitle) mainSectionTitle.textContent = categoryName.toUpperCase();
        if (seeAllLink) seeAllLink.href = `?view=${encodeURIComponent(categoryName)}&column=${encodeURIComponent(columnName)}`;

        // แสดง Section ที่เลือก
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.style.display = 'block';
            
            // (ซ่อนปุ่ม See All ของ Section นี้ เพราะเข้ามาดูแล้ว)
            const seeAllBtn = targetSection.querySelector('.section-header a');
            if(seeAllBtn) seeAllBtn.style.display = 'none';
        }

        // โหลดข้อมูล "เยอะๆ" (20 เล่ม) โดยส่ง columnName ต่อไปด้วย
        const listElement = document.getElementById(listId);
        if (listElement) {
            renderBooks(categoryName, listElement, 20, columnName);
        }
    }

   function resetCategoryLimit() {
        if(categoryTabsContainer) {
            categoryTabsContainer.classList.remove('show-all');
        }
    }
    // ‼️ NEW: ฟังก์ชันสำหรับแสดง show-all class ‼️
    function enableShowAllCategories() {
        if(categoryTabsContainer) {
            categoryTabsContainer.classList.add('show-all');
        }
    }

    // ‼️ ฟังก์ชันใหม่: แสดงเฉพาะ Category Tabs ‼️
    function showAllCategoriesView() {
        // 1. ซ่อน Section หนังสือรอง และ Search Results
        const secondarySections = document.querySelectorAll(
            '#for-you-section, #new-releases-section, #collection-section, #pagination-section, #search-results-section'
        );
        secondarySections.forEach(section => { if(section) section.style.display = 'none'; });

        // 2. แสดง Category Tabs และ Popular Section (ส่วนแสดงผลหลัก)
        if(document.getElementById('popular-section')) document.getElementById('popular-section').style.display = 'block';
        if(categorySection) categorySection.style.display = 'block';

        // 3. ‼️ สั่งแสดงผลทั้งหมด ‼️
        enableShowAllCategories();
        

        // 3. UI: Show Back Button and hide All Category link
        if(backBtn) backBtn.style.display = 'flex'; // แสดงปุ่ม Back
        if(allCatLink) allCatLink.style.display = 'none'; // ซ่อนลิงก์ All Category

        // 4. Logic: โหลด Tab Popular (หรือ Tab ที่ Active อยู่) เข้าไปในพื้นที่หลัก
        // (เพื่อให้หน้าไม่ว่างเปล่า)
        loadTabContent('Popular', 'categories');
    }


    // --- ตัดสินใจว่าจะโหลดอะไร ---

    if (queryFromUrl) {
        // 1. มีคำค้นหาใน URL -> Search Mode
        if (searchInput) searchInput.value = queryFromUrl;
        performSearch(queryFromUrl);
    } else if (viewFromUrl) {
        // 2. กด See All มา -> View Category Mode
        // อ่านพาราม `column` ถ้ามี (เช่น genres หรือ categories)
        const columnFromUrl = urlParams.get('column') || 'categories';

        // ถ้าเป็นชื่อ section พิเศษ ให้ไปยัง section ที่ตรงกัน
        if (viewFromUrl === 'Popular') {
            showTargetSection('popular-section', 'popular-list', 'Popular', columnFromUrl);
        } 
        else if (viewFromUrl === 'For You') {
            showTargetSection('for-you-section', 'for-you-list', 'For You', columnFromUrl);
        } 
        else if (viewFromUrl === 'New Release') {
            showTargetSection('new-releases-section', 'new-releases-list', 'New Release', columnFromUrl);
        } 
        else if (viewFromUrl === 'Collection') {
            showTargetSection('collection-section', 'collection-list', 'Collection', columnFromUrl);
        } 
        else if (viewFromUrl === 'AllCategories') {
        // 2. กด All Category มา -> Show All Tabs View
        showAllCategoriesView();
        }
        
        else {
            // สำหรับ category อื่นๆ (เช่น Romantic, Fantasy, Horror, Best Selling)
            // เราจะแสดง `popular-section` โดยโหลดข้อมูลจาก column ที่ส่งมา
            showTargetSection('popular-section', 'popular-list', viewFromUrl, columnFromUrl);
        }
    } else {
        // 3. ‼️ Case C: ไม่มี Parameter เลย -> โหลดหน้าแรกปกติ ‼️
        loadDefaultView();
        resetCategoryLimit();
    }
});