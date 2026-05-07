// 灵蝶插件：极简时钟（右下角）
(function() {
    'use strict';
    if (document.getElementById('sw-clock')) return;

    const clock = document.createElement('div');
    clock.id = 'sw-clock';
    clock.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483646;background:#2c3e50;color:#ecf0f1;padding:6px 12px;font-size:16px;font-family:monospace;';
    document.body.appendChild(clock);

    function update() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        clock.textContent = h + ':' + m + ':' + s;
    }
    update();
    setInterval(update, 1000);
})();
