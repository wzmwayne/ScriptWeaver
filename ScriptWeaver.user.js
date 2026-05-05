// ==UserScript==
// @name         ScriptWeaver (灵蝶)
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  动态脚本注入引擎，支持安全策略、内嵌代码、权限声明感知
// @author       你
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_addStyle
// @grant        GM_info
// @connect      *
// ==/UserScript==

/*
 * ┌──────────────────────────────────────────────────────────┐
 * │ 安全模式说明（修改 CONFIG.mode 切换）                    │
 * ├────┬─────────────────────────────────────────────────────┤
 * │ 1  │ 强制安全模式（Enforcing）                           │
 * │    │ 仅执行 JSON 安全指令集（白名单操作），拒绝任意 JS    │
 * │    │ 适用：完全受控的静态内容注入（如主题切换、文案替换） │
 * ├────┼─────────────────────────────────────────────────────┤
 * │ 2  │ 严格模式（Strict）                                  │
 * │    │ 检查域名白名单 + 危险函数，发现风险时弹出原生确认框   │
 * │    │ 由用户决定是否继续执行远程/内嵌 JS                   │
 * │    │ 适用：部分受信来源，需人工审核                       │
 * ├────┼─────────────────────────────────────────────────────┤
 * │ 3  │ 宽容模式（Permissive）                              │
 * │    │ 仅用 Toast 提示风险（非白名单/危险函数），仍自动执行 │
 * │    │ 适用：开发调试环境，或已知脚本来源可快速观察         │
 * ├────┼─────────────────────────────────────────────────────┤
 * │ 4  │ 关闭（Off）                                         │
 * │    │ 不进行任何检查，直接执行所有代码                     │
 * │    │ 适用：完全信任的脚本，或仅通过内嵌方式部署的个人页面 │
 * └────┴─────────────────────────────────────────────────────┘
 *
 * 权限声明（页面可通过 meta 标签告知脚本需要哪些 GM 权限）：
 *   <meta name="scriptweaver-permissions" content="xhr,storage,notification,openTab,info,addStyle">
 */

