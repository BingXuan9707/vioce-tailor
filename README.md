# 音频剪辑工具 (Audio Tailor)

一款简单易用的音频剪辑工具，支持在浏览器中直接使用，可安装到手机或电脑桌面。

## 🎯 功能特性

- 🎵 上传音频文件进行剪辑
- ✂️ 可视化波形显示
- ⏯️ 播放控制（播放、暂停、快进、后退）
- 📐 精确裁剪音频片段
- 💾 导出裁剪后的音频文件
- 📱 支持 PWA 安装到手机桌面

## 🚀 使用方式

### 在线访问

打开浏览器访问：
```
https://bingxuan9707.github.io/vioce-tailor/
```

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 📱 手机端使用

### 安装到手机桌面

1. 在手机浏览器中打开：`https://bingxuan9707.github.io/vioce-tailor/`
2. 点击浏览器菜单（通常是右上角三个点）
3. 选择 **"添加到主屏幕"** 或 **"安装应用"**
4. 手机桌面会出现"音频剪辑工具"图标
5. 点击图标即可像原生 App 一样使用

### 支持的浏览器

- ✅ Chrome（推荐）
- ✅ Safari
- ✅ Edge
- ✅ Firefox

## 🛠️ 技术栈

- React 18
- TypeScript
- Vite
- Tailwind CSS
- WaveSurfer.js

## 📁 项目结构

```
audio-tailor/
├── src/
│   ├── components/          # React 组件
│   │   ├── AudioUploader.tsx    # 音频上传组件
│   │   ├── Waveform.tsx         # 波形显示组件
│   │   ├── PlaybackControls.tsx # 播放控制组件
│   │   ├── TrimControls.tsx     # 裁剪控制组件
│   │   ├── ExportButton.tsx     # 导出按钮组件
│   │   └── Header.tsx           # 头部组件
│   ├── utils/               # 工具函数
│   │   └── audioUtils.ts        # 音频处理工具
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 入口文件
│   └── index.css            # 全局样式
├── public/                  # 静态资源
│   ├── icons/               # 应用图标
│   ├── manifest.json        # PWA 配置
│   └── service-worker.js    # 服务工作线程
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind 配置
└── package.json             # 项目依赖
```

## 📄 License

MIT License

---

🎉 享受剪辑音频的乐趣！
