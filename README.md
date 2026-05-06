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
- 支持 **内嵌代码立即执行**（绕过页面 CSP 限制，使用 GM.addElement 安全注入）
- 内置 **可拖拽调试窗口**，完整记录执行过程与代码内容
- 智能扫描页面中 **以文本形式呈现的灵蝶代码**，并提供一键执行按钮
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

（也可在 [Releases](https://github.com/wzmwayne/ScriptWeaver/releases) 中下载）

### 3. 开始使用
在你的 HTML 页面中加入：

```html
<!-- 方式一：内嵌动态代码 -->
<script type="x-tm-inline">
  document.body.style.border = "5px solid #3b82f6";
  console.log("灵蝶已运行！");
</script>
```

刷新页面，如果灵蝶脚本已启用，你会看到页面出现蓝色边框，右上角出现可拖拽调试窗口（调试模式开启时）。

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
· 适合页面专属的交互逻辑。
· 执行引擎使用 GM.addElement 注入 <script> 标签，不受页面 CSP 限制。

2. 远程脚本加载

通过 <meta> 标签指定一个远程 JS 文件，灵蝶会自动拉取并执行：

```html
<meta name="tm-dynamic-script" content="https://example.com/script.js">
```

特点：

· 适合多个页面共用同一套代码。
· 突破浏览器同源限制（需脚本中 @grant GM_xmlhttpRequest 和 @connect *）。
· 内嵌代码优先级更高：如果页面同时存在内嵌块，远程加载将被忽略。

3. 文本嵌入式代码

如果在页面的正文中写出了完整的灵蝶代码示例（例如在 <pre> 或 <code> 内），灵蝶会主动识别并在代码旁显示 「🦋 可执行」 按钮，点击即可运行。

示例：

```html
<pre><code>&lt;script type="x-tm-inline"&gt;
  alert('Hello from text code!');
&lt;/script&gt;</code></pre>
```

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
    debug: true,              // true = 可拖拽调试窗口；false = 极简 Toast 堆叠
    toastDuration: 4000,      // Toast 显示毫秒数（debug: false 时生效）
    scanTextForCode: true,    // 是否扫描页面中的文本嵌入式代码
};
```

· 调试模式 (debug: true)：右上角出现可拖拽、可调整大小的调试窗口，实时输出完整代码和执行状态。
· 非调试模式：仅显示简洁的右上角 Toast 提示，多次执行会堆叠。

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

💡 推荐：在网页中加入“灵蝶未安装提示”

为了让没有安装灵蝶的访客也能了解动态功能，可以在页面中添加以下代码（独立于灵蝶，纯静态检测）：

```html
<div id="sw-install-hint" style="position:fixed;bottom:20px;right:20px;background:#2c3e50;color:#ecf0f1;padding:10px 16px;font-size:14px;z-index:9999;display:none;">
  ⚡ 本页面有动态功能，<a href="https://github.com/wzmwayne/ScriptWeaver" target="_blank" style="color:#3b82f6;">安装灵蝶</a> 后体验更好。
</div>
<script>
  // 检测灵蝶是否运行（需要脚本设置 window.__ScriptWeaver__ = true）
  if (!window.__ScriptWeaver__) {
    document.getElementById('sw-install-hint').style.display = 'block';
  }
</script>
```

该提示会在访客未安装灵蝶时自动显示，引导安装。

---

🤝 贡献与反馈

本项目由 wzmwayne 提供构思与需求，DeepSeek AI 辅助生成代码。
欢迎在 GitHub Issues 提出建议或反馈。

项目仓库：https://github.com/wzmwayne/ScriptWeaver

---

🦋 让静态网页，轻舞飞扬。
