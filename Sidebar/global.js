document.addEventListener('DOMContentLoaded', function() {

  // 1. ‼️ แก้ไข Path ที่ fetch ให้ตรงกับชื่อโฟลเดอร์ (S ตัวใหญ่) ‼️
  fetch('Sidebar/sidebar.html') 
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(data => {
      const placeholder = document.getElementById('sidebar-placeholder');
      if (placeholder) {
        placeholder.innerHTML = data;
        setActiveLink();
      }
    })
    .catch(error => {
      console.error('Error fetching sidebar:', error);
    });

  // (ฟังก์ชัน setActiveLink ที่เหลือ ไม่ต้องแก้ไข)
  function setActiveLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.sidebar .nav-item');

    navItems.forEach(item => {
      const link = item.querySelector('a');
      const img = item.querySelector('img');
      
      if (link && img) {
        const linkPage = link.getAttribute('href');
        const cleanLinkPage = linkPage.split('/').pop(); 
        const inactiveSrc = img.dataset.inactive;
        const activeSrc = img.dataset.active;

        if (cleanLinkPage === currentPage) {
          item.classList.add('active');
          img.src = activeSrc;
        } else {
          item.classList.remove('active');
          img.src = inactiveSrc;
        }
      }
    });
  }
});