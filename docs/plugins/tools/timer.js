// 灵蝶插件：计时器（正/倒计时，窗口可拖动）
(function() {
    'use strict';
    if (document.getElementById('sw-timer')) return;

    // ---------- 创建窗口 ----------
    const win = document.createElement('div');
    win.id = 'sw-timer';
    win.style.cssText = 'position:fixed;top:50px;left:50px;width:200px;background:#1e293b;color:#e2e8f0;z-index:2147483646;font-family:monospace;font-size:14px;display:flex;flex-direction:column;resize:both;overflow:hidden;';

    // 标题栏（可拖动）
    const titleBar = document.createElement('div');
    titleBar.textContent = '⏱ 计时器';
    titleBar.style.cssText = 'padding:6px 10px;background:#334155;user-select:none;cursor:move;';
    win.appendChild(titleBar);

    // 显示区
    const display = document.createElement('div');
    display.textContent = '00:00:00';
    display.style.cssText = 'text-align:center;font-size:24px;padding:8px;';
    win.appendChild(display);

    // 模式切换
    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;padding:4px;';
    const countUpBtn = document.createElement('button');
    countUpBtn.textContent = '正计时';
    countUpBtn.style.cssText = 'flex:1;padding:4px;border:none;background:#334155;color:#e2e8f0;cursor:pointer;';
    const countDownBtn = document.createElement('button');
    countDownBtn.textContent = '倒计时';
    countDownBtn.style.cssText = 'flex:1;padding:4px;border:none;background:#1e293b;color:#e2e8f0;cursor:pointer;';
    modeRow.appendChild(countUpBtn);
    modeRow.appendChild(countDownBtn);
    win.appendChild(modeRow);

    // 倒计时输入
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;padding:4px;display:none;';
    const input = document.createElement('input');
    input.type = 'number';
    input.placeholder = '分钟';
    input.min = '0';
    input.style.cssText = 'flex:1;padding:4px;border:none;background:#0f172a;color:#e2e8f0;';
    inputRow.appendChild(input);
    win.appendChild(inputRow);

    // 控制按钮行
    const ctrlRow = document.createElement('div');
    ctrlRow.style.cssText = 'display:flex;padding:4px;';
    const startBtn = document.createElement('button');
    startBtn.textContent = '开始';
    startBtn.style.cssText = 'flex:1;padding:4px;border:none;background:#10b981;color:#fff;cursor:pointer;';
    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = '暂停';
    pauseBtn.style.cssText = 'flex:1;padding:4px;border:none;background:#f59e0b;color:#fff;cursor:pointer;';
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '重置';
    resetBtn.style.cssText = 'flex:1;padding:4px;border:none;background:#e74c3c;color:#fff;cursor:pointer;';
    ctrlRow.appendChild(startBtn);
    ctrlRow.appendChild(pauseBtn);
    ctrlRow.appendChild(resetBtn);
    win.appendChild(ctrlRow);

    document.body.appendChild(win);

    // ---------- 拖动 ----------
    let drag = false, sx, sy, sl, st;
    function dragStart(e) {
        drag = true;
        const p = e.touches ? e.touches[0] : e;
        sx = p.clientX; sy = p.clientY;
        const r = win.getBoundingClientRect();
        sl = r.left; st = r.top;
        e.preventDefault();
    }
    function dragMove(e) {
        if (!drag) return;
        const p = e.touches ? e.touches[0] : e;
        win.style.left = (sl + p.clientX - sx) + 'px';
        win.style.top = (st + p.clientY - sy) + 'px';
        win.style.right = 'auto';
    }
    function dragEnd() { drag = false; }
    titleBar.addEventListener('mousedown', dragStart);
    titleBar.addEventListener('touchstart', dragStart, {passive: false});
    document.addEventListener('mousemove', dragMove);
    document.addEventListener('touchmove', dragMove, {passive: false});
    document.addEventListener('mouseup', dragEnd);
    document.addEventListener('touchend', dragEnd);

    // ---------- 计时逻辑 ----------
    let mode = 'up'; // 'up' 正计时, 'down' 倒计时
    let running = false;
    let startTime = 0;       // 正计时基准 Date.now()
    let elapsed = 0;         // 已过毫秒
    let targetMs = 0;        // 倒计时目标毫秒
    let intervalId = null;

    function formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return h + ':' + m + ':' + s;
    }

    function updateDisplay() {
        if (mode === 'up') {
            const now = running ? Date.now() - startTime + elapsed : elapsed;
            display.textContent = formatTime(now);
        } else {
            const remaining = running ? targetMs - (Date.now() - startTime) : targetMs;
            if (remaining <= 0) {
                display.textContent = '00:00:00';
                pause();
                // 通知
                if (typeof GM_notification === 'function') {
                    GM_notification('倒计时结束！', '灵蝶计时器');
                } else {
                    alert('倒计时结束！');
                }
                return;
            }
            display.textContent = formatTime(remaining);
        }
    }

    function start() {
        if (running) return;
        if (mode === 'down' && targetMs <= 0) return;
        startTime = Date.now();
        running = true;
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(updateDisplay, 200);
    }

    function pause() {
        if (!running) return;
        if (mode === 'up') {
            elapsed += Date.now() - startTime;
        } else {
            targetMs -= Date.now() - startTime;
            if (targetMs < 0) targetMs = 0;
        }
        running = false;
        if (intervalId) clearInterval(intervalId);
        updateDisplay();
    }

    function reset() {
        pause();
        elapsed = 0;
        targetMs = 0;
        input.value = '';
        display.textContent = '00:00:00';
    }

    function setMode(m) {
        pause();
        mode = m;
        reset();
        if (mode === 'up') {
            countUpBtn.style.background = '#334155';
            countDownBtn.style.background = '#1e293b';
            inputRow.style.display = 'none';
        } else {
            countDownBtn.style.background = '#334155';
            countUpBtn.style.background = '#1e293b';
            inputRow.style.display = 'flex';
        }
    }

    countUpBtn.addEventListener('click', () => setMode('up'));
    countDownBtn.addEventListener('click', () => setMode('down'));
    startBtn.addEventListener('click', () => {
        if (mode === 'down') {
            const mins = parseFloat(input.value);
            if (isNaN(mins) || mins <= 0) return;
            targetMs = mins * 60 * 1000;
        }
        start();
    });
    pauseBtn.addEventListener('click', pause);
    resetBtn.addEventListener('click', reset);

    // 初始模式
    setMode('up');
})();
