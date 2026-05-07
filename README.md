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
- 使用 `GM.addElement` 安全注入代码，不受页面 CSP（内容安全策略）限制
- 内置 **可拖拽调试窗口**，完整记录执行过程与代码内容
- 智能扫描页面中 **以多种形式呈现的灵蝶代码**（含 Markdown 代码块），并提供一键执行按钮
- 将 Tampermonkey 的 **GM 高级 API 渗透至页面全局**，内嵌代码可直接调用 `GM_xmlhttpRequest`、`GM_setValue` 等
- 提供**插件市场 & 动态加载**，通过别名即可拉取远程脚本，无需刷新页面
- 实现**跨页面遥控**：在同一浏览器内，从任意页面将代码或插件实时推送至其他已打开的灵蝶页面

**一句话：**  
只需要在网页里插一个小标签，任何安装了灵蝶的访客都能看到原本不存在的交互效果。

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
<script type="x-tm-inline">
  document.body.style.border = "5px solid #3b82f6";
  console.log("灵蝶已运行！");
</script>
```

刷新页面，如果灵蝶脚本已启用，你会看到页面出现蓝色边框，以及右上角的调试窗口（调试模式开启时）。

---

🧪 在线演示

· 功能演示页：test.html
    包含中英文切换、深色模式、实时时钟、素数计算、GM API、插件市场、跨页面遥控等示例，全部由灵蝶内嵌代码驱动。
· 官网首页：https://wzmwayne.github.io/ScriptWeaver/
    自动检测脚本安装状态，已安装时展示感谢动画。

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
· 借助 GM_xmlhttpRequest 可突破浏览器同源限制。
· 内嵌代码优先级更高：如果页面同时存在内嵌块，远程加载将被忽略。

3. 插件别名加载

灵蝶内置了插件市场，只需在页面中声明别名，即可自动从 GitHub Pages 拉取并执行对应插件：

```html
<meta name="tm-dynamic-script" content="@sw/dark-mode">
```

或在 x-tm-inline 代码中动态加载：

```javascript
SW_loadPlugin("@sw/dark-mode", function(success, detail) { … });
```

插件映射表托管于 plugins.json，开发者可按分类（ui/、tools/ 等）添加新插件。
当前官方插件包括：暗黑模式、回到顶部、阅读进度条、平滑滚动、代码复制、极简时钟、可拖拽计时器（正/倒计时）等。

4. 文本嵌入式代码（支持 Markdown）

如果在页面正文中写出了完整的灵蝶代码示例（包括 Markdown 代码块），灵蝶会自动识别并在代码旁显示 「🦋 可执行」 按钮，点击即可运行。

支持的格式：

· 纯文本灵蝶标签：<script type="x-tm-inline">……</script>
· Markdown HTML 区块： ```html …… ``` 
· Markdown JS 区块： ```js …… ``` 

每个识别出的代码块旁会出现 [执行] [跨页注入] [取消] 三个按钮。

---

🧪 在内嵌代码中使用 GM API

灵蝶已将常用 Tampermonkey 高级函数暴露到页面全局。
在 <script type="x-tm-inline"> 中可直接调用，无需额外声明。

可用函数：
GM_xmlhttpRequest · GM_setValue · GM_getValue · GM_notification · GM_openInTab · GM_addStyle · GM_info

示例：

```html
<script type="x-tm-inline">
  // 存储用户设置
  GM_setValue('theme', 'dark');
  const savedTheme = GM_getValue('theme', 'light');
  console.log(savedTheme);

  // 桌面通知
  GM_notification('欢迎使用灵蝶！', 'ScriptWeaver');

  // 跨域请求
  GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://api.example.com/data',
    onload: function(res) {
      console.log(res.responseText);
    }
  });
</script>
```

---

🎮 跨页面遥控

灵蝶支持同一浏览器内不同标签页之间的实时代码注入。

可从任意页面将代码或插件推送到其他已打开的灵蝶页面，发起前会弹出全屏确认框，确保安全。

可用函数（在 x-tm-inline 中直接调用）：

函数 说明
SW_crossExec(code, target) 向匹配目标注入代码，target 为 URL 通配符（* 匹配所有页面）
SW_crossLoadPlugin(alias, target) 向匹配目标发送插件加载命令

示例：

```javascript
// 向所有页面注入暗黑模式插件
SW_crossLoadPlugin('@sw/dark-mode', '*');

// 向特定域名注入代码
SW_crossExec(
  "document.body.style.background = 'gold'",
  'https://*.example.com/**'
);
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
  // 检测灵蝶是否运行（灵蝶会在页面设置 window.__ScriptWeaver__ = true）
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

