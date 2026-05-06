// ==UserScript==
// @name         ScriptWeaver (灵蝶)
// @namespace    http://tampermonkey.net/
// @version      7.3
// @description  极简动态脚本注入，支持 GM API 直接调用、拖拽调试窗口、文本代码执行
// @author       wzmwayne (with DeepSeek AI)
// @match        *://*/*
// @match        file:///*
// @match        content://*
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_info
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        debug: true,
        toastDuration: 4000,
        scanTextForCode: true,
    };

    // --- 将常用 GM 函数暴露到页面（供 x-tm-inline 直接使用） ---
    function exposeGMToPage() {
        if (typeof unsafeWindow === 'undefined' || typeof exportFunction !== 'function') return;

        // 避免重复暴露
        if (unsafeWindow.SW_GM) return;

        const gmFunctions = {
            GM_xmlhttpRequest,
            GM_setValue,
            GM_getValue,
            GM_notification,
            GM_openInTab,
            GM_addStyle,
            GM_info,
            // 注意：某些 API 需要特殊处理，这里仅暴露最常用的
        };

        const swGM = {};
        for (const [name, fn] of Object.entries(gmFunctions)) {
            if (typeof fn === 'function') {
                swGM[name] = exportFunction(fn, unsafeWindow);
            }
        }

        // 同时为方便书写，直接挂载到 unsafeWindow 顶层（可选）
        // 但为避免全局污染，建议通过 SW_GM.xxx 调用
        unsafeWindow.SW_GM = swGM;

        // 额外暴露一个辅助方法，让页面代码可以像原生 GM_ 一样调用
        // 例如：window.GM_setValue 可以直接使用
        for (const [name, fn] of Object.entries(gmFunctions)) {
            if (typeof fn === 'function') {
                unsafeWindow[name] = exportFunction(fn, unsafeWindow);
            }
        }
    }

    // --- 极简调试窗口（支持触摸拖拽） ---
    let debugWindow, debugLog, debugInit = false;
    function initDebugWindow() {
        if (debugInit) return;
        debugInit = true;
        debugWindow = document.createElement('div');
        debugWindow.style.cssText = 'position:fixed;top:20px;right:20px;width:380px;height:300px;max-height:80vh;background:#1e293b;color:#e2e8f0;z-index:2147483646;display:flex;flex-direction:column;resize:both;overflow:hidden;';
        const titleBar = document.createElement('div');
        titleBar.style.cssText = 'padding:6px 10px;background:#334155;display:flex;justify-content:space-between;user-select:none;cursor:move;';
        titleBar.innerHTML = '<span>🐛 ScriptWeaver</span><span style="cursor:pointer">✕</span>';
        titleBar.lastChild.onclick = () => debugWindow.remove();
        debugWindow.appendChild(titleBar);
        debugLog = document.createElement('textarea');
        debugLog.readOnly = true;
        debugLog.style.cssText = 'flex:1;background:#0f172a;color:#e2e8f0;border:none;padding:8px;font-family:monospace;font-size:12px;resize:none;overflow:auto;';
        debugWindow.appendChild(debugLog);
        document.body.appendChild(debugWindow);

        let d = false, sx, sy, sl, st;
        function start(e) {
            d = true;
            const p = e.touches ? e.touches[0] : e;
            sx = p.clientX; sy = p.clientY;
            const r = debugWindow.getBoundingClientRect();
            sl = r.left; st = r.top;
            e.preventDefault();
        }
        function move(e) {
            if (!d) return;
            const p = e.touches ? e.touches[0] : e;
            debugWindow.style.left = (sl + p.clientX - sx) + 'px';
            debugWindow.style.top = (st + p.clientY - sy) + 'px';
            debugWindow.style.right = 'auto';
        }
        function end() { d = false; }
        titleBar.addEventListener('mousedown', start);
        titleBar.addEventListener('touchstart', start, {passive: false});
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, {passive: false});
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
    }
    function debugAppend(msg) {
        if (!CONFIG.debug) return;
        if (!debugInit) initDebugWindow();
        if (debugLog) {
            debugLog.value += msg + '\n';
            debugLog.scrollTop = debugLog.scrollHeight;
        }
    }

    // --- 极简 Toast (非调试) ---
    let tid = 0;
    function showToast(msg, isErr = false, dur = null) {
        if (CONFIG.debug) { debugAppend(msg); return; }
        let c = document.getElementById('tm-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'tm-toast-container';
            c.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'background:'+(isErr?'#c0392b':'#2c3e50')+';color:#ecf0f1;padding:6px 12px;font-size:14px;max-width:350px;';
        c.insertBefore(t, c.firstChild);
        const d = dur ?? CONFIG.toastDuration;
        if (d > 0) setTimeout(() => { t.remove(); }, d);
    }

    // --- 核心执行函数（使用 GM.addElement 注入脚本，GM API 已暴露） ---
    function executeCode(code, source = '') {
        if (CONFIG.debug) {
            debugAppend(`⚡ ${source}:\n${code}`);
        } else {
            showToast('📄 网站正在通过脚本运行 JS');
        }

        try {
            // 使用 GM.addElement 注入 <script>，GM 函数已挂载到 window
            if (typeof GM !== 'undefined' && typeof GM.addElement === 'function') {
                GM.addElement('script', {
                    textContent: code
                });
            } else if (typeof GM_addElement === 'function') {
                GM_addElement('script', { textContent: code });
            } else {
                new Function(code)(); // 降级
            }
            if (CONFIG.debug) debugAppend(`✅ ${source}成功`);
        } catch (e) {
            const m = `❌ ${source}错误: ${e.message}`;
            if (CONFIG.debug) debugAppend(m);
            else showToast(m, true);
        }
    }

    // --- 内嵌代码块处理 ---
    function processInlineBlocks() {
        const blocks = document.querySelectorAll('script[type="x-tm-inline"]');
        if (blocks.length) {
            if (CONFIG.debug) debugAppend(`📌 内嵌块: ${blocks.length} 个`);
            blocks.forEach((b, i) => {
                const code = b.textContent.trim();
                if (code) executeCode(code, `内嵌${i+1}`);
            });
            return true;
        }
        return false;
    }

    // --- 远程脚本加载 ---
    function loadRemoteScript() {
        const meta = document.querySelector('meta[name="tm-dynamic-script"]');
        if (!meta) return;
        const url = meta.getAttribute('content');
        if (!url) return;
        if (CONFIG.debug) debugAppend(`🌐 远程: ${url}`);
        else showToast('📄 网站正在通过脚本运行 JS');
        GM_xmlhttpRequest({
            method: 'GET',
            url: url + '?t=' + Date.now(),
            onload(r) {
                if (r.status === 200) {
                    if (CONFIG.debug) debugAppend('📥 远程下载成功');
                    executeCode(r.responseText, '远程');
                } else {
                    const e = `❌ 远程失败 ${r.status}`;
                    if (CONFIG.debug) debugAppend(e); else showToast(e, true);
                }
            },
            onerror(e) {
                const m = '❌ 网络错误';
                if (CONFIG.debug) debugAppend(m); else showToast(m, true);
            }
        });
    }

    // --- 文本嵌入式代码扫描 ---
    function scanTextForCode() {
        if (!CONFIG.scanTextForCode) return;
        const re = /(?:<script\s+type\s*=\s*["']x-tm-inline["']\s*>|&lt;script\s+type\s*=\s*["']x-tm-inline["']\s*&gt;)\s*([\s\S]*?)\s*(?:<\/script>|&lt;\/script&gt;)/gi;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode.tagName;
                return (p === 'SCRIPT'||p === 'STYLE'||p === 'NOSCRIPT') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });
        const seen = new Set();
        let node;
        while ((node = walker.nextNode())) {
            const t = node.textContent;
            if (!t.includes('x-tm-inline')) continue;
            re.lastIndex = 0;
            let m;
            while ((m = re.exec(t)) !== null) {
                const code = m[1].trim();
                if (!code) continue;
                const key = node.parentNode.tagName + m.index + code.slice(0,20);
                if (seen.has(key)) continue;
                seen.add(key);
                const el = node.parentNode;
                const rect = el.getBoundingClientRect();
                if (!rect.width && !rect.height) continue;
                const p = document.createElement('div');
                p.style.cssText = 'position:fixed;z-index:2147483647;background:#2c3e50;color:#ecf0f1;padding:4px 8px;font-size:13px;display:flex;align-items:center;gap:6px;';
                p.innerHTML = '🦋 可执行';
                const r = document.createElement('button');
                r.textContent = '执行'; r.style.cssText = 'padding:0 8px;';
                const c = document.createElement('button');
                c.textContent = '取消'; c.style.cssText = 'padding:0 8px;';
                r.onclick = () => { executeCode(code, '文本'); p.remove(); };
                c.onclick = () => p.remove();
                p.appendChild(r); p.appendChild(c);
                document.body.appendChild(p);
                p.style.top = Math.max(5, rect.top - p.offsetHeight - 5) + 'px';
                p.style.left = Math.max(5, Math.min(rect.left, innerWidth - p.offsetWidth - 5)) + 'px';
            }
        }
    }

    // --- 启动 ---
    function main() {
        // 暴露 GM API 到页面，让后续注入的代码可以直接调用
        exposeGMToPage();

        if (!processInlineBlocks()) loadRemoteScript();

        if (document.readyState === 'complete') scanTextForCode();
        else window.addEventListener('load', scanTextForCode);

        // 设置 __ScriptWeaver__ 标志，供未安装提示检测
        if (typeof unsafeWindow !== 'undefined') {
            unsafeWindow.__ScriptWeaver__ = true;
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
    else main();
})();
