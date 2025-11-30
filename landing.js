// landing.js

document.addEventListener('DOMContentLoaded', () => {

    // --- Mobile Menu Toggle ---
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileNav = document.getElementById('mobile-nav');

   if (mobileToggle && mobileNav) {
        
        // ensure ARIA defaults (so assistive + CSS states predictable)
        if (!mobileToggle.hasAttribute('aria-expanded')) mobileToggle.setAttribute('aria-expanded', 'false');
        if (!mobileNav.hasAttribute('aria-hidden')) mobileNav.setAttribute('aria-hidden', 'true');

        console.log("เจอ Mobile Toggle และ Nav แล้ว -> กำลังเชื่อม Event"); // (Log 2)

        mobileToggle.addEventListener('click', () => {
            console.log("ปุ่ม Burger ถูกคลิก!"); // (Log 3)
            
            // สลับคลาส 'is-active' (และ 'active' เผื่อ CSS ใช้ชื่อนี้)
            mobileToggle.classList.toggle('is-active');
            mobileToggle.classList.toggle('active');

            mobileNav.classList.toggle('is-active');
            mobileNav.classList.toggle('active');

            // update ARIA for accessibility & predictable state
            const isOpen = mobileNav.classList.contains('is-active') || mobileNav.classList.contains('active');
            mobileToggle.setAttribute('aria-expanded', String(isOpen));
            mobileNav.setAttribute('aria-hidden', String(!isOpen));

            // --- DEBUG: print classes + computed styles ---
            console.log('mobileToggle classes:', mobileToggle.className);
            console.log('mobileNav classes:', mobileNav.className);
            const cs = window.getComputedStyle(mobileNav);
            console.log('mobileNav computed:', {
                transform: cs.transform,
                visibility: cs.visibility,
                display: cs.display,
                pointerEvents: cs.pointerEvents,
                opacity: cs.opacity,
                zIndex: cs.zIndex
            });
            console.log('ARIA -> aria-expanded:', mobileToggle.getAttribute('aria-expanded'), 'aria-hidden:', mobileNav.getAttribute('aria-hidden'));
        });
    } else {
        console.error("หา 'mobile-toggle' หรือ 'mobile-nav' ไม่เจอ!"); // (Error 1)
    }
    
    // --- Testimonial Slider ---
    const cardsContainer = document.querySelector('.cards-container');
    const cards = document.querySelectorAll('.card');
    const dots = document.querySelectorAll('.dot');
    const leftNav = document.querySelector('.nav.left');
    const rightNav = document.querySelector('.nav.right');

    // ตรวจสอบว่ามีองค์ประกอบเหล่านี้หรือไม่ก่อนทำงาน
    if (cardsContainer && cards.length > 0 && dots.length > 0 && leftNav && rightNav) {
        
        let currentIndex = 1; // เริ่มที่การ์ดตรงกลาง (index 1)

        // ฟังก์ชันสำหรับอัปเดตสไลด์
        function updateSlider(index) {
            // 1. อัปเดตการ์ด (Active class)
            cards.forEach((card, i) => {
                card.classList.remove('active');
                if (i === index) {
                    card.classList.add('active');
                }
            });

            // 2. อัปเดตจุด (Active class)
            dots.forEach((dot, i) => {
                dot.classList.remove('active');
                if (i === index) {
                    dot.classList.add('active');
                }
            });

            // 3. (สำหรับ Desktop) เลื่อน Container
            // เราจะเลื่อนโดยใช้ transform บน .cards-container
            // อันนี้เป็นวิธีที่ง่ายที่สุด: ให้การ์ดที่ active อยู่ตรงกลาง
            // แต่ในดีไซน์ มันแสดง 3 อันพร้อมกัน
            // เราจะใช้การ 'active' เพื่อขยายการ์ดตรงกลางตาม CSS
            // ถ้าต้องการเลื่อนจริงๆ ต้องคำนวณความกว้างการ์ด
            // สำหรับตอนนี้, CSS จัดการการแสดงผล active แล้ว
            
            // ให้แน่ใจว่าการ์ดที่ active อยู่ใน viewport (สำหรับ mobile)
            if (window.innerWidth <= 992) {
                cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }

            currentIndex = index;
        }

        // 1. คลิกปุ่มลูกศร
        leftNav.addEventListener('click', () => {
            let newIndex = currentIndex - 1;
            if (newIndex < 0) {
                newIndex = cards.length - 1; // วนกลับไปอันสุดท้าย
            }
            updateSlider(newIndex);
        });

        rightNav.addEventListener('click', () => {
            let newIndex = currentIndex + 1;
            if (newIndex >= cards.length) {
                newIndex = 0; // วนกลับไปอันแรก
            }
            updateSlider(newIndex);
        });

        // 2. คลิกจุด
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                updateSlider(index);
            });
        });

        // 3. (สำหรับ Mobile) อัปเดตจุดเมื่อผู้ใช้เลื่อนเอง
        // วิธีนี้ซับซ้อนเล็กน้อย แต่เพื่อให้ง่าย เราจะข้ามไปก่อน
        // และให้การควบคุมผ่านจุดและปุ่มเป็นหลัก

        // ตั้งค่าเริ่มต้น
        updateSlider(currentIndex);
    }
    
    // --- 1. ปุ่ม Join Now (ไปหน้า Login) ---
    const joinNowBtn = document.getElementById('join-now-btn');

    if (joinNowBtn) {
        joinNowBtn.addEventListener('click', () => {
            // (ไปหน้า login.html ที่คุณสร้างไว้)
            window.location.href = 'login.html';
        });
    }

    // --- 2. ปุ่ม Guest Mode (ไปหน้า Index) ---
    const guestModeBtn = document.getElementById('guest-mode-btn');

    if (guestModeBtn) {
        guestModeBtn.addEventListener('click', async () => {
            console.log('Entering Guest Mode...');

            // 2.1 (สำคัญ) เคลียร์สถานะ Login (ถ้ามี)
            if (window.supabase) {
                const { error } = await window.supabase.auth.signOut();
                if (error) {
                    console.error('Error signing out (this is OK if user was already a guest):', error.message);
                }
            }
            
            // 2.2 (สำคัญ) เคลียร์ข้อมูล "Guest" เก่าที่ค้างใน localStorage
            localStorage.removeItem('totalReadingTime');
            localStorage.removeItem('totalUserPoints');
            localStorage.removeItem('totalGems');
            localStorage.removeItem('totalXP');

            // 2.3 ไปที่หน้า Index (ซึ่ง script.js จะเห็นว่าเป็น Guest)
            window.location.href = 'index.html';
        });
    }

});