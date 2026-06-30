import { useMemo, useState, useCallback, useRef } from 'react'

interface Clip {
  id: string
  fileId: string
  fileName: string
  sourceStart: number
  sourceEnd: number
  position: number
}

interface TimelineProps {
  clips: Clip[]
  colors: {
    wave: string
    progress: string
    region: string
  }[]
  onClipsChange: (clips: Clip[]) => void
}

export function Timeline({ clips, colors, onClipsChange }: TimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'start' | 'end' | 'move' | null>(null)
  const [dragClipId, setDragClipId] = useState<string | null>(null)
  const [history, setHistory] = useState<Clip[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const timelineRef = useRef<HTMLDivElement>(null)

  const totalDuration = useMemo(() => {
    if (clips.length === 0) return 0
    const lastClip = clips[clips.length - 1]
    return lastClip.position + (lastClip.sourceEnd - lastClip.sourceStart)
  }, [clips])

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  const timeMarkers = useMemo(() => {
    const markers: number[] = []
    if (totalDuration === 0) return markers
    const step = Math.max(1, Math.floor(totalDuration / 20))
    for (let i = 0; i <= totalDuration; i += step) {
      markers.push(i)
    }
    return markers
  }, [totalDuration])

  const getTimelinePosition = (time: number) => {
    if (totalDuration === 0) return 0
    return (time / totalDuration) * 100
  }

  const getTimeFromPosition = (positionPercent: number) => {
    return (positionPercent / 100) * totalDuration
  }

  const saveToHistory = useCallback((newClips: Clip[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newClips)))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      setHistoryIndex(prevIndex)
      onClipsChange(JSON.parse(JSON.stringify(history[prevIndex])))
    }
  }, [historyIndex, history, onClipsChange])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setHistoryIndex(nextIndex)
      onClipsChange(JSON.parse(JSON.stringify(history[nextIndex])))
    }
  }, [historyIndex, history, onClipsChange])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'move', clipId: string) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragType(type)
    setDragClipId(clipId)
    
    if (type !== 'move') {
      setSelectedId(clipId)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const positionPercent = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const time = getTimeFromPosition(positionPercent)

    if (dragType === 'move') {
      setCurrentTime(Math.max(0, Math.min(time, totalDuration)))
      return
    }

    if (dragClipId === null) return

    const clipIndex = clips.findIndex(c => c.id === dragClipId)
    if (clipIndex === -1) return

    const clip = clips[clipIndex]
    const clipDuration = clip.sourceEnd - clip.sourceStart
    const clipEndPosition = clip.position + clipDuration

    if (dragType === 'start') {
      const newPosition = Math.max(0, Math.min(time, clipEndPosition - 0.1))
      
      const newClips = [...clips]
      const timeDiff = newPosition - clip.position
      newClips[clipIndex] = {
        ...clip,
        position: newPosition,
        sourceStart: Math.max(0, clip.sourceStart - timeDiff),
        sourceEnd: clip.sourceEnd,
      }
      
      onClipsChange(newClips)
    } else if (dragType === 'end') {
      const newClipEndPosition = Math.max(clip.position + 0.1, Math.min(time, totalDuration))
      const newClipDuration = newClipEndPosition - clip.position
      
      const newClips = [...clips]
      newClips[clipIndex] = {
        ...clip,
        sourceEnd: clip.sourceStart + newClipDuration,
      }

      onClipsChange(newClips)
    }
  }, [isDragging, dragType, dragClipId, clips, onClipsChange, totalDuration])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragType(null)
    setDragClipId(null)
  }, [])

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const positionPercent = (x / rect.width) * 100
    const time = getTimeFromPosition(positionPercent)
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)))
    
    const clickedClip = clips.find(clip => {
      const clipEndPosition = clip.position + (clip.sourceEnd - clip.sourceStart)
      return time >= clip.position && time <= clipEndPosition
    })
    
    setSelectedId(clickedClip?.id || null)
  }, [clips, totalDuration])

  const handleSplit = useCallback(() => {
    if (!selectedId) return

    const clipIndex = clips.findIndex(c => c.id === selectedId)
    if (clipIndex === -1) return

    const clip = clips[clipIndex]
    const clipEndPosition = clip.position + (clip.sourceEnd - clip.sourceStart)
    
    if (currentTime <= clip.position || currentTime >= clipEndPosition) return

    saveToHistory(clips)

    const splitPositionInClip = currentTime - clip.position
    
    const newClip1 = {
      ...clip,
      sourceEnd: clip.sourceStart + splitPositionInClip,
    }
    
    const newClip2 = {
      ...clip,
      id: Date.now().toString(),
      sourceStart: clip.sourceStart + splitPositionInClip,
      position: currentTime,
    }

    const newClips = [...clips]
    newClips.splice(clipIndex, 1, newClip1, newClip2)
    onClipsChange(newClips)
    setSelectedId(newClip2.id)
  }, [selectedId, clips, currentTime, onClipsChange, saveToHistory])

  const handleDelete = useCallback(() => {
    if (!selectedId) return

    saveToHistory(clips)
    
    const deletedClip = clips.find(c => c.id === selectedId)
    if (!deletedClip) return
    
    const gapDuration = deletedClip.sourceEnd - deletedClip.sourceStart
    const deletedIndex = clips.findIndex(c => c.id === selectedId)
    
    const remainingClips = clips.filter(c => c.id !== selectedId)
    
    const adjustedClips = remainingClips.map((c, index) => {
      if (index >= deletedIndex) {
        return {
          ...c,
          position: c.position - gapDuration,
        }
      }
      return c
    })

    onClipsChange(adjustedClips)
    setSelectedId(null)
  }, [selectedId, clips, onClipsChange, saveToHistory])

  const handlePlayPause = useCallback(() => {
    console.log('Play/Pause at', currentTime)
  }, [currentTime])

  const handleReset = useCallback(() => {
    setCurrentTime(0)
    setSelectedId(null)
  }, [])

  return (
    <div className="bg-gray-900 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">🎬 时间轴</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            ↩ 撤销
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg transition-colors"
          >
            ↪ 重做
          </button>
          {selectedId !== null && (
            <>
              <button
                onClick={handleSplit}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                ✂ 分割
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                🗑 删除
              </button>
            </>
          )}
          <span className="text-gray-400 text-sm">
            总时长: {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative cursor-crosshair"
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex overflow-x-auto pb-2">
          <div 
            className="flex-shrink-0 relative" 
            style={{ width: `${getTimelinePosition(totalDuration) + 100}%`, minWidth: '100%' }}
          >
            <div className="flex border-b border-gray-700 pb-1 mb-2">
              {timeMarkers.map((time, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-center"
                  style={{ width: '60px' }}
                >
                  <span className="text-gray-500 text-xs">{formatTime(time)}</span>
                  <div className="w-px h-3 bg-gray-700 mt-1" />
                </div>
              ))}
            </div>

            <div className="flex items-end gap-0 h-24 relative">
              {clips.map((clip) => {
                const clipDuration = clip.sourceEnd - clip.sourceStart
                const clipWidth = getTimelinePosition(clipDuration)
                const clipLeft = getTimelinePosition(clip.position)
                
                const isSelected = selectedId === clip.id
                const colorIndex = clips.findIndex(c => c.fileId === clip.fileId)
                const color = colors[colorIndex % colors.length].wave

                return (
                  <div
                    key={clip.id}
                    className={`relative flex-shrink-0 rounded overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{
                      width: `${clipWidth}%`,
                      left: `${clipLeft}%`,
                      backgroundColor: `${color}40`,
                      borderLeft: `3px solid ${color}`,
                      height: '80%',
                      marginLeft: '-0.5px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedId(clip.id)
                    }}
                  >
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 3px,
                          ${color}50 3px,
                          ${color}50 6px
                        )`,
                      }}
                    />

                    <div className="absolute top-1 left-1 right-1">
                      <span 
                        className="text-xs font-medium px-2 py-0.5 rounded truncate block"
                        style={{ backgroundColor: color, color: 'white' }}
                      >
                        {clip.fileName}
                      </span>
                    </div>

                    <div className="absolute bottom-1 left-2 text-gray-300 text-xs">
                      {formatTime(clip.position)} - {formatTime(clip.position + clipDuration)}
                    </div>

                    <div
                      className="absolute top-0 left-0 w-3 h-full bg-white/70 cursor-ew-resize hover:bg-white transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleMouseDown(e, 'start', clip.id)}
                    >
                      <div className="w-0.5 h-6 bg-gray-600" />
                    </div>

                    <div
                      className="absolute top-0 right-0 w-3 h-full bg-white/70 cursor-ew-resize hover:bg-white transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleMouseDown(e, 'end', clip.id)}
                    >
                      <div className="w-0.5 h-6 bg-gray-600" />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex mt-2">
              <div className="flex-shrink-0 w-16 text-gray-500 text-xs">轨道</div>
              <div className="flex-1 flex">
                {clips.map((clip) => {
                  const isSelected = selectedId === clip.id
                  const colorIndex = clips.findIndex(c => c.fileId === clip.fileId)
                  const color = colors[colorIndex % colors.length].wave
                  const clipDuration = clip.sourceEnd - clip.sourceStart
                  
                  return (
                    <div
                      key={clip.id}
                      className={`flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded ${
                        isSelected ? 'bg-gray-700' : ''
                      }`}
                      style={{ width: `${clipDuration / totalDuration * 100}%` }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-300 text-xs truncate">{clip.fileName}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg shadow-red-500/50 z-10"
          style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          onMouseDown={(e) => {
            e.stopPropagation()
            setIsDragging(true)
            setDragType('move')
          }}
        >
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-red-500" />
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-red-500" />
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleReset}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button 
            onClick={handlePlayPause}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <span className="text-gray-500 text-sm">缩放: 100%</span>
        </div>

        <div className="text-gray-400 text-sm">
          当前时间: {formatTime(currentTime)}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        💡 提示: 点击时间轴定位播放头，拖动片段边缘调整范围，选中后可分割或删除
      </div>
    </div>
  )
}
