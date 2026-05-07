// 灵蝶插件：回到顶部按钮
(function() {
    'use strict';
    if (document.getElementById('sw-btt-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'sw-btt-btn';
    btn.textContent = '⬆';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483646;padding:8px 12px;font-size:20px;line-height:1;border:none;background:#2c3e50;color:#ecf0f1;cursor:pointer;display:none;';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => {
        btn.style.display = window.scrollY > 300 ? 'block' : 'none';
    });
})();
