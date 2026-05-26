# 音频剪辑工具 - 技术架构文档

## 1. 架构概述

### 1.1 架构风格
采用现代React前端架构，组件化设计，状态管理使用React Hooks。

### 1.2 技术栈
| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | React | 18 | 前端UI框架 |
| 语言 | TypeScript | 5 | 类型安全 |
| 样式 | TailwindCSS | 3 | CSS框架 |
| 音频处理 | Web Audio API | - | 浏览器原生音频处理 |
| 波形显示 | Wavesurfer.js | 7 | 音频波形可视化 |
| 构建工具 | Vite | 6 | 快速构建工具 |

---

## 2. 组件架构

### 2.1 组件层次结构

```
App.tsx (主应用)
├── Header.tsx (头部导航)
├── AudioUploader.tsx (文件上传组件)
├── AudioPlayer.tsx (音频播放器)
│   ├── Waveform.tsx (波形显示)
│   ├── PlaybackControls.tsx (播放控制)
│   └── Timeline.tsx (时间轴)
├── TrimControls.tsx (裁剪控制)
└── ExportButton.tsx (导出按钮)
```

### 2.2 组件职责

| 组件 | 职责 |
|------|------|
| App | 主应用入口，状态管理 |
| Header | 品牌展示和导航 |
| AudioUploader | 文件上传和拖拽处理 |
| AudioPlayer | 音频播放容器 |
| Waveform | 波形渲染和交互 |
| PlaybackControls | 播放/暂停、进度条 |
| Timeline | 时间显示和标记 |
| TrimControls | 裁剪范围设置 |
| ExportButton | 导出音频文件 |

---

## 3. 数据流

### 3.1 状态管理

```typescript
interface AudioState {
  file: File | null;
  fileName: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  startTrim: number;
  endTrim: number;
  audioContext: AudioContext | null;
  sourceNode: AudioBufferSourceNode | null;
}
```

### 3.2 数据流向

1. **文件上传** → AudioUploader → 更新file状态
2. **音频加载** → Waveform组件使用Wavesurfer.js解析
3. **播放控制** → PlaybackControls → 更新isPlaying和currentTime
4. **裁剪操作** → TrimControls/Waveform → 更新startTrim/endTrim
5. **导出** → ExportButton → 使用Web Audio API处理并下载

---

## 4. API设计

### 4.1 内部方法

| 方法名 | 功能 | 参数 | 返回值 |
|--------|------|------|--------|
| handleFileUpload | 处理文件上传 | file: File | void |
| handlePlayPause | 播放/暂停切换 | - | void |
| handleTimeUpdate | 时间更新 | time: number | void |
| handleTrimChange | 裁剪范围变更 | start: number, end: number | void |
| exportAudio | 导出音频 | - | Promise<void> |

---

## 5. 目录结构

```
src/
├── components/
│   ├── Header.tsx
│   ├── AudioUploader.tsx
│   ├── AudioPlayer.tsx
│   ├── Waveform.tsx
│   ├── PlaybackControls.tsx
│   ├── Timeline.tsx
│   ├── TrimControls.tsx
│   └── ExportButton.tsx
├── hooks/
│   └── useAudioEditor.ts
├── utils/
│   └── audioUtils.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## 6. 关键技术实现

### 6.1 波形显示
使用Wavesurfer.js库渲染音频波形，支持拖拽选择裁剪区域。

### 6.2 音频播放
使用Web Audio API创建AudioContext，实现精确的音频播放控制。

### 6.3 裁剪算法
通过设置播放范围，使用AudioBufferSourceNode的start和stop方法实现裁剪。

### 6.4 导出功能
创建新的AudioBuffer，提取裁剪区域的数据，编码为WAV格式下载。

---

## 7. 安全性

- 文件处理完全在客户端完成，无服务器上传
- 文件大小限制（50MB）
- 仅允许音频格式文件

---

## 8. 性能优化

- 使用Web Worker处理音频解析
- 懒加载波形渲染
- 限制最大文件大小
