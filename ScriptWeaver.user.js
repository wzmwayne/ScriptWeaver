// ==UserScript==
// @name         ScriptWeaver (灵蝶)
// @namespace    http://tampermonkey.net/
// @version      7.9
// @description  极简动态脚本注入引擎，支持 GM API、插件别名、跨页遥控、Markdown 代码块识别与注入前安全确认
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
// @grant        GM_addValueChangeListener
// @grant        unsafeWindow
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    const VERSION = '7.9';
    const CONFIG = {
        debug: true,
        toastDuration: 4000,
        scanTextForCode: true,
        pluginsMapURL: 'https://wzmwayne.github.io/ScriptWeaver/plugins.json',
    };

    // ========== 权限记忆（sessionStorage，刷新后失效） ==========
    function getSessionPermissions() {
        try { return JSON.parse(sessionStorage.getItem('sw_cross_perms') || '{}'); } catch(e) { return {}; }
    }
    function setSessionPermissions(perms) { sessionStorage.setItem('sw_cross_perms', JSON.stringify(perms)); }

    // ========== 通用工具 ==========
    function randomId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

    // ========== GM API 暴露到页面 ==========
    function exposeGMToPage() {
        if (typeof unsafeWindow === 'undefined' || typeof exportFunction !== 'function') return;
        if (unsafeWindow.SW_GM) return;
        const gmFns = { GM_xmlhttpRequest, GM_setValue, GM_getValue, GM_notification, GM_openInTab, GM_addStyle, GM_info };
        const swGM = {};
        for (const [k,fn] of Object.entries(gmFns)) if (typeof fn==='function') swGM[k] = exportFunction(fn, unsafeWindow);
        unsafeWindow.SW_GM = swGM;
        for (const [k,fn] of Object.entries(gmFns)) if (typeof fn==='function') unsafeWindow[k] = exportFunction(fn, unsafeWindow);
    }

    // ========== 极简调试窗口（无关闭按钮） ==========
    let debugWindow, debugLog, debugInit = false;
    function initDebugWindow() {
        if (debugInit) return;
        debugInit = true;
        debugWindow = document.createElement('div');
        debugWindow.style.cssText = 'position:fixed;top:20px;right:20px;width:380px;height:300px;max-height:80vh;background:#1e293b;color:#e2e8f0;z-index:2147483646;display:flex;flex-direction:column;resize:both;overflow:hidden;';
        const titleBar = document.createElement('div');
        titleBar.textContent = '🐛 ScriptWeaver';
        titleBar.style.cssText = 'padding:6px 10px;background:#334155;user-select:none;cursor:move;';
        debugWindow.appendChild(titleBar);
        debugLog = document.createElement('textarea');
        debugLog.readOnly = true;
        debugLog.style.cssText = 'flex:1;background:#0f172a;color:#e2e8f0;border:none;padding:8px;font-family:monospace;font-size:12px;resize:none;overflow:auto;';
        debugWindow.appendChild(debugLog);
        document.body.appendChild(debugWindow);
        let d=false,sx,sy,sl,st;
        function start(e) { d=true; const p=e.touches?e.touches[0]:e; sx=p.clientX; sy=p.clientY; const r=debugWindow.getBoundingClientRect(); sl=r.left; st=r.top; e.preventDefault(); }
        function move(e) { if(!d) return; const p=e.touches?e.touches[0]:e; debugWindow.style.left=(sl+p.clientX-sx)+'px'; debugWindow.style.top=(st+p.clientY-sy)+'px'; debugWindow.style.right='auto'; }
        function end() { d=false; }
        titleBar.addEventListener('mousedown',start); titleBar.addEventListener('touchstart',start,{passive:false});
        document.addEventListener('mousemove',move); document.addEventListener('touchmove',move,{passive:false});
        document.addEventListener('mouseup',end); document.addEventListener('touchend',end);
    }
    function debugAppend(msg) { if(!CONFIG.debug) return; if(!debugInit) initDebugWindow(); if(debugLog) { debugLog.value += msg+'\n'; debugLog.scrollTop=debugLog.scrollHeight; } }

    // ========== 极简 Toast ==========
    function showToast(msg, isErr=false, dur=null) {
        if(CONFIG.debug) { debugAppend(msg); return; }
        let c = document.getElementById('tm-toast-container');
        if(!c) { c=document.createElement('div'); c.id='tm-toast-container'; c.style.cssText='position:fixed;top:10px;right:10px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;'; document.body.appendChild(c); }
        const t=document.createElement('div'); t.textContent=msg; t.style.cssText='background:'+(isErr?'#c0392b':'#2c3e50')+';color:#ecf0f1;padding:6px 12px;font-size:14px;max-width:350px;';
        c.insertBefore(t, c.firstChild);
        const d = dur ?? CONFIG.toastDuration;
        if(d>0) setTimeout(()=>t.remove(), d);
    }

    // ========== 插件系统 ==========
    let pluginsData = { roots:{}, plugins:{} };
    function loadPluginsMap(callback) {
        showToast('🌐 正在获取插件映射表...', false, 2000);
        GM_xmlhttpRequest({ method:'GET', url: CONFIG.pluginsMapURL+'?t='+Date.now(),
            onload(r) {
                if(r.status===200) { try { pluginsData=JSON.parse(r.responseText); showToast('✅ 插件映射表已更新',false,2000); if(CONFIG.debug) debugAppend('✅ 插件映射表已更新'); } catch(e) { showToast('❌ 插件表解析失败',true); if(CONFIG.debug) debugAppend('❌ 插件表解析失败: '+e.message); } }
                else { showToast('❌ 插件表下载失败 ('+r.status+')',true); if(CONFIG.debug) debugAppend('❌ 插件表下载失败: '+r.status); }
                callback();
            },
            onerror() { showToast('❌ 插件表网络错误',true); if(CONFIG.debug) debugAppend('❌ 插件表网络错误'); callback(); }
        });
    }
    function resolvePluginAlias(alias) {
        const path = pluginsData.plugins[alias]; if(!path) return null;
        const prefix = alias.split('/')[0]; const base = pluginsData.roots[prefix]; if(!base) return null;
        return new URL(path, base).href;
    }
    function loadPlugin(alias, callback) {
        const resolved = resolvePluginAlias(alias);
        if(!resolved) { if(typeof callback==='function') callback(false, 'Unknown alias: '+alias); return; }
        if(CONFIG.debug) debugAppend(`🔗 动态加载插件: ${alias} → ${resolved}`);
        GM_xmlhttpRequest({ method:'GET', url: resolved+'?t='+Date.now(),
            onload(r) {
                if(r.status===200) { try { GM_addElement('script',{textContent:r.responseText}); if(typeof callback==='function') callback(true, r.responseText); if(CONFIG.debug) debugAppend(`✅ 插件 ${alias} 加载成功`); } catch(e) { if(typeof callback==='function') callback(false, e.message); if(CONFIG.debug) debugAppend(`❌ 插件注入失败: ${e.message}`); } }
                else { if(typeof callback==='function') callback(false, 'HTTP '+r.status); if(CONFIG.debug) debugAppend(`❌ 插件加载失败 HTTP ${r.status}`); }
            },
            onerror(e) { if(typeof callback==='function') callback(false, 'Network error'); if(CONFIG.debug) debugAppend('❌ 插件网络错误'); }
        });
    }
    function exposePluginLoader() {
        if(typeof unsafeWindow==='undefined'||typeof exportFunction!=='function') return;
        if(unsafeWindow.SW_loadPlugin) return;
        unsafeWindow.SW_loadPlugin = exportFunction(loadPlugin, unsafeWindow);
    }

    // ========== 代码执行 ==========
    function executeCode(code, source='') {
        if(CONFIG.debug) { debugAppend(`⚡ ${source}:\n${code}`); } else { showToast('📄 网站正在通过脚本运行 JS'); }
        try {
            if(typeof GM!=='undefined'&&typeof GM.addElement==='function') GM.addElement('script',{textContent:code});
            else if(typeof GM_addElement==='function') GM_addElement('script',{textContent:code});
            else new Function(code)();
            if(CONFIG.debug) debugAppend(`✅ ${source}成功`);
        } catch(e) {
            const m=`❌ ${source}错误: ${e.message}`;
            if(CONFIG.debug) debugAppend(m); else showToast(m,true);
        }
    }

    // ========== 内嵌块处理 ==========
    function processInlineBlocks() {
        const blocks = document.querySelectorAll('script[type="x-tm-inline"]');
        if(blocks.length) {
            if(CONFIG.debug) debugAppend(`📌 内嵌块: ${blocks.length} 个`);
            blocks.forEach((b,i)=>{ const code=b.textContent.trim(); if(code) executeCode(code, `内嵌${i+1}`); });
            return true;
        }
        return false;
    }

    // ========== 远程脚本 ==========
    function loadRemoteScript() {
        const meta = document.querySelector('meta[name="tm-dynamic-script"]'); if(!meta) return;
        let url = meta.getAttribute('content'); if(!url) return;
        if(url.startsWith('@')) {
            const resolved=resolvePluginAlias(url);
            if(resolved) { showToast(`🦋 加载插件: ${url}`,false,2000); if(CONFIG.debug) debugAppend(`🔗 别名解析: ${url} → ${resolved}`); url=resolved; }
            else { const msg=`❌ 未知插件别名: ${url}`; if(CONFIG.debug) debugAppend(msg); else showToast(msg,true); return; }
        }
        if(CONFIG.debug) debugAppend(`🌐 远程: ${url}`); else showToast('📄 网站正在通过脚本运行 JS');
        GM_xmlhttpRequest({ method:'GET', url: url+'?t='+Date.now(),
            onload(r) { if(r.status===200) { if(CONFIG.debug) debugAppend('📥 远程下载成功'); executeCode(r.responseText, '远程'); } else { const e=`❌ 远程失败 ${r.status}`; if(CONFIG.debug) debugAppend(e); else showToast(e,true); } },
            onerror(e) { const m='❌ 网络错误'; if(CONFIG.debug) debugAppend(m); else showToast(m,true); }
        });
    }

    // ========== 跨页面注入（带确认） ==========
    function urlMatch(pattern, url) {
        if(!pattern||pattern==='*') return true;
        const regexStr = pattern.replace(/\*\*/g,'(.+)').replace(/\*/g,'([^/]+)').replace(/\//g,'\\/').replace(/\./g,'\\.');
        return new RegExp('^'+regexStr+'$').test(url);
    }
    function getDomainFromTarget(target) { if(!target||target==='*') return '*'; const m=target.match(/^(https?:\/\/[^\/\*]+)/); return m?m[1]:target; }
    let persistentDenied = new Set();
    try { persistentDenied = new Set(JSON.parse(GM_getValue('sw_cross_denied_domains','[]'))); } catch(e) {}
    function saveDeniedDomains() { GM_setValue('sw_cross_denied_domains', JSON.stringify([...persistentDenied])); }

    function confirmCrossInjection(details, callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2147483647;display:flex;justify-content:center;align-items:center;';
        const dialog = document.createElement('div');
        dialog.style.cssText='background:#1e1e1e;color:#f0f0f0;padding:24px;max-width:500px;border:2px solid #e74c3c;';
        dialog.innerHTML = `
            <h3 style="color:#e74c3c;">⚠️ 跨页面注入确认</h3>
            <p>你是想从这个页面向其他页面注入代码/插件吗？</p>
            <p><b>当前页面：</b>${details.source}</p>
            <p><b>目标模式：</b>${details.target}</p>
            <p><b>注入内容：</b>${details.summary}</p>
            <div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:8px;">
                <button data-action="temp-allow" style="background:#f39c12;color:white;border:none;padding:8px 16px;cursor:pointer;">暂时允许</button>
                <button data-action="allow" style="background:#2ecc71;color:white;border:none;padding:8px 16px;cursor:pointer;">本次允许</button>
                <button data-action="temp-deny" style="background:#e67e22;color:white;border:none;padding:8px 16px;cursor:pointer;">暂时拒绝</button>
                <button data-action="deny" style="background:#e74c3c;color:white;border:none;padding:8px 16px;cursor:pointer;">本次拒绝</button>
                <button data-action="deny-domain" style="background:#c0392b;color:white;border:none;padding:8px 16px;cursor:pointer;">拒绝此域名</button>
            </div>
        `;
        overlay.appendChild(dialog); document.body.appendChild(overlay);
        dialog.addEventListener('click', (e)=>{ const action=e.target.dataset.action; if(!action) return; document.body.removeChild(overlay); callback(action); });
    }

    // 待处理回调轮询
    let pendingCrossIds = new Set(), resultCheckerInterval = null;
    function loadPendingIds() { try { pendingCrossIds=new Set(JSON.parse(GM_getValue('sw_cross_pending_ids','[]'))); } catch(e) { pendingCrossIds=new Set(); } }
    function savePendingIds() { GM_setValue('sw_cross_pending_ids', JSON.stringify([...pendingCrossIds])); }
    function startResultChecker() {
        if(resultCheckerInterval) return;
        loadPendingIds(); if(pendingCrossIds.size===0) return;
        resultCheckerInterval = setInterval(()=>{
            let changed=false;
            for(const id of pendingCrossIds) {
                const key = 'sw_cross_result_'+id, json = GM_getValue(key, '');
                if(json) {
                    try { const result=JSON.parse(json); showToast(`📬 回调: ${result.executor||'?'} - ${result.success?'成功':'失败'}`, !result.success); if(CONFIG.debug) debugAppend('📬 回调: '+JSON.stringify(result)); } catch(e) { showToast('❌ 回调解析失败',true); }
                    GM_setValue(key, ''); pendingCrossIds.delete(id); changed=true;
                }
            }
            if(changed) savePendingIds();
            if(pendingCrossIds.size===0) { clearInterval(resultCheckerInterval); resultCheckerInterval=null; }
        }, 1000);
    }

    function crossExec(code, target) {
        const perms = getSessionPermissions(); const key=`exec_${target}`;
        if(perms[key]==='deny') { showToast('⛔ 已暂时拒绝跨页注入',true); return; }
        const details = { source: location.href, target: target||'*', summary: '执行代码: '+(code.length>50?code.slice(0,50)+'...':code) };
        confirmCrossInjection(details, (action)=>{
            if(action==='temp-allow') { perms[key]='allow'; setSessionPermissions(perms); }
            else if(action==='temp-deny') { perms[key]='deny'; setSessionPermissions(perms); showToast('⛔ 已暂时拒绝',true); return; }
            else if(action==='deny') { showToast('⛔ 本次拒绝',true); return; }
            else if(action==='deny-domain') { persistentDenied.add(getDomainFromTarget(target)); saveDeniedDomains(); showToast('⛔ 已永久拒绝域名',true); return; }
            const id=randomId(), cmd={id, type:'exec', payload:code, target:target||'*', sourceOrigin:location.origin, timestamp:Date.now()};
            GM_setValue('sw_cross_cmd', JSON.stringify(cmd)); showToast('📨 命令已发送');
            pendingCrossIds.add(id); savePendingIds(); startResultChecker();
        });
    }
    function crossLoadPlugin(alias, target) {
        const perms = getSessionPermissions(); const key=`plugin_${alias}_${target}`;
        if(perms[key]==='deny') { showToast('⛔ 已暂时拒绝',true); return; }
        const details = { source: location.href, target: target||'*', summary: '加载插件: '+alias };
        confirmCrossInjection(details, (action)=>{
            if(action==='temp-allow') { perms[key]='allow'; setSessionPermissions(perms); }
            else if(action==='temp-deny') { perms[key]='deny'; setSessionPermissions(perms); showToast('⛔ 已暂时拒绝',true); return; }
            else if(action==='deny') { showToast('⛔ 本次拒绝',true); return; }
            else if(action==='deny-domain') { persistentDenied.add(getDomainFromTarget(target)); saveDeniedDomains(); showToast('⛔ 已永久拒绝域名',true); return; }
            const id=randomId(), cmd={id, type:'loadPlugin', payload:alias, target:target||'*', sourceOrigin:location.origin, timestamp:Date.now()};
            GM_setValue('sw_cross_cmd', JSON.stringify(cmd)); showToast('📨 插件命令已发送');
            pendingCrossIds.add(id); savePendingIds(); startResultChecker();
        });
    }
    function exposeCrossFunctions() {
        if(typeof unsafeWindow==='undefined'||typeof exportFunction!=='function') return;
        if(!unsafeWindow.SW_crossExec) unsafeWindow.SW_crossExec = exportFunction(crossExec, unsafeWindow);
        if(!unsafeWindow.SW_crossLoadPlugin) unsafeWindow.SW_crossLoadPlugin = exportFunction(crossLoadPlugin, unsafeWindow);
    }

    // 接收端
    function startCrossReceiver() {
        if(typeof GM_addValueChangeListener!=='function') return;
        GM_addValueChangeListener('sw_cross_cmd', function(name, oldVal, newVal, remote){
            if(!remote||!newVal) return;
            try {
                const cmd = JSON.parse(newVal);
                if(!urlMatch(cmd.target, location.href)) return;
                if(CONFIG.debug) debugAppend(`📥 收到远程命令: ${JSON.stringify(cmd)}`);
                else showToast(`📥 收到来自 ${cmd.sourceOrigin||'远程'} 的命令`);
                const result = { success:true, message:'', executor:location.href, timestamp:Date.now() };
                try {
                    if(cmd.type==='exec') { executeCode(cmd.payload, '跨页'); result.message='Code executed'; }
                    else if(cmd.type==='loadPlugin') { loadPlugin(cmd.payload, (success,detail)=>{ const res={success, message:success?'Plugin loaded':(detail||'Failed'), executor:location.href, timestamp:Date.now()}; GM_setValue('sw_cross_result_'+cmd.id, JSON.stringify(res)); if(CONFIG.debug) debugAppend('📬 结果已写入: '+JSON.stringify(res)); }); return; }
                } catch(e) { result.success=false; result.message=e.message; }
                GM_setValue('sw_cross_result_'+cmd.id, JSON.stringify(result));
                if(CONFIG.debug) debugAppend('📬 结果已写入: '+JSON.stringify(result));
            } catch(e) { if(CONFIG.debug) debugAppend('❌ 远程命令解析失败: '+e.message); }
        });
    }

    // ========== 增强代码扫描（支持 Markdown 和纯 JS） ==========
    function showCodePrompt(code, sourceLabel, parentElement) {
        const rect = parentElement.getBoundingClientRect();
        if(!rect.width && !rect.height) return;
        const p = document.createElement('div');
        p.style.cssText = 'position:fixed;z-index:2147483647;background:#2c3e50;color:#ecf0f1;padding:4px 8px;font-size:13px;display:flex;align-items:center;gap:6px;';
        p.innerHTML = '🦋 可执行 (' + sourceLabel + ')';
        const runBtn=document.createElement('button'); runBtn.textContent='执行'; runBtn.style.cssText='padding:0 8px;';
        const cancelBtn=document.createElement('button'); cancelBtn.textContent='取消'; cancelBtn.style.cssText='padding:0 8px;';
        const crossBtn=document.createElement('button'); crossBtn.textContent='跨页注入'; crossBtn.style.cssText='padding:0 8px;background:#e67e22;color:white;border:none;';
        runBtn.onclick=()=>{ executeCode(code,'文本'); p.remove(); };
        cancelBtn.onclick=()=>p.remove();
        crossBtn.onclick=()=>{
            const target = prompt('输入目标模式（* 匹配所有页面，支持通配符）：', '*');
            if(target!==null) { if(typeof crossExec==='function') crossExec(code, target); else showToast('❌ 跨页注入功能不可用',true); }
            p.remove();
        };
        p.appendChild(runBtn); p.appendChild(crossBtn); p.appendChild(cancelBtn);
        document.body.appendChild(p);
        p.style.top = Math.max(5, rect.top - p.offsetHeight - 5) + 'px';
        p.style.left = Math.max(5, Math.min(rect.left, innerWidth - p.offsetWidth - 5)) + 'px';
    }

    function scanTextForCode() {
        if(!CONFIG.scanTextForCode) return;
        const reInlineTag = /(?:<script\s+type\s*=\s*["']x-tm-inline["']\s*>|&lt;script\s+type\s*=\s*["']x-tm-inline["']\s*&gt;)\s*([\s\S]*?)\s*(?:<\/script>|&lt;\/script&gt;)/gi;
        const reMdTag = /```html\s*\n\s*(<script\s+type\s*=\s*["']x-tm-inline["']\s*>[\s\S]*?<\/script>)\s*\n\s*```/gi;
        const reJSBlock = /```(?:js|javascript)\s*\n([\s\S]*?)\n\s*```/gi;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(n) {
                const p = n.parentNode.tagName;
                return (p==='SCRIPT'||p==='STYLE'||p==='NOSCRIPT') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });
        const seen = new Set();
        let node;
        while((node = walker.nextNode())) {
            const text = node.textContent;
            if(!text.includes('x-tm-inline') && !text.includes('```')) continue;

            // 原始格式
            reInlineTag.lastIndex = 0; let m;
            while((m = reInlineTag.exec(text)) !== null) {
                const code = m[1].trim(); if(!code) continue;
                const key = node.parentNode.tagName + '-' + m.index + '-' + code.slice(0,25);
                if(seen.has(key)) continue; seen.add(key);
                showCodePrompt(code, '内嵌标签', node.parentNode);
            }

            // Markdown 包裹的灵蝶标签
            reMdTag.lastIndex = 0;
            while((m = reMdTag.exec(text)) !== null) {
                const fullTag = m[1].trim();
                const codeMatch = fullTag.match(/<script\s+type\s*=\s*["']x-tm-inline["']\s*>([\s\S]*?)<\/script>/i);
                if(codeMatch && codeMatch[1]) {
                    const code = codeMatch[1].trim();
                    const key = node.parentNode.tagName + '-md-' + m.index + '-' + code.slice(0,25);
                    if(seen.has(key)) continue; seen.add(key);
                    showCodePrompt(code, 'Markdown灵蝶标签', node.parentNode);
                }
            }

            // 纯 JS 代码块
            reJSBlock.lastIndex = 0;
            while((m = reJSBlock.exec(text)) !== null) {
                const code = m[1].trim(); if(!code) continue;
                const key = node.parentNode.tagName + '-js-' + m.index + '-' + code.slice(0,25);
                if(seen.has(key)) continue; seen.add(key);
                showCodePrompt(code, 'JS代码块', node.parentNode);
            }
        }
    }

    // ========== 启动 ==========
    function main() {
        showToast(`🦋 欢迎使用灵蝶 v${VERSION}`, false, 3000);
        if(CONFIG.debug) debugAppend(`🦋 灵蝶 v${VERSION} 启动`);
        exposeGMToPage(); exposePluginLoader(); exposeCrossFunctions();
        startResultChecker(); startCrossReceiver();
        loadPluginsMap(()=>{
            const hasInline = processInlineBlocks();
            if(!hasInline) loadRemoteScript();
            if(document.readyState==='complete') scanTextForCode();
            else window.addEventListener('load', scanTextForCode);
            if(unsafeWindow) unsafeWindow.__ScriptWeaver__ = true;
        });
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', main);
    else main();
})();
