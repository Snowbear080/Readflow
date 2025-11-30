document.addEventListener('DOMContentLoaded', () => {

    // === 1. ส่วนควบคุมการสลับหน้า (Toggle) ===
    const authContainer = document.getElementById('auth-container');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');

    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.add('signup-mode');
            window.location.hash = 'signup';
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            authContainer.classList.remove('signup-mode');
            window.location.hash = 'login';
        });
    }

    // (เพิ่ม) ตรวจสอบ Hash ตอนโหลดหน้า
    if (window.location.hash === '#signup') {
        authContainer.classList.add('signup-mode');
    }

    
    // === 2. ส่วนฟอร์ม Login (โค้ดเดิม) ===
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('email');
    const loginPasswordInput = document.getElementById('password');
    const togglePasswordLoginBtn = document.getElementById('toggle-password-login');

    if (togglePasswordLoginBtn) {
        togglePasswordLoginBtn.addEventListener('click', () => {
            togglePasswordVisibility(loginPasswordInput);
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;

            try {
                const { data, error } = await window.supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    throw error;
                }
                
                window.location.href = 'index.html'; // ไปหน้าหลัก

            } catch (error) {
                console.error('Error logging in:', error.message);
                alert(`Login failed: ${error.message}`);
            }
        });
    }


    // === 3. ‼️ ส่วนฟอร์ม Sign Up (ฉบับอัปเดต) ‼️ ===
    const signupForm = document.getElementById('signup-form');
    const signupEmailInput = document.getElementById('signup-email');
    const usernameInput = document.getElementById('signup-username'); // 1. เลือก Input ใหม่
    const signupPasswordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const togglePasswordSignupBtn = document.getElementById('toggle-password-signup');
    const togglePasswordConfirmBtn = document.getElementById('toggle-password-confirm');

    // (โค้ด toggle password ... )
    if (togglePasswordSignupBtn) {
        togglePasswordSignupBtn.addEventListener('click', () => {
            togglePasswordVisibility(signupPasswordInput);
        });
    }
    if (togglePasswordConfirmBtn) {
        togglePasswordConfirmBtn.addEventListener('click', () => {
            togglePasswordVisibility(confirmPasswordInput);
        });
    }


    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = signupEmailInput.value;
            const username = usernameInput.value; // 2. ดึงค่า Username
            const password = signupPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // ตรวจสอบว่ารหัสผ่านตรงกัน
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            try {
                // 3. ‼️ แก้ไขคำสั่ง signUp ‼️
                const { data, error } = await window.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: { // 4. เพิ่ม "options"
                        data: {
                            // นี่คือส่วนที่ "แนบ" username ไปด้วย
                            username: username 
                        }
                    }
                });

                if (error) {
                    throw error;
                }

                // (สมัครสำเร็จ...)
                console.log('Sign up successful!', data);
                alert('Sign up successful! Please check your email to confirm your account.');
                
                authContainer.classList.remove('signup-mode');
                window.location.hash = 'login';

            } catch (error) {
                console.error('Error signing up:', error.message);
                alert(`Sign up failed: ${error.message}`);
            }
        });
    }

    
    // === 4. ฟังก์ชันช่วยเหลือ (ใช้ร่วมกัน) ===
    function togglePasswordVisibility(inputElement) {
        if (inputElement.type === "password") {
            inputElement.type = "text";
        } else {
            inputElement.type = "password";
        }
    }

});