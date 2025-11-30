function formatTime(totalMinutes) {
    if (totalMinutes === 0) {
        return '0 min';
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        if (minutes > 0) {
            return `${hours} Hr ${minutes} min`; // เช่น: 1 Hr 30 min
        } else {
            return `${hours} Hr`; // เช่น: 2 Hr
        }
    } else {
        // น้อยกว่า 1 ชั่วโมง
        return `${minutes} min`; // เช่น: 45 min
    }
}


// รอให้หน้าเว็บโหลดเสร็จ (และ Supabase พร้อม)
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เลือก "List" ที่เราจะเติมข้อมูล
    const listElement = document.getElementById('leaderboard-list');

    // 2. สร้างฟังก์ชันสำหรับดึงข้อมูล
    async function loadLeaderboard() {
        if (!listElement) return; 
        
        try {
            // 3. ดึงข้อมูล (เหมือนเดิม)
            const { data, error } = await window.supabase
                .from('profiles') 
                .select('username, total_reading_time') 
                .order('total_reading_time', { ascending: false }) 
                .limit(20); 

            if (error) {
                throw error;
            }

            if (data.length === 0) {
                listElement.innerHTML = '<li>No data yet. Start reading!</li>';
                return;
            }

            // 5. ถ้าดึงสำเร็จ
            listElement.innerHTML = ''; 

            // 6. วนลูป (forEach) ข้อมูลที่ได้
            data.forEach((user, index) => {
                
                const rank = index + 1;
                
                // (ลบโค้ด const hours = ... เก่าทิ้ง)

                const li = document.createElement('li');
                li.className = 'leaderboard-item';
                
                if (rank === 1) li.classList.add('rank-1');
                if (rank === 2) li.classList.add('rank-2');
                if (rank === 3) li.classList.add('rank-3');
                
                // ‼️ 7. (แก้ไข) เรียกใช้ formatTime() ตรงนี้ ‼️
                li.innerHTML = `
                    <span class="rank">#${rank}</span>
                    <span class="username">${user.username}</span>
                    <span class="time">${formatTime(user.total_reading_time)}</span>
                `;
                
                listElement.appendChild(li);
            });

        } catch (error) {
            console.error('Error fetching leaderboard:', error.message);
            listElement.innerHTML = `<li>Error: ${error.message}</li>`;
        }
    }

    // 7. สั่งให้ฟังก์ชันทำงานทันทีที่หน้าโหลด!
    loadLeaderboard();

});