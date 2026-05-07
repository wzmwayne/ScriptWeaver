// 灵蝶插件：为代码块添加复制按钮
(function() {
    'use strict';
    document.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.sw-copy-btn')) return;
        const btn = document.createElement('button');
        btn.textContent = '📋';
        btn.className = 'sw-copy-btn';
        btn.style.cssText = 'position:absolute;top:5px;right:5px;padding:2px 8px;font-size:14px;line-height:1;border:none;background:#2c3e50;color:#ecf0f1;cursor:pointer;';
        btn.addEventListener('click', () => {
            const code = pre.textContent;
            navigator.clipboard.writeText(code).then(() => {
                btn.textContent = '✅';
                setTimeout(() => btn.textContent = '📋', 1500);
            }).catch(() => {
                btn.textContent = '❌';
                setTimeout(() => btn.textContent = '📋', 1500);
            });
        });
        pre.style.position = 'relative';
        pre.appendChild(btn);
    });
})();
