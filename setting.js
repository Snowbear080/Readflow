// รอให้หน้าเว็บโหลดเสร็จ (และ Supabase พร้อม)
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. เลือกปุ่ม Log out
    const logoutButton = document.getElementById('logout-button');

    // 2. ตรวจสอบว่าเจอปุ่ม
    if (logoutButton) {
        
        // 3. เพิ่ม Event Listener
        logoutButton.addEventListener('click', async () => {
            
            // 4. (ทางเลือก) ยืนยันก่อน
            const confirmLogout = confirm('Are you sure you want to log out?');
            if (!confirmLogout) {
                return; // ถ้าไม่, ก็ยกเลิก
            }

            // 5. สั่ง Supabase ให้ออกจากระบบ
            try {
                const { error } = await window.supabase.auth.signOut();

                if (error) {
                    throw error;
                }

                // 6. (สำคัญ) ล้างค่า Guest ใน localStorage (ถ้ามี)
                localStorage.removeItem('totalReadingTime');
                localStorage.removeItem('totalUserPoints');
                localStorage.removeItem('totalGems');
                localStorage.removeItem('totalXP');

                // 7. ส่งกลับไปหน้า Login
                alert('You have been logged out.');
                window.location.href = 'login.html'; // ‼️ ไปหน้า Login ‼️

            } catch (error) {
                console.error('Error logging out:', error.message);
                alert(`Error: ${error.message}`);
            }
        });
    }
});