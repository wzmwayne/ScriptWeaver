// ==UserScript==
// @name         ScriptWeaver (灵蝶)
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  轻量动态脚本注入，支持调试与 Toast 堆叠
// @author       你
// @match        *://*/*
// @match        file:///*
// @match        content://*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

window.__ScriptWeaver__ = true;

(function() {
    'use strict';

    // ================== 配置 ==================
    const CONFIG = {
        debug: false,              // true = 详细过程 Toast；false = 仅显示“网站正在通过脚本运行js”
        toastDuration: 4000,      // Toast 显示时长（毫秒），0 为常驻
    };
    // ==========================================

    let toastIdCounter = 0;

    /**
     * 支持堆叠的 Toast
     * @param {string} msg 消息
     * @param {boolean} isError 是否错误（红色）
     * @param {number|null} duration 单独覆盖时长，不传则用 CONFIG
     */
    function showToast(msg, isError = false, duration = null) {
        let container = document.getElementById('tm-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tm-toast-container';
            container.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:8px;pointer-events:none;';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        const id = 'tm-toast-' + (++toastIdCounter);
        toast.id = id;
        toast.textContent = msg;
        toast.style.cssText = 'background:' + (isError ? '#c0392b' : '#2c3e50') + ';color:#ecf0f1;padding:8px 14px;border-radius:4px;font-family:system-ui,sans-serif;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);pointer-events:none;opacity:0.95;max-width:300px;word-break:break-word;';
        // 新 Toast 插入到容器顶部（视觉上堆叠：最新的在上）
        container.insertBefore(toast, container.firstChild);

        const dur = duration !== null ? duration : CONFIG.toastDuration;
        if (dur > 0) {
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(() => toast.remove(), 300);
            }, dur);
        }
    }

    /**
     * 执行一段 JS 代码
     * @param {string} code
     * @param {string} source - 来源标识（用于调试）
     */
    function executeCode(code, source = '') {
        if (CONFIG.debug) {
            showToast(`⚡ 执行${source}代码...`);
        } else {
            // 非调试模式，每次执行都提示
            showToast('📄 网站正在通过脚本运行 JS');
        }

        try {
            new Function(code)();
            if (CONFIG.debug) {
                showToast(`✅ ${source}代码执行完毕`);
            }
        } catch (e) {
            showToast(`❌ ${source}执行错误: ${e.message}`, true);
            console.error(e);
            // 非调试模式也要提示错误（堆叠方式）
            if (!CONFIG.debug) {
                showToast(`❌ JS 执行错误`, true);
            }
        }
    }

    // ---------- 主流程 ----------

    // 1. 处理所有内嵌代码块（支持多个）
    const inlineBlocks = document.querySelectorAll('script[type="x-tm-inline"]');
    if (inlineBlocks.length > 0) {
        if (CONFIG.debug) showToast(`📌 发现 ${inlineBlocks.length} 个内嵌代码块`);
        for (let i = 0; i < inlineBlocks.length; i++) {
            const code = inlineBlocks[i].textContent.trim();
            if (code) {
                executeCode(code, `内嵌块${i+1} `);
            }
        }
        // 内嵌代码块优先于远程脚本，不再处理远程
        return;
    }

    // 2. 远程脚本加载
    const meta = document.querySelector('meta[name="tm-dynamic-script"]');
    if (!meta) return;
    const rawUrl = meta.getAttribute('content');
    if (!rawUrl) return;

    if (CONFIG.debug) showToast(`🌐 开始加载远程脚本: ${rawUrl}`);
    else showToast('📄 网站正在通过脚本运行 JS'); // 远程加载开始也提示（堆叠）

    GM_xmlhttpRequest({
        method: 'GET',
        url: rawUrl + '?t=' + Date.now(),
        onload: function(res) {
            if (res.status === 200) {
                if (CONFIG.debug) showToast('📥 远程脚本下载成功');
                executeCode(res.responseText, '远程 ');
            } else {
                showToast(`❌ 远程脚本加载失败 (${res.status})`, true);
            }
        },
        onerror: function(err) {
            showToast('❌ 网络错误', true);
            console.error(err);
        }
    });
})();
