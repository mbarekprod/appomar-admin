
// ===== إظهار الأقسام =====
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ===== Service Worker =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(() => console.log('✅ Service Worker actif'))
            .catch(err => console.log('❌ SW Error:', err));
    });
}

// ===== تثبيت PWA =====
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.createElement('button');
    installBtn.textContent = '📲 تثبيت التطبيق';
    installBtn.className = 'card-btn';
    installBtn.style.margin = '0 0 16px';
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.remove();
    });
    document.querySelector('.main-menu').appendChild(installBtn);
});

window.addEventListener('appinstalled', () => {
    alert('🎉 تم تثبيت تطبيق مطعم الفنان بنجاح!');
});

console.log('🍕 مطعم الفنان جاهز!');
