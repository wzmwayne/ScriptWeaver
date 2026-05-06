# 🦋 ScriptWeaver · 灵蝶

[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Script-brightgreen)](https://www.tampermonkey.net/)

**轻量级动态脚本注入引擎** —— 一个 Tampermonkey 脚本，为任意静态网页赋予动态能力。

> 构思与需求：[wzmwayne](https://github.com/wzmwayne)  
> 代码主要生成：[DeepSeek AI](https://deepseek.com/)

---

## 📦 项目简介

灵蝶（ScriptWeaver）可以：
- 在 **纯静态 HTML** 中执行任意 JavaScript，无需后端
- 通过页面的 `<meta>` 标签或自定义 `<script type="x-tm-inline">` 引入动态逻辑
- 支持 **安全指令（JSON）** 或 **原生 JS**（当前版本精简为原生 JS 模式）
- 内置 **调试模式**，右上角 Toast 堆叠显示执行过程
- 借助 Tampermonkey 的 `GM_xmlhttpRequest` 可实现无跨域限制的远程脚本加载

**一句话：**  
只需要在网页里插一个小标签，任何访问者（安装了灵蝶）都能看到原本不存在的交互效果。

---

## 🚀 快速开始

### 1. 安装 Tampermonkey 扩展
访问 [Tampermonkey 官网](https://www.tampermonkey.net/) 为你的浏览器安装扩展。

### 2. 安装灵蝶脚本
点击下方链接，Tampermonkey 会自动弹出安装窗口：

👉 **[📥 安装灵蝶](https://github.com/wzmwayne/ScriptWeaver/raw/refs/heads/main/ScriptWeaver.user.js)**  


### 3. 开始使用
在你的 HTML 页面中加入：

```html
<!-- 方式一：内嵌动态代码 -->
<script type="x-tm-inline">
  document.body.style.border = "5px solid #3b82f6";
  console.log("灵蝶已运行！");
</script>
```

刷新页面，如果灵蝶脚本已启用，你会看到页面出现蓝色边框，右上角出现 Toast 提示（调试模式下）。

---

🧪 在线演示

· 功能演示页：test.html
    包含中英文切换、深色模式、实时时钟、素数计算等示例，全部由灵蝶内嵌代码驱动。
· 官网首页：https://wzmwayne.github.io/ScriptWeaver/
    检测脚本安装状态，已安装时展示感谢动画。

---

🔧 开发指南

📋 页面中可用的声明方式

1. 内嵌代码块

在页面中插入一个或多个 x-tm-inline 脚本，灵蝶会依次执行它们：

```html
<script type="x-tm-inline">
  // 你的 JavaScript 代码
</script>
```

特点：

· 支持多个块，按顺序执行。
· 块与块之间可共享变量（作用域相同）。
· 适用于页面专属的交互逻辑。

2. 远程脚本加载

通过 <meta> 标签指定一个远程 JS 文件，灵蝶会自动拉取并执行：

```html
<meta name="tm-dynamic-script" content="https://example.com/script.js">
```

特点：

· 适合多个页面共用同一套代码。
· 突破浏览器同源限制（需脚本中 @grant GM_xmlhttpRequest 和 @connect *）。
· 内嵌代码优先级更高：如果页面同时存在内嵌块，远程加载将被忽略。

3. 权限声明（可选）

页面可以告知灵蝶自己需要哪些 GM 高级功能，脚本会在右上角 Toast 提示是否满足：

```html
<meta name="scriptweaver-permissions" content="xhr,storage,notification">
```

支持的权限简称：

· xhr → GM_xmlhttpRequest（跨域请求）
· storage → GM_setValue / GM_getValue
· notification → GM_notification
· opentab → GM_openInTab
· info → GM_info
· addstyle → GM_addStyle

---

🔀 将现有 JS 迁移至灵蝶

从 <script> 内嵌代码迁移

1. 把 <script>你的代码</script> 改为 <script type="x-tm-inline">你的代码</script>。
2. 删除或注释原标签，避免重复执行。
3. 多个独立脚本块可分别放入多个 x-tm-inline 块。

从 <script src="app.js"> 迁移

1. 将 app.js 上传至可 HTTPS 访问的服务器。
2. 在页面 <head> 中添加：
   ```html
   <meta name="tm-dynamic-script" content="https://你的域名/app.js">
   ```
3. 移除原来的 <script src="...">。

使用 Tampermonkey 高级功能

如果你需要在迁移后的代码中使用 GM_xmlhttpRequest 等 API，只要灵蝶脚本已经 @grant 了这些权限，便可以直接调用，就像在普通用户脚本中一样。

---

⚙️ 脚本配置

编辑灵蝶脚本，在开头 CONFIG 对象中修改参数：

```javascript
const CONFIG = {
    debug: true,              // true = 显示详细执行过程 Toast；false = 仅显示“网站正在通过脚本运行 JS”
    toastDuration: 4000,      // Toast 显示毫秒数，0 为常驻
};
```

· 调试模式（debug: true）：每个内嵌块、远程脚本的加载与执行都会在右上角生成独立的 Toast，方便追踪。
· 非调试模式：每次执行 JS 时仅显示一条简洁的提示，多次执行会堆叠。

---

🧰 示例：为静态页面添加交互

假设你想给一个页面添加“随机背景色”按钮：

```html
<button id="random-bg">🎨 换背景</button>

<script type="x-tm-inline">
  document.getElementById('random-bg').addEventListener('click', function() {
    document.body.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);
  });
</script>
```

将这两段代码放入任何 HTML 中，你的访客（安装了灵蝶）就能使用该按钮。

---

🤝 贡献与反馈

本项目由 wzmwayne 提供构思与需求，DeepSeek AI 辅助生成代码。
欢迎在 GitHub Issues 提出建议或反馈。

项目仓库：https://github.com/wzmwayne/ScriptWeaver

---

<!-- 🦋 实验性：嵌入式灵蝶代码块
     如果你已安装灵蝶并浏览本 README 的 HTML 版本，
     下面的块可能会被执行（浏览器环境下，Markdown 可能被渲染为 HTML）
-->

<script type="x-tm-inline">
  // 灵蝶实验：在 README 中嵌入代码
  // 若灵蝶运行且页面允许，会在控制台留下痕迹
  console.log('🦋 灵蝶实验性注入 - 来自 README.md');
  // 你也可以在页面上添加一个微小的提示（仅当 Markdown 按 HTML 解析时可见）
  (function() {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:10px;left:10px;background:#2c3e50;color:#ecf0f1;padding:4px 10px;border-radius:4px;font-size:12px;z-index:9999';
    el.textContent = '🦋 灵蝶已检测到 README 注入';
    document.body.appendChild(el);
  })();
</script>

🦋 让静态网页，轻舞飞扬。

