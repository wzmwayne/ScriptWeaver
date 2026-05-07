// 灵蝶暗黑模式插件（柔和灰色 / 黑色版）
(function() {
    'use strict';
    if (document.getElementById('sw-dark-mode-btn')) return;

    // 注入全局暗黑样式（仅影响 .sw-dark 类下的元素）
    const style = document.createElement('style');
    style.textContent = `
        body.sw-dark {
            background: #2b2b2b !important;
            color: #eee !important;
        }
        body.sw-dark h1, body.sw-dark h2, body.sw-dark h3,
        body.sw-dark h4, body.sw-dark h5, body.sw-dark h6,
        body.sw-dark p, body.sw-dark span, body.sw-dark li,
        body.sw-dark td, body.sw-dark th, body.sw-dark label {
            color: #f0f0f0 !important;
        }
        body.sw-dark a {
            color: #6db3f2 !important;
        }
        body.sw-dark pre, body.sw-dark code {
            background: #1a1a1a !important;
            color: #ddd !important;
            border-color: #444 !important;
        }
        body.sw-dark .demo-box,
        body.sw-dark .card,
        body.sw-dark .category-card,
        body.sw-dark .note,
        body.sw-dark .demo-area {
            background: #333 !important;
            border-color: #555 !important;
            color: #eee !important;
        }
        body.sw-dark button {
            background: #444 !important;
            border-color: #666 !important;
            color: #eee !important;
        }
        body.sw-dark button:hover {
            background: #555 !important;
        }
        body.sw-dark input, body.sw-dark textarea, body.sw-dark select {
            background: #333 !important;
            color: #fff !important;
            border-color: #555 !important;
        }
    `;
    document.head.appendChild(style);

    // 读取保存的状态
    let isDark = false;
    try { isDark = localStorage.getItem('sw-dark-mode') === 'true'; } catch(e) {}

    // 创建按钮
    const btn = document.createElement('button');
    btn.id = 'sw-dark-mode-btn';
    btn.textContent = isDark ? '☀' : '☾';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;font-size:20px;line-height:1;border:none;background:transparent;cursor:pointer;color:inherit;padding:0;';

    function setMode(dark) {
        if (dark) {
            document.body.classList.add('sw-dark');
            btn.textContent = '☀';
        } else {
            document.body.classList.remove('sw-dark');
            btn.textContent = '☾';
        }
        try { localStorage.setItem('sw-dark-mode', dark); } catch(e) {}
    }

    setMode(isDark);
    btn.addEventListener('click', () => {
        isDark = !isDark;
        setMode(isDark);
    });
    document.body.appendChild(btn);
})();
