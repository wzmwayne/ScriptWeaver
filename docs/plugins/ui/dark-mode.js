// 灵蝶暗黑模式插件（极简按钮版）
(function() {
    'use strict';
    if (document.getElementById('sw-dark-mode-btn')) return;

    let isDark = localStorage.getItem('sw-dark-mode') === 'true';

    const btn = document.createElement('button');
    btn.id = 'sw-dark-mode-btn';
    btn.textContent = isDark ? '☀' : '☾';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;font-size:20px;line-height:1;border:none;background:transparent;cursor:pointer;color:inherit;padding:0;';

    function setMode(dark) {
        if (dark) {
            document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
            btn.textContent = '☀';
        } else {
            document.documentElement.style.filter = '';
            btn.textContent = '☾';
        }
        localStorage.setItem('sw-dark-mode', dark);
    }

    setMode(isDark);
    btn.addEventListener('click', () => {
        isDark = !isDark;
        setMode(isDark);
    });
    document.body.appendChild(btn);
})();
