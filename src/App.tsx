import { useState, useCallback, useRef } from 'react'
import { Header } from './components/Header'
import { AudioUploader } from './components/AudioUploader'
import { Waveform } from './components/Waveform'
import { PlaybackControls } from './components/PlaybackControls'
import { TrimControls } from './components/TrimControls'
import { ExportButton } from './components/ExportButton'
import { exportAudio } from './utils/audioUtils'

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [startTrim, setStartTrim] = useState(0)
  const [endTrim, setEndTrim] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  
  const audioBufferRef = useRef<AudioBuffer | null>(null)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile)
    setFileName(selectedFile.name.replace(/\.[^/.]+$/, ''))
    
    const url = URL.createObjectURL(selectedFile)
    setAudioUrl(url)
    setIsLoaded(false)
    
    const audioContext = new AudioContext()
    const arrayBuffer = await selectedFile.arrayBuffer()
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    audioBufferRef.current = audioBuffer
    
    setDuration(audioBuffer.duration)
    setEndTrim(audioBuffer.duration)
    setStartTrim(0)
    setCurrentTime(0)
  }, [])

  const handleAudioReady = useCallback((audioDuration: number) => {
    setDuration(audioDuration)
    setEndTrim(audioDuration)
    setIsLoaded(true)
  }, [])

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    if (isPlaying && time >= endTrim) {
      setIsPlaying(false)
      setCurrentTime(startTrim)
    }
  }, [isPlaying, endTrim, startTrim])

  const handleRegionUpdate = useCallback((start: number, end: number) => {
    setStartTrim(start)
    setEndTrim(end)
  }, [])

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      if (currentTime >= endTrim || currentTime < startTrim) {
        setCurrentTime(startTrim)
      }
    }
    setIsPlaying(!isPlaying)
  }, [currentTime, endTrim, startTrim])

  const handleSeekAndPlay = useCallback((time: number) => {
    setCurrentTime(time)
    setIsPlaying(true)
  }, [])

  const handleExport = useCallback(async () => {
    if (audioBufferRef.current && file) {
      await exportAudio(audioBufferRef.current, startTrim, endTrim, fileName)
    }
  }, [startTrim, endTrim, fileName, file])

  const handleStartChange = useCallback((time: number) => {
    setStartTrim(time)
  }, [])

  const handleEndChange = useCallback((time: number) => {
    setEndTrim(time)
  }, [])

  const canExport = file && endTrim > startTrim && isLoaded

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!file ? (
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
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null)
                    setAudioUrl('')
                    setIsLoaded(false)
                    audioBufferRef.current = null
                  }}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  更换文件
                </button>
              </div>
            </div>

            <Waveform
              audioUrl={audioUrl}
              onReady={handleAudioReady}
              onTimeUpdate={handleTimeUpdate}
              onRegionUpdate={handleRegionUpdate}
              onSeekAndPlay={handleSeekAndPlay}
              startTrim={startTrim}
              endTrim={endTrim}
              isPlaying={isPlaying}
              currentTime={currentTime}
            />

            <PlaybackControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={handlePlayPause}
              onSeekAndPlay={handleSeekAndPlay}
            />

            <TrimControls
              startTrim={startTrim}
              endTrim={endTrim}
              duration={duration}
              onStartChange={handleStartChange}
              onEndChange={handleEndChange}
            />

            <ExportButton onExport={handleExport} disabled={!canExport} />
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
