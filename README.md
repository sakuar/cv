# 简历工坊 · Resume Studio

一个纯前端的个人简历网页，支持**多账号、登录门、4 套模板 + 7 种皮肤、实时预览、导出 PDF**。
零依赖、零构建，直接推到 GitHub Pages 即可访问。

## ✨ 功能

- **登录门**：注册 / 登录后才能进入，陌生人无法直接浏览内容（见下方安全说明）
- **多账号**：每个用户名各存一份简历，互不干扰
- **4 套模板**：简约专业 / 创意色彩 / 技术极客 / 杂志摆齐
- **7 种皮肤**：靛蓝 / 翡翠 / 玫红 / 琥珀 / 紫罗兰 / 青色 / 石墨，与模板自由组合
- **实时预览**：左边填写，右边即时呈现
- **导出 PDF**：点「导出 PDF」走浏览器打印，另存为 PDF
- **备份 / 导入**：导出 JSON 文件备份，换设备时导入恢复

## 🚀 部署到 GitHub Pages

1. 新建一个 GitHub 仓库（例如 `resume`），把本目录所有文件传上去：
   ```bash
   git init
   git add .
   git commit -m "init resume studio"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/resume.git
   git push -u origin main
   ```
2. 仓库页面 → **Settings → Pages** → Source 选 `Deploy from a branch` → 选 `main` 分支 `/ (root)` → Save。
3. 等一两分钟，访问 `https://<你的用户名>.github.io/resume/` 即可。

> 也可以直接在仓库网页用 “Add file → Upload files” 把文件拖上去，效果一样。

## 💻 本地预览

直接双击 `index.html` 即可（无需服务器）。或用任意静态服务器：
```bash
npx serve .
```

## ⚠️ 安全说明（请务必了解）

这是**纯前端方案**，登录是一道「软门槛」：

- 数据只存在**当前浏览器的 localStorage**里，不上传任何服务器，因此：
  - 换浏览器 / 换电脑 / 清缓存后，数据不互通（请用「备份」导出 JSON 保存）。
  - 「多人使用」指的是同一浏览器里可建多个账号；不是云端跨设备共享账号。
- 登录能挡住**普通人随手浏览**，但**挡不住懂技术的人**——静态站源码公开，密码校验在前端。
- 已加 `noindex` 防止被搜索引擎收录。若想更隐蔽，可把仓库设为私有并用 GitHub Pages 私有访问，或仓库名取得不易被猜到。

如果将来需要**真正的跨设备账号 + 服务器级登录保护**，可以升级到 GitHub Pages + Supabase（免费云后端）方案。

## 📁 文件结构

```
index.html          登录门 + 编辑器（单页应用）
css/base.css        全局布局、登录页、编辑器 UI、打印样式
css/templates.css   4 套模板 + 7 种皮肤
js/auth.js          注册/登录/会话（SHA-256 加盐）
js/store.js         简历数据读写（按账号隔离）
js/render.js        数据 → 模板 HTML
js/app.js           编辑器生成、实时预览、导入导出
```
