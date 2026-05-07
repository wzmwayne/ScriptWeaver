// 灵蝶插件：阅读进度条（底部）
(function() {
    'use strict';
    if (document.getElementById('sw-progress-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'sw-progress-bar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;height:4px;background:#3498db;z-index:2147483647;width:0;';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        bar.style.width = progress + '%';
    });
})();
