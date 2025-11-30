// 🔽🔽🔽 (วางโค้ดนี้ทั้งหมด) 🔽🔽🔽
    const searchInput = document.getElementById('detail-search-input');
    const searchSuggestions = document.getElementById('detail-search-suggestions');
    let debounceTimer;

    // 1. ฟังก์ชันดึงข้อมูล (Live Search)
    async function fetchSuggestions(query) {
        if (query.length < 2) {
            searchSuggestions.classList.remove('active');
            return;
        }

        try {
            // (เรียกใช้ RPC search_books ตัวเดิมใน Database)
            const { data: books, error } = await window.supabase.rpc('search_books', {
                search_term: query
            }).limit(5);

            if (error) throw error;

            if (books.length > 0) {
                renderSuggestions(books);
            } else {
                searchSuggestions.classList.remove('active');
            }
        } catch (err) {
            console.error('Search error:', err);
        }
    }

    // 2. ฟังก์ชันวาดกล่อง Suggestion
    function renderSuggestions(books) {
        searchSuggestions.innerHTML = '';
        books.forEach(book => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `<strong>${book.title}</strong> <span>by ${book.author}</span>`;
            
            // (คลิกแล้วไปหน้าหนังสือเล่มนั้นเลย)
            item.addEventListener('click', () => {
                window.location.href = `/book-detail.html?id=${book.id}`;
            });
            
            searchSuggestions.appendChild(item);
        });
        searchSuggestions.classList.add('active');
    }

    // 3. Event Listeners
    if (searchInput) {
        // (ขณะพิมพ์ - Debounce)
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchSuggestions(searchInput.value);
            }, 300);
        });

        // (กด Enter -> ไปหน้า Library เพื่อค้นหาเต็มรูปแบบ)
        searchInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // ป้องกันการรีโหลดหน้า

                 const query = searchInput.value.trim();

                if (query === '') {
                    // === กรณีที่ 1: ช่องค้นหาว่างเปล่า ===
                    // พาผู้ใช้กลับไปหน้า Library (Home View)
                    window.location.href = `/library.html`;
                 } else {
                    // === กรณีที่ 2: มีคำค้นหา ===
                     // ส่ง Query ไปที่หน้า Library
                     window.location.href = `/library.html?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // (คลิกข้างนอก -> ปิดกล่อง)
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.classList.remove('active');
            }
        });
    }

// ‼️ (สำคัญ) คัดลอก 2 ฟังก์ชันนี้มาจาก library.js ‼️
function generateStarRating(rating) {
    const fullStarSrc = '../icons/icon/star-full.svg'; 
    const halfStarSrc = '../icons/icon/star-half.svg'; 
    const emptyStarSrc = '../icons/icon/star-empty.svg';
    let starsHTML = '';
    const fullStars = Math.floor(rating);
    const decimal = rating - fullStars;
    const halfStars = (decimal >= 0.5) ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStars;
    for (let i = 0; i < fullStars; i++) starsHTML += `<img src="${fullStarSrc}" alt="Full Star">`;
    for (let i = 0; i < halfStars; i++) starsHTML += `<img src="${halfStarSrc}" alt="Half Star">`;
    for (let i = 0; i < emptyStars; i++) starsHTML += `<img src="${emptyStarSrc}" alt="Empty Star">`;
    return starsHTML;
}
function createBookCard(book) {
    const formattedRating = book.average_rating.toFixed(1);
    const detailUrl = `book-detail.html?id=${book.id}`;
    return `
        <div class="book-card">
            <a href="${detailUrl}" class="book-cover-link"><img src="${book.cover_image_url}" alt="${book.title}" class="book-cover"></a>
            <div class="book-info">
                <a href="${detailUrl}" class="book-title-link"><span class="book-title">${book.title}</span></a>
                <span class="book-author">${book.author}</span>
                <div class="book-footer">
                    <div class="rating-display">
                        <span class="rating-score">${formattedRating}</span>
                        <div class="rating-stars">${generateStarRating(book.average_rating)}</div>
                    </div>
                    <button class="book-fav-btn" data-book-id="${book.id}" onclick="alert('Like/Buy/Review ยังไม่เปิดให้บริการครับ')">
                      <img src="icons/icon/heart.svg" alt="Like">
                    </button>
                </div>
            </div>
        </div>
    `;
}
// ‼️ (สิ้นสุดส่วนที่คัดลอกมา) ‼️


// (ฟังก์ชันหลักของหน้านี้)
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. หา ID หนังสือจาก URL
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('id');

    if (!bookId) {
        document.querySelector('.main').innerHTML = '<h1>Book ID not found.</h1>';
        return;
    }

    // (ฟังก์ชันสำหรับดึงข้อมูลหนังสือเล่มเดียว)
    async function fetchBookDetails(id) {
        try {
            const { data: book, error } = await window.supabase
                .from('books')
                .select('*') // (ดึงทุกอย่าง)
                .eq('id', id)  // (ที่ ID ตรงกัน)
                .single(); // (เอาแค่เล่มเดียว)

            if (error) throw error;
            if (!book) throw new Error('Book not found in database');
            
            // (ถ้าสำเร็จ -> ส่งข้อมูลไปวาด)
            renderBookDetails(book);
            
            // (หลังจากนั้น -> ไปหาหนังสือแนะนำ)
            if (book.genres && book.genres.length > 0) {
                fetchRecommendations(book.genres, book.id);
            }

        } catch (error) {
            console.error('Error fetching book details:', error.message);
            document.querySelector('.main').innerHTML = `<h1>Error: ${error.message}</h1>`;
        }
    }

    // (ฟังก์ชันสำหรับ "วาด" ข้อมูลลง HTML)
    function renderBookDetails(book) {
        document.getElementById('book-title').textContent = book.title;
        document.getElementById('book-author').textContent = `by ${book.author}`;
        document.getElementById('book-description').textContent = book.short_detail;
        document.getElementById('book-cover-img').src = book.cover_image_url;
        
        // (วาด Rating)
        document.getElementById('rating-box').innerHTML = `${book.average_rating.toFixed(1)} ${generateStarRating(book.average_rating)}`;
        
        // (วาด Tags)
        const tagsList = document.getElementById('genre-tags-list');
        tagsList.innerHTML = ''; // (ล้างของเก่า)
        if (book.genres) {
            book.genres.forEach(genre => {
                tagsList.innerHTML += `<span class="genre-tag">${genre}</span>`;
            });
        }
        if (book.categories) {
            book.categories.forEach(category => {
                tagsList.innerHTML += `<span class="genre-tag">${category}</span>`;
            });
        }
    }

    // (ฟังก์ชันสำหรับดึง "You May Like")
    async function fetchRecommendations(genres, currentBookId) {
        const listElement = document.getElementById('recommendations-list');
        if (!listElement) return;

        try {
            // (ดึงหนังสือ 5 เล่ม ที่มี "Genre" แรกตรงกัน)
            const { data: books, error } = await window.supabase
                .from('books')
                .select('*')
                .contains('genres', [genres[0]]) // (หาจาก Genre แรก)
                .neq('id', currentBookId) // (ไม่เอาเล่มที่โชว์อยู่)
                .limit(5);

            if (error) throw error;
            
            if (books.length > 0) {
                listElement.innerHTML = '';
                books.forEach(book => {
                    listElement.innerHTML += createBookCard(book);
                });
            } else {
                listElement.innerHTML = '<p>No recommendations found.</p>';
            }

        } catch (error) {
            console.error('Error fetching recommendations:', error.message);
            listElement.innerHTML = '<p>Error loading recommendations.</p>';
        }
    }


    // --- 3. สั่งให้ฟังก์ชันหลักทำงาน ---
    fetchBookDetails(bookId);

});