(function() {
    'use strict';

    // ================== 配置区 ==================
    const CONFIG = {
        mode: 2,
        allowedDomains: ['你的域名.com', 'your-cdn.com'],
        forceHttps: true,
        toastDuration: 4000,
        dangerousPatterns: [
            /\beval\s*\(/i,
            /\bnew\s+Function\b/i,
            /\bGM_\w+/i,
            /\bunsafeWindow\b/i
        ]
    };
    // ==========================================

    function showToast(msg, isError = false) {
        const old = document.getElementById('tm-toast');
        if (old) old.remove();
        const t = document.createElement('div');
        t.id = 'tm-toast';
        t.textContent = msg;
        Object.assign(t.style, {
            position: 'fixed', top: '10px', right: '10px',
            backgroundColor: isError ? '#c0392b' : '#2c3e50',
            color: '#ecf0f1', padding: '8px 14px',
            borderRadius: '4px', zIndex: '2147483647',
            fontFamily: 'system-ui, sans-serif', fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            pointerEvents: 'none', opacity: '0.95'
        });
        document.body.appendChild(t);
        if (CONFIG.toastDuration > 0) {
            setTimeout(() => {
                t.style.opacity = '0';
                setTimeout(() => t.remove(), 300);
            }, CONFIG.toastDuration);
        }
    }

    function checkDomain(url) {
        try {
            const obj = new URL(url);
            if ((CONFIG.mode <= 2 || CONFIG.forceHttps) && obj.protocol !== 'https:') {
                return { valid: false, reason: '仅支持 HTTPS' };
            }
            const host = obj.hostname;
            const inWhitelist = CONFIG.allowedDomains.some(p => {
                if (p.startsWith('*.')) return host.endsWith(p.slice(1));
                return host === p;
            });
            return { valid: true, host, inWhitelist };
        } catch (e) {
            return { valid: false, reason: '无效 URL' };
        }
    }

    function hasDanger(code) {
        return CONFIG.dangerousPatterns.some(p => p.test(code));
    }

    function runSafeInstructions(jsonText) {
        const ALLOWED = ['setHTML','setText','addClass','removeClass','setAttr','listenEvent'];
        let instructions;
        try {
            instructions = JSON.parse(jsonText);
            if (!Array.isArray(instructions)) throw new Error('非数组');
        } catch (e) {
            showToast('❌ 安全指令 JSON 解析失败', true);
            return;
        }
        for (const cmd of instructions) {
            if (!ALLOWED.includes(cmd.op)) {
                showToast(`❌ 禁止操作：${cmd.op}`, true);
                continue;
            }
            try {
                const el = document.querySelector(cmd.selector);
                switch (cmd.op) {
                    case 'setHTML': el.innerHTML = cmd.html; break;
                    case 'setText': el.textContent = cmd.text; break;
                    case 'addClass': el.classList.add(cmd.className); break;
                    case 'removeClass': el.classList.remove(cmd.className); break;
                    case 'setAttr': el.setAttribute(cmd.attr, cmd.value); break;
                    case 'listenEvent':
                        el.addEventListener(cmd.event, () => showToast('事件: ' + (cmd.msg || '')));
                        break;
                }
            } catch (e) {
                showToast(`指令执行错误: ${e.message}`, true);
            }
        }
        showToast('✅ 安全指令已执行');
    }

    function executeCode(code, domainInfo = { inWhitelist: true }) {
        const dangerous = hasDanger(code);
        let run = true;

        if (CONFIG.mode === 1) {
            try {
                JSON.parse(code);
                runSafeInstructions(code);
            } catch {
                showToast('⛔ 强制模式仅允许 JSON 安全指令', true);
            }
            return;
        }

        if (CONFIG.mode === 2) {
            let reasons = [];
            if (!domainInfo.inWhitelist) reasons.push('域名不在白名单');
            if (dangerous) reasons.push('包含危险函数');
            if (reasons.length > 0) {
                run = confirm(`⚠️ 安全警告：\n${reasons.join('；')}\n是否继续执行？`);
                if (!run) showToast('⛔ 用户取消执行', true);
            }
        } else if (CONFIG.mode === 3) {
            if (!domainInfo.inWhitelist || dangerous) {
                showToast('⚠️ 风险提示（非白名单/危险函数），已放行');
            }
        }

        if (run) {
            try {
                new Function(code)();
                showToast('✅ 代码已执行');
            } catch (e) {
                showToast('❌ 执行错误: ' + e.message, true);
            }
        }
    }

    // ---------- 权限声明感知 ----------
    function checkDeclaredPermissions() {
        const meta = document.querySelector('meta[name="scriptweaver-permissions"]');
        if (!meta) return;

        const raw = meta.getAttribute('content') || '';
        const declared = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        if (declared.length === 0) return;

        // 映射简称到实际 GM_* API 名称
        const permMap = {
            'xhr': 'GM_xmlhttpRequest',
            'storage': 'GM_setValue/GM_getValue',
            'notification': 'GM_notification',
            'opentab': 'GM_openInTab',
            'info': 'GM_info',
            'addstyle': 'GM_addStyle'
        };

        const granted = [];
        const missing = [];

        for (const p of declared) {
            const apiName = permMap[p] || p;
            const available = (() => {
                switch (p) {
                    case 'xhr': return typeof GM_xmlhttpRequest !== 'undefined';
                    case 'storage': return typeof GM_setValue !== 'undefined' && typeof GM_getValue !== 'undefined';
                    case 'notification': return typeof GM_notification !== 'undefined';
                    case 'opentab': return typeof GM_openInTab !== 'undefined';
                    case 'info': return typeof GM_info !== 'undefined';
                    case 'addstyle': return typeof GM_addStyle !== 'undefined';
                    default: return false;
                }
            })();
            if (available) {
                granted.push(apiName);
            } else {
                missing.push(apiName);
            }
        }

        let msg = '';
        if (granted.length > 0) {
            msg += `✅ 已授权：${granted.join(', ')} `;
        }
        if (missing.length > 0) {
            msg += `⚠️ 缺失：${missing.join(', ')}。请检查脚本 @grant 配置`;
        }
        if (msg) showToast(msg, missing.length > 0);
    }

    // ---------- 主流程 ----------
    // 权限感知提示
    checkDeclaredPermissions();

    const inlineBlock = document.querySelector('script[type="x-tm-inline"]');
    if (inlineBlock && inlineBlock.textContent.trim()) {
        const code = inlineBlock.textContent;
        showToast('📄 检测到内嵌代码');
        executeCode(code, { inWhitelist: true });
        return;
    }

    const meta = document.querySelector('meta[name="tm-dynamic-script"]');
    if (!meta) return;
    const rawUrl = meta.getAttribute('content');
    if (!rawUrl) return;

    const domainCheck = checkDomain(rawUrl);
    if (!domainCheck.valid) {
        showToast(`⛔ ${domainCheck.reason}`, true);
        return;
    }

    showToast('⏳ 加载远程脚本...');
    GM_xmlhttpRequest({
        method: 'GET',
        url: rawUrl + '?t=' + Date.now(),
        onload: function(res) {
            if (res.status !== 200) {
                showToast(`❌ 加载失败 (${res.status})`, true);
                return;
            }
            executeCode(res.responseText, domainCheck);
        },
        onerror: () => showToast('❌ 网络错误', true)
    });
})();
