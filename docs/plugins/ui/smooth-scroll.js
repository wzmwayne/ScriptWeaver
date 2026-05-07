// 灵蝶插件：平滑滚动（锚点链接）
(function() {
    'use strict';
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
})();
