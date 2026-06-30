import { useState, useCallback, useRef } from 'react'
import { Header } from './components/Header'
import { AudioUploader } from './components/AudioUploader'
import { Waveform } from './components/Waveform'
import { PlaybackControls } from './components/PlaybackControls'
import { TrimControls } from './components/TrimControls'
import { ExportButton } from './components/ExportButton'
import { Timeline } from './components/Timeline'
import { exportAudio, exportMergedAudio, AudioSegment, ExportFormat } from './utils/audioUtils'

interface AudioFile {
  id: string
  file: File
  fileName: string
  audioUrl: string
  duration: number
  currentTime: number
  isPlaying: boolean
  startTrim: number
  endTrim: number
  isLoaded: boolean
  buffer: AudioBuffer | null
}

function App() {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [isMergingMode, setIsMergingMode] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('wav-compressed')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const audioContextRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const handleFileSelect = useCallback(async (selectedFile: File, index?: number) => {
    const fileName = selectedFile.name.replace(/\.[^/.]+$/, '')
    const url = URL.createObjectURL(selectedFile)
    const audioContext = getAudioContext()
    const arrayBuffer = await selectedFile.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    if (index !== undefined) {
      setAudioFiles(prev => {
        const newFiles = [...prev]
        const oldFile = newFiles[index]
        if (oldFile && oldFile.audioUrl) {
          URL.revokeObjectURL(oldFile.audioUrl)
        }
        newFiles[index] = {
          id: Date.now().toString(),
          file: selectedFile,
          fileName,
          audioUrl: url,
          duration: audioBuffer.duration,
          currentTime: 0,
          isPlaying: false,
          startTrim: 0,
          endTrim: audioBuffer.duration,
          isLoaded: false,
          buffer: audioBuffer,
        }
        return newFiles
      })
    } else {
      const newAudioFile: AudioFile = {
        id: Date.now().toString(),
        file: selectedFile,
        fileName,
        audioUrl: url,
        duration: audioBuffer.duration,
        currentTime: 0,
        isPlaying: false,
        startTrim: 0,
        endTrim: audioBuffer.duration,
        isLoaded: false,
        buffer: audioBuffer,
      }
      setAudioFiles(prev => [...prev, newAudioFile])
    }
  }, [getAudioContext])

  const handleAddAnotherFile = useCallback(() => {
    setIsMergingMode(true)
    setReplaceIndex(undefined)
  }, [])

  const [replaceIndex, setReplaceIndex] = useState<number | undefined>(undefined)

  const handleReplaceFile = useCallback((index: number) => () => {
    setIsMergingMode(true)
    setReplaceIndex(index)
  }, [])

  const handleAudioReady = useCallback((index: number) => (duration: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = {
        ...newFiles[index],
        duration,
        endTrim: duration,
        isLoaded: true,
      }
      return newFiles
    })
  }, [])

  const handleTimeUpdate = useCallback((index: number) => (time: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      const file = newFiles[index]
      
      if (file.isPlaying && time >= file.endTrim) {
        newFiles[index] = {
          ...file,
          currentTime: time,
          isPlaying: false,
        }
      } else {
        newFiles[index] = {
          ...file,
          currentTime: time,
        }
      }
      return newFiles
    })
  }, [])

  const handleRegionUpdate = useCallback((index: number) => (start: number, end: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = {
        ...newFiles[index],
        startTrim: start,
        endTrim: end,
      }
      return newFiles
    })
  }, [])

  const handlePlayPause = useCallback((index: number) => () => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      const file = newFiles[index]
      
      if (!file.isPlaying) {
        if (file.currentTime >= file.endTrim || file.currentTime < file.startTrim) {
          newFiles[index] = {
            ...file,
            currentTime: file.startTrim,
            isPlaying: true,
          }
        } else {
          newFiles[index] = {
            ...file,
            isPlaying: true,
          }
        }
      } else {
        newFiles[index] = {
          ...file,
          isPlaying: false,
        }
      }
      
      newFiles.forEach((f, i) => {
        if (i !== index) {
          newFiles[i] = { ...f, isPlaying: false }
        }
      })
      
      return newFiles
    })
  }, [])

  const handleSeekAndPlay = useCallback((index: number) => (time: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = {
        ...newFiles[index],
        currentTime: time,
        isPlaying: true,
      }
      
      newFiles.forEach((f, i) => {
        if (i !== index) {
          newFiles[i] = { ...f, isPlaying: false }
        }
      })
      
      return newFiles
    })
  }, [])

  const handleStartChange = useCallback((index: number) => (time: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = {
        ...newFiles[index],
        startTrim: time,
      }
      return newFiles
    })
  }, [])

  const handleEndChange = useCallback((index: number) => (time: number) => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = {
        ...newFiles[index],
        endTrim: time,
      }
      return newFiles
    })
  }, [])

  const handleRemoveFile = useCallback((index: number) => () => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      const removedFile = newFiles[index]
      if (removedFile.audioUrl) {
        URL.revokeObjectURL(removedFile.audioUrl)
      }
      return newFiles.filter((_, i) => i !== index)
    })
  }, [])

  const handleExportSingle = useCallback((index: number) => async () => {
    const file = audioFiles[index]
    if (file.buffer && file.endTrim > file.startTrim) {
      await exportAudio(file.buffer, file.startTrim, file.endTrim, file.fileName, {
        format: exportFormat,
        quality,
      })
    }
  }, [audioFiles, exportFormat, quality])

  const handleExportMerged = useCallback(async () => {
    const segments: AudioSegment[] = audioFiles
      .filter(f => f.buffer && f.endTrim > f.startTrim)
      .map(f => ({
        buffer: f.buffer!,
        start: f.startTrim,
        end: f.endTrim,
        fileName: f.fileName,
      }))

    if (segments.length >= 2) {
      const outputName = segments.map(s => s.fileName).join('_')
      await exportMergedAudio(segments, outputName, {
        format: exportFormat,
        quality,
      })
    }
  }, [audioFiles, exportFormat, quality])

  const canExportSingle = (file: AudioFile) => file.buffer && file.endTrim > file.startTrim && file.isLoaded
  const canExportMerged = audioFiles.filter(f => canExportSingle(f)).length >= 2

  const colors = [
    { wave: '#4F46E5', progress: '#818CF8', region: 'rgba(99, 102, 241, 0.3)' },
    { wave: '#10B981', progress: '#34D399', region: 'rgba(16, 185, 129, 0.3)' },
    { wave: '#F59E0B', progress: '#FBBF24', region: 'rgba(245, 158, 11, 0.3)' },
    { wave: '#EF4444', progress: '#F87171', region: 'rgba(239, 68, 68, 0.3)' },
    { wave: '#8B5CF6', progress: '#A78BFA', region: 'rgba(139, 92, 246, 0.3)' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {audioFiles.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <AudioUploader onFileSelect={handleFileSelect} />
            
            <div className="mt-8 bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">1.</span>
                  <span>拖拽或点击上传音频文件（支持 MP3、WAV、OGG、M4A 等格式）</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">2.</span>
                  <span>在波形图上拖动选择裁剪区域</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">3.</span>
                  <span>调整开始和结束时间精确设置裁剪范围</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">4.</span>
                  <span>点击导出按钮下载裁剪后的音频!</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">5.</span>
                  <span>点击"融合"按钮添加更多音频文件进行拼接!</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-800">
                已上传 {audioFiles.length} 个音频文件
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleAddAnotherFile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>+</span>
                  <span>添加音频文件</span>
                </button>
                {audioFiles.length >= 2 && (
                  <button
                    onClick={handleExportMerged}
                    disabled={!canExportMerged}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span>🎵</span>
                    <span>导出拼接音频</span>
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">导出设置</h3>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">格式:</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="wav-compressed">WAV (压缩)</option>
                    <option value="wav">WAV (无损)</option>
                  </select>
                </div>
                {exportFormat === 'wav-compressed' && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">质量:</label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value as 'low' | 'medium' | 'high')}
                      className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="low">低质量 (11kHz/8位，最小文件)</option>
                      <option value="medium">中等质量 (22kHz/16位，推荐)</option>
                      <option value="high">高质量 (44kHz/16位，较大文件)</option>
                    </select>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {exportFormat === 'wav-compressed' 
                    ? `压缩模式通过降低采样率减小文件大小，质量越低文件越小`
                    : `无损模式保留原始音质，文件较大`}
                </div>
              </div>
            </div>

            {audioFiles.map((file, index) => (
              <div key={file.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4" style={{ borderLeftColor: colors[index % colors.length].wave }}>
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${colors[index % colors.length].wave}20` }}
                      >
                        <span className="text-2xl">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">文件 {index + 1}: {file.fileName}</p>
                        <p className="text-sm text-gray-500">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {audioFiles.length > 1 && (
                        <button
                          onClick={handleRemoveFile(index)}
                          className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                        >
                          删除
                        </button>
                      )}
                      <button
                          onClick={handleReplaceFile(index)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                        更换
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="bg-gray-900 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">波形图</span>
                      <span 
                        className="text-sm px-2 py-1 rounded"
                        style={{ backgroundColor: `${colors[index % colors.length].wave}30`, color: colors[index % colors.length].wave }}
                      >
                        文件 {index + 1}
                      </span>
                    </div>
                    <Waveform
                      audioUrl={file.audioUrl}
                      onReady={handleAudioReady(index)}
                      onTimeUpdate={handleTimeUpdate(index)}
                      onRegionUpdate={handleRegionUpdate(index)}
                      onSeekAndPlay={handleSeekAndPlay(index)}
                      startTrim={file.startTrim}
                      endTrim={file.endTrim}
                      isPlaying={file.isPlaying}
                      currentTime={file.currentTime}
                      waveColor={colors[index % colors.length].wave}
                      progressColor={colors[index % colors.length].progress}
                      regionColor={colors[index % colors.length].region}
                    />
                  </div>

                  <PlaybackControls
                    isPlaying={file.isPlaying}
                    currentTime={file.currentTime}
                    duration={file.duration}
                    onPlayPause={handlePlayPause(index)}
                    onSeekAndPlay={handleSeekAndPlay(index)}
                  />

                  <TrimControls
                    startTrim={file.startTrim}
                    endTrim={file.endTrim}
                    duration={file.duration}
                    onStartChange={handleStartChange(index)}
                    onEndChange={handleEndChange(index)}
                  />

                  <ExportButton 
                    onExport={handleExportSingle(index)} 
                    disabled={!canExportSingle(file)} 
                    label="导出当前文件"
                  />
                </div>
              </div>
            ))}

            {audioFiles.length >= 2 && (
              <Timeline audioFiles={audioFiles} colors={colors} />
            )}
          </div>
        )}

        {isMergingMode && audioFiles.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {replaceIndex !== undefined 
                ? `替换文件 ${replaceIndex + 1}` 
                : '添加另一个音频文件进行拼接'}
            </h3>
            <AudioUploader 
              onFileSelect={(file) => {
                handleFileSelect(file, replaceIndex)
                setIsMergingMode(false)
                setReplaceIndex(undefined)
              }} 
            />
            <button
              onClick={() => {
                setIsMergingMode(false)
                setReplaceIndex(undefined)
              }}
              className="mt-4 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-gray-400 py-6 px-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p>音频剪辑工具 - 所有处理均在浏览器中完成，数据不上传服务器</p>
        </div>
      </footer>
    </div>
  )
}

export default App
