
const { createClient } = supabase;

// 2. ‼️ ใส่ URL และ Key ที่คุณคัดลอกมาจากขั้นตอนที่ 1 ‼️
const SUPABASE_URL = 'https://twqkmthlzoosetndrmyo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3cWttdGhsem9vc2V0bmRybXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNDU1MzYsImV4cCI6MjA3NzgyMTUzNn0.nTRrRf8O-coec_5xu3UpS8fCUeevBo7516H6M6mt-CU';

// 3. สร้างตัวเชื่อมต่อ และตั้งชื่อให้มันว่า 'supabase'
// (ตอนนี้ไฟล์อื่นๆ จะสามารถเรียกใช้ 'supabase' ได้)
window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);