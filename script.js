// === รอให้หน้าเว็บโหลดเสร็จก่อน แล้วค่อยเริ่มทำงาน JavaScript ทั้งหมด ===
document.addEventListener('DOMContentLoaded', function() {

  const startFocusBtn = document.querySelector('.start-btn');
    
    if (startFocusBtn) {
        startFocusBtn.addEventListener('click', () => {
            // เปิด Overlay และรอรับ data (Object)
            window.openFocusOverlay( (sessionData) => {
                console.log("Starting Session with:", sessionData);
                
                // ‼️ 1. (สำคัญ) บันทึกข้อมูลทั้งหมดลง LocalStorage ในชื่อ 'currentSession' ‼️
                localStorage.setItem('currentSession', JSON.stringify(sessionData));
                
                // 2. ไปหน้าอ่าน
                window.location.href = 'reading.html';
            });
        });
    }

  function checkFocusFlag() {
  // ... (โค้ดเช็ก flag เหมือนเดิม) ...
    if (flag === 'true') {
      localStorage.removeItem('openFocusOnLoad');

      // (เรียกใช้ฟังก์ชัน "สากล" แทน)
      window.openFocusOverlay( (timeSelected) => {
          localStorage.setItem('focusTimeMinutes', timeSelected);
          window.location.href = 'reading.html';
      });
    }
  }

  // --- 4. ส่วนอัปเดตสถิติจาก localStorage (เมื่อหน้า index โหลด) ---
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
  // 1. นี่คือ "ตาราง XP ขั้นบันได" ที่คุณพูดถึง
  const LEVEL_THRESHOLDS = [
    0,    // Level 1
    25,   // Level 2 
    60,   // Level 3 
    90,   // Level 4 
    100,  // Level 5 
    150,  // ...
    210,
    280,
    360,
    450,  // Level 10
    // (เพิ่มเลเวลต่อไปได้ตามต้องการ)
  ];

// 2. ฟังก์ชันอัจฉริยะสำหรับ "คำนวณ" เลเวลจาก XP
  function calculateLevel(totalXP) {
    let currentLevel = 1;
    let xpForNextLevel = LEVEL_THRESHOLDS[1];
    let xpForCurrentLevel = LEVEL_THRESHOLDS[0];

    // วนลูปหาเลเวลปัจจุบัน
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
        if (totalXP >= LEVEL_THRESHOLDS[i]) {
            currentLevel = i + 1;
            xpForCurrentLevel = LEVEL_THRESHOLDS[i];
            xpForNextLevel = (i + 1 < LEVEL_THRESHOLDS.length) ? LEVEL_THRESHOLDS[i+1] : xpForCurrentLevel;
        } else {
            // เจอเลเวลแล้ว ออกจากลูป
            xpForNextLevel = LEVEL_THRESHOLDS[i];
            break;
        }
    }

    // คำนวณ XP ที่มีในเลเวลปัจจุบัน
    const currentLevelXP = totalXP - xpForCurrentLevel;
    const requiredXP = xpForNextLevel - xpForCurrentLevel;

    // (จัดการกรณีเลเวลสูงสุด)
    if (requiredXP <= 0) {
        return {
            level: currentLevel,
            currentXP: currentLevelXP,
            requiredXP: "MAX"
        };
    }

    return {
        level: currentLevel,       // เช่น 3
        currentXP: currentLevelXP, // เช่น 15 (ถ้ามี 45 XP)
        requiredXP: requiredXP     // เช่น 30 (เพราะ 60 - 30)
    };
  }
  async function updateStatsFromStorage() {
    try {
      // 1. ตรวจสอบว่าผู้ใช้ Login อยู่หรือไม่
      const { data: { user } } = await window.supabase.auth.getUser();

      // 1.1. ตั้งค่าเริ่มต้น (สำหรับ Guest)
      let totalTime = parseInt(localStorage.getItem('totalReadingTime') || '0');
      let totalGems = parseInt(localStorage.getItem('totalGems') || '0'); 
      let totalXP = parseInt(localStorage.getItem('totalXP') || '0');
      let username = 'MR.FLOW'; 
      let handle = '@flowy';
      let rank = 'Unranked'; // ‼️ (Rank เริ่มต้น)
      let streak = 0; 

      if (user) {
        // --- 2. ถ้า Login อยู่ (User Path) ---
        console.log('User is logged in. Fetching from Supabase...');
        
        // 2.1. ดึงข้อมูล Profile (เหมือนเดิม)
        const { data: profileData, error: profileError } = await window.supabase
          .from('profiles')
          .select('total_reading_time, gems, username, xp')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else if (profileData) {
          totalTime = profileData.total_reading_time;
          totalGems = profileData.gems; 
          totalXP = profileData.xp;
          if (profileData.username) { 
            username = profileData.username;
          }
          const userId = user.id; 
          const numericId = userId.replace(/[^0-9]/g, ''); 
          const shortId = numericId.slice(0, 10); 
          handle = `@${shortId}`; 
        }
        
        // ‼️ 2.2. (ใหม่) ดึง Rank จากฟังก์ชันที่เราสร้าง ‼️
        const { data: rankData, error: rankError } = await window.supabase.rpc('get_user_rank', {
            user_id_input: user.id
        });

        if (rankError) {
            console.error('Error fetching rank:', rankError);
        } else if (rankData) {
            rank = `#${rankData}`; // ‼️ อัปเดต Rank (เช่น #1, #5)
        }

      } else {
        // --- 3. ถ้าไม่ได้ Login (Guest Path) ---
        console.log('User is a guest. Fetching from localStorage...');
      }

      // --- 4. อัปเดตหน้าเว็บ (DOM Update) ---
      
      // 4.1. อัปเดต Username (เหมือนเดิม)
      const usernameElement = document.querySelector('.user-details .ID');
      const handleElement = document.querySelector('.user-details .handle');
      if (usernameElement) usernameElement.textContent = username.toUpperCase();
      if (handleElement) handleElement.textContent = handle;
      
      // 4.2. อัปเดต Stats
      
      // (Rank)
      const rankElement = document.getElementById('rank-value');
      if (rankElement) rankElement.textContent = rank; // ‼️ (อัปเดต Rank ใหม่)
      
      // ‼️ 4.2.1. (แก้บั๊ก Total Time = 0) ‼️
      // (เปลี่ยน > 0 เป็น >= 0)
      if (totalTime >= 0) { 
        // ‼️ (นี่คือจุดที่แก้บั๊ก Total Time) ‼️
        const totalTimeText = document.querySelector('.journey-map p');
        if (totalTimeText) {
          totalTimeText.textContent = `Total Time: ${totalTime} minutes`;
        }
        
        const timeElement = document.getElementById('reading-time-value');
        if (timeElement) timeElement.textContent = formatTime(totalTime);
      }
      
      // (Gems)
      if (totalGems >= 0) { 
        const gemsElement = document.getElementById('gems-value');
        if (gemsElement) gemsElement.textContent = totalGems;
      }

      // (Streak)
      const streakElement = document.getElementById('streak-value');
      if (streakElement) streakElement.textContent = `${streak} Day`;

      // 4.3. อัปเดต Level และ XP
      // (โค้ดนี้ถูกต้องอยู่แล้ว)
      const levelInfo = calculateLevel(totalXP);
      const levelElement = document.getElementById('xp-level');
      const progressElement = document.getElementById('xp-progress');
      if (levelElement && progressElement) {
        levelElement.textContent = `Level ${levelInfo.level}`;
        if (levelInfo.requiredXP === "MAX") {
            progressElement.textContent = `MAX LEVEL (${levelInfo.currentXP} XP)`;
        } else {
            progressElement.textContent = `${levelInfo.currentXP} / ${levelInfo.requiredXP} XP`;
        }
      }

      // 4.4. อัปเดต Journey Map
      // (โค้ดนี้ถูกต้องอยู่แล้ว)
      const milestones = document.querySelectorAll('.milestone[data-time]');
      for (let i = 0; i < milestones.length - 1; i++) {
        // ... (โค้ด % fill)
        const currentMilestone = milestones[i];
        const nextMilestone = milestones[i + 1];
        const startTime = parseInt(currentMilestone.dataset.time);
        const endTime = parseInt(nextMilestone.dataset.time);
        const segmentDuration = endTime - startTime;
        let fillPercentage = 0;
        if (totalTime >= endTime) {
          fillPercentage = 100;
        } else if (totalTime > startTime) {
          const timeInSegment = totalTime - startTime;
          fillPercentage = (timeInSegment / segmentDuration) * 100;
        }
        currentMilestone.style.setProperty('--fill-percentage', `${fillPercentage}%`);
      }
      milestones.forEach(milestone => {
        // ... (โค้d .active)
        const timeRequired = parseInt(milestone.dataset.time);
        if (totalTime >= timeRequired) {
          milestone.classList.add('active');
        } else {
          milestone.classList.remove('active');
        }
      });

    } catch (err) {
      console.error('Error in updateStatsFromStorage:', err);
    }
  }
  updateStatsFromStorage(); // สั่งให้ทำงานทุกครั้งที่หน้า index.html โหลด
}); // <--- ปิดวงเล็บของ DOMContentLoaded