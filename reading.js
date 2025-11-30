document.addEventListener('DOMContentLoaded', function() {

  // === 1. Elements ===
  const mainTimerDisplay = document.getElementById('countdown-timer');
  const pauseBtn = document.getElementById('pause-btn');
  const pauseOverlay = document.getElementById('pause-overlay');
  const continueBtn = document.getElementById('continue-btn');
  const settingsBtn = document.getElementById('settings-btn'); 
  const leaveBtn = document.getElementById('leave-btn');
  const readingContainer = document.querySelector('.reading-container'); // ‼️ (สำหรับเปลี่ยนธีม)

  // Summary Elements
  const summaryOverlay = document.getElementById('summary-overlay');
  const continueSummaryBtn = document.getElementById('continue-summary-btn');
  const redoButton = document.getElementById('redo-button'); 

  // Variables
  let timerInterval = null; 
  let totalSeconds = 0;
  let sessionData = {}; // ‼️ เก็บข้อมูล Session ทั้งหมดตรงนี้
  let bgMusic = null;   // ‼️ ตัวเล่นเพลง

  // ตัวแปรเก็บตัวนับเวลา Fade 
  let fadeInterval = null;

  // sound effect
  let successSound = new Audio('Sound/sound effect/bonus.mp3'); // ‼️ (ใส่ไฟล์เสียงของคุณ)
  successSound.volume = 0.3;
  let failSound = new Audio('Sound/sound effect/fail.mp3'); // ‼️ (ใส่ไฟล์เสียงของคุณ)
  failSound.volume = 0.3;

  // === 2. ฟังก์ชันจัดการเสียงและธีม ===
  
  function applyTheme(theme) {
    // (ลบคลาสเก่าออกก่อน)
    readingContainer.classList.remove('theme-default', 'theme-day', 'theme-night');
    
    // (ใส่คลาสใหม่ - คุณต้องไปเขียน CSS เพิ่ม)
    // หรือเปลี่ยนรูปพื้นหลังโดยตรงแบบนี้:
    if (theme === 'Day') {
        readingContainer.style.backgroundImage = "url('image/day.svg')"; // (ใส่รูปจริงของคุณ)
    } else if (theme === 'Night') {
        readingContainer.style.backgroundImage = "url('image/Station.svg')";
    } else if (theme === 'Anime') { 
        readingContainer.style.backgroundImage = "url('image/anime.svg')";
    } else if (theme === 'Retro') {
        readingContainer.style.backgroundImage = "url('image/retro.svg')";
    } else {
        // Default
        readingContainer.style.backgroundImage = "url('image/Station.svg')"; // (รูปเดิม)
    }
  }

  function playSound(soundName) {
      // (หยุดเพลงเก่าถ้ามี)
      if (bgMusic) { bgMusic.pause(); }

      // (เลือกไฟล์ตามชื่อ - คุณต้องมีไฟล์จริงนะ)
      let soundFile = '';
      if (soundName === 'Quiet Mind') soundFile = 'Sound/Quiet Mind.wav';
      else if (soundName === 'Midnight Windowlight') soundFile = 'Sound/Midnight Windowlight.wav';
      else if (soundName === 'Moonlit Keys') soundFile = 'Sound/Moonlit Keys.wav';
      else if (soundName === 'Night Breeze') soundFile = 'Sound/Night Breeze.wav';
      else if (soundName === 'Raindrops') soundFile = 'Sound/Raindrops.wav';
      else if (soundName === 'Late Night Fireplace') soundFile = 'Sound/Late Night Fireplace.wav';

      if (soundFile) {
          bgMusic = new Audio(soundFile);
          bgMusic.loop = true;
          bgMusic.volume = 0.5;
          bgMusic.play().catch(e => console.warn("Autoplay prevented:", e));
      }
  }


  // === 3. เริ่มทำงาน (Load Session Data) ===
  
  function initSession() {
      // ดึงข้อมูลจาก LocalStorage
      const dataString = localStorage.getItem('currentSession');
      
      // Reset ค่าให้เป็น Object ว่างก่อนเสมอ
      sessionData = {};

      if (dataString) {
          try {
              sessionData = JSON.parse(dataString);
          } catch (e) {
              console.error("Error parsing session data:", e);
          }
      }

      // ‼️ (Safety Check) ถ้าข้อมูลไม่ครบ ให้เติมค่าเริ่มต้นทันที ‼️
      // (ใช้ || เพื่อกัน null/undefined/0)
      sessionData.minutes = parseInt(sessionData.minutes) || 25; 
      sessionData.theme = sessionData.theme || 'Default';
      sessionData.sound = sessionData.sound || '';
      sessionData.bookId = sessionData.bookId || null;
      sessionData.startPage = parseInt(sessionData.startPage) || 0;
      sessionData.goalPage = parseInt(sessionData.goalPage) || 0;

      console.log("Session Loaded (Safe):", sessionData);

      // เริ่มทำงานต่อ
      startTimer(sessionData.minutes * 60);
      applyTheme(sessionData.theme);
      playSound(sessionData.sound);
  }


  // === 4. Timer Logic ===
  function startTimer(seconds) {
    totalSeconds = seconds;
    updateDisplay();
    
    
    
    timerInterval = setInterval(() => {
      totalSeconds--;
      updateDisplay();
      
      // -----------------------------------------------------
      // ‼️ โลจิก Fade Out ใหม่ (เรียกครั้งเดียว ตอนเหลือ 5 วิ) ‼️
      // -----------------------------------------------------
      if (totalSeconds === 5 && bgMusic && !bgMusic.paused) {
          console.log("Starting smooth fade out...");
          fadeOutMusic(5); // (สั่งให้ Fade ให้จบภายใน 5 วินาที)
      }
      // -----------------------------------------------------
      
      if (totalSeconds <= 0) {
        finishSession(true);
      }
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(timerInterval);
    if (bgMusic) bgMusic.pause(); // ‼️ หยุดเพลงตอน Pause
  }

  function updateDisplay() {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    mainTimerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }
    // ---------------------------------------------------------
  // ‼️ ฟังก์ชันลดเสียงแบบสมูท (ละเอียดระดับ 50ms) ‼️
  function fadeOutMusic(durationInSeconds) {
      if (!bgMusic) return;
      
      // 1. คำนวณสเต็ป (ลดทีละ 0.01 หรือละเอียดกว่านั้น)
      // (เราจะลดทุกๆ 50ms)
      const intervalTime = 50; 
      const totalSteps = (durationInSeconds * 1000) / intervalTime; // เช่น 5วิ * 1000 / 50 = 100 steps
      const volumeStep = bgMusic.volume / totalSteps; // ลดทีละนิดตามสัดส่วน
      
      // 2. เริ่มลดเสียง
      if (fadeInterval) clearInterval(fadeInterval); // (กันซ้ำ)
      
      fadeInterval = setInterval(() => {
          if (bgMusic.volume > 0) {
              // (กันค่าติดลบ)
              bgMusic.volume = Math.max(0, bgMusic.volume - volumeStep);
          } else {
              // (จบการทำงาน)
              clearInterval(fadeInterval);
              bgMusic.pause();
          }
      }, intervalTime);
  }
  
  // ---------------------------------------------------------
  // ‼️ ฟังก์ชันช่วย: เล่น Animation (เอาเรื่องเสียงออกไปก่อน) ‼️
  // ---------------------------------------------------------
  function playSummaryAnimation() {
      const items = document.querySelectorAll('.summary-anim-item');

      // รีเซ็ตตำแหน่ง
      items.forEach(item => {
          item.classList.remove('slide-up');
      });

      // เริ่มอนิเมชั่นทีละอัน
      items.forEach((item, index) => {
          if (getComputedStyle(item).display === 'none') return;

          setTimeout(() => {
              item.classList.add('slide-up');
          }, index * 150); 
      });
  }


  // ---------------------------------------------------------
  // ‼️ ฟังก์ชันหลัก: จบการอ่าน (อัปเกรดโลจิก Fail) ‼️
  // ---------------------------------------------------------
  async function finishSession(wasCompleted) {
    // 1. หยุดเวลาและเพลง
    clearInterval(timerInterval);
    if (bgMusic) bgMusic.pause();

    // 2. คำนวณเวลา
    let timeSpentInSeconds = 0;
    if (wasCompleted) {
      timeSpentInSeconds = sessionData.minutes * 60;
    } else {
      timeSpentInSeconds = (sessionData.minutes * 60) - totalSeconds;
    }
    const minutesSpent = Math.floor(timeSpentInSeconds / 60);

    // 3. คำนวณ XP/Gems
    let xpEarned = 0;
    let gemsEarned = 0;

    if (wasCompleted) {
        xpEarned = minutesSpent;
        if (sessionData.minutes >= 25) {
            gemsEarned = 5;
            const bonus = Math.floor((sessionData.minutes - 25) / 5);
            if (bonus > 0) gemsEarned += bonus;
        }
    }
    // (ถ้าไม่จบ XP/Gems เป็น 0 เหมือนเดิม)

    // 4. คำนวณหน้าหนังสือ
    let pagesRead = 0;
    const summaryPagesRow = document.getElementById('summary-pages-row');
    if (sessionData.bookId && sessionData.goalPage > 0 && wasCompleted) {
        pagesRead = sessionData.goalPage;
        const newCurrentPage = sessionData.startPage + pagesRead;
        await updateBookProgress(sessionData.bookId, newCurrentPage);
    }

    // 5. บันทึก Stats
    console.log("Saving stats...");
    await saveDataToStorage(minutesSpent, xpEarned, gemsEarned);
    console.log("Done.");


    // --- ‼️ (ส่วนใหม่) จัดการ UI ตามผลลัพธ์ (Win/Fail) ‼️ ---
    
    const titleElement = document.getElementById('summary-title');
    // (เลือกรูปตัวละครด้วย ถ้าอยากเปลี่ยนรูปตอนแพ้)
    // const charImage = document.querySelector('.summary-character'); 

    if (wasCompleted) {
        // ✅ กรณีสำเร็จ (Mission Complete)
        titleElement.textContent = "Mission Complete!";
        titleElement.style.color = "#284062"; // สีปกติ (หรือสีเขียว/น้ำเงิน)
        
        // เล่นเสียงสำเร็จ
        if (typeof successSound !== 'undefined') {
            successSound.currentTime = 0;
            successSound.play().catch(() => {});
        }
    } else {
        // ❌ กรณีล้มเหลว (Mission Failed)
        titleElement.textContent = "Mission Failed";
        titleElement.style.color = "#dc3545"; // ‼️ เปลี่ยนเป็นสีแดง
        
        // เล่นเสียงเฟล
        if (typeof failSound !== 'undefined') {
            failSound.currentTime = 0;
            failSound.play().catch(() => {});
        }
    }

    // --- อัปเดตตัวเลข ---
    document.getElementById('summary-time').textContent = `${minutesSpent} MINUTE`;
    document.getElementById('summary-xp').textContent = `${xpEarned} XP`;
    document.getElementById('summary-gems').textContent = `${gemsEarned} GEMS`;

    if (pagesRead > 0) {
        document.getElementById('summary-pages').textContent = `${pagesRead} PAGES`;
        summaryPagesRow.style.display = 'flex'; 
    } else {
        summaryPagesRow.style.display = 'none'; 
    }
    
    // 6. เปิด Overlay และเริ่ม Animation
    summaryOverlay.classList.add('show');
    playSummaryAnimation(); // (เรียกฟังก์ชันที่เราแยกออกมา)
  }


  // === 6. Database Functions ===
  
  async function saveDataToStorage(min, xp, gems) {
      // (โค้ดเดิมของคุณ - เรียก increment_user_stats)
      // ... (ผมละไว้เพื่อให้สั้นลง แต่คุณต้องใช้โค้ดเดิมนะ) ...
      // ... Copy from previous solution ...
       try {
          const { data: { user } } = await window.supabase.auth.getUser();
          if (user) {
              await window.supabase.rpc('increment_user_stats', {
                  user_id_input: user.id,
                  minutes_spent_input: min,
                  xp_earned_input: xp,
                  gems_earned_input: gems
              });
          } else {
              // Guest logic...
          }
      } catch(e) { console.error(e); }
  }

  // ‼️ (ฟังก์ชันใหม่) อัปเดตหน้าหนังสือ ‼️
  async function updateBookProgress(bookId, newCurrentPage) {
      console.log(`Updating book ${bookId} to page ${newCurrentPage}`);
      const { error } = await window.supabase
          .from('user_books')
          .update({ current_page: newCurrentPage })
          .eq('id', bookId);
      
      if (error) console.error("Error updating book progress:", error);
      else console.log("Book progress updated!");
  }


  // === 7. Event Listeners ===
  pauseBtn.addEventListener('click', () => {
    pauseTimer();
    pauseOverlay.classList.add('show');
  });
  continueBtn.addEventListener('click', () => {
    pauseOverlay.classList.remove('show');
    startTimer(totalSeconds);
    if (bgMusic) bgMusic.play().catch(()=>{}); // เล่นเพลงต่อ
  });
  leaveBtn.addEventListener('click', () => {
    finishSession(false); 
    pauseOverlay.classList.remove('show');
  });

  // === 8. (ใหม่) ส่วนควบคุม Volume Settings ===
  const volumeOverlay = document.getElementById('volume-overlay');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeIcon = document.getElementById('volume-icon');
  const volumeBackBtn = document.getElementById('volume-back-btn');
  const volumeSaveBtn = document.getElementById('volume-save-btn');
  
  let isMuted = false;
  let previousVolume = 0.5; // (ค่าเริ่มต้น)

  // (1. เปิด Overlay เมื่อกดปุ่ม Settings)
  settingsBtn.addEventListener('click', () => {
      // (โหลดค่าปัจจุบันมาแสดง)
      if (bgMusic) {
          volumeSlider.value = bgMusic.volume * 100;
          isMuted = bgMusic.muted;
      }
      updateVolumeIcon();
      volumeOverlay.classList.add('show');
  });

  // (2. ปรับ Slider -> เปลี่ยนเสียงทันที)
  volumeSlider.addEventListener('input', () => {
      const volumeValue = volumeSlider.value / 100;
      if (bgMusic) {
          bgMusic.volume = volumeValue;
          bgMusic.muted = false; // (ถ้าปรับเสียง = เลิก mute)
          isMuted = false;
      }
      updateVolumeIcon();
  });

  // (3. กดไอคอน -> Toggle Mute)
  volumeIcon.addEventListener('click', () => {
      if (bgMusic) {
          bgMusic.muted = !bgMusic.muted;
          isMuted = bgMusic.muted;
          
          // (อัปเดต Slider ให้สอดคล้อง)
          if (isMuted) volumeSlider.value = 0;
          else volumeSlider.value = bgMusic.volume * 100;
      }
      updateVolumeIcon();
  });

  // (ฟังก์ชันอัปเดตไอคอน)
  function updateVolumeIcon() {
      if (parseInt(volumeSlider.value) === 0 || isMuted) {
          volumeIcon.src = 'icons/icon/volume-mute.svg'; // ‼️ (ต้องมีไอคอนนี้)
      } else {
          volumeIcon.src = 'icons/icon/volume.svg';
      }
  }

  // (4. กด Save -> ปิด Overlay)
  volumeSaveBtn.addEventListener('click', () => {
      volumeOverlay.classList.remove('show');
      // (อาจจะบันทึกค่าลง localStorage ถ้าต้องการ)
  });

  // (5. กด Back -> ปิด Overlay (และอาจจะคืนค่าเดิม? แต่ในที่นี้เอาแค่ปิด))
  volumeBackBtn.addEventListener('click', () => {
      volumeOverlay.classList.remove('show');
  });

  // REDO Logic
  redoButton.addEventListener('click', function() {
    // ‼️ เปิด Overlay โดยใช้ค่าเดิม ‼️
    window.openFocusOverlay( (newData) => {

        summaryOverlay.classList.remove('show');
        // อัปเดตข้อมูล Session ใหม่
        sessionData = newData;
        console.log("Redo with new data:", sessionData);
        
        // อัปเดต Theme/Sound ใหม่ (เผื่อเปลี่ยน)
        applyTheme(sessionData.theme);
        playSound(sessionData.sound);
        
        // เริ่มใหม่
        startTimer(sessionData.minutes * 60); 
    });
  });
  
  continueSummaryBtn.addEventListener('click', () => { window.location.href = 'index.html'; });


  // === Start ===
  initSession();
});