import { useMemo, useState, useCallback, useRef } from 'react'

interface AudioFileData {
  id: string
  fileName: string
  duration: number
  startTrim: number
  endTrim: number
}

interface TimelineProps {
  audioFiles: AudioFileData[]
  colors: {
    wave: string
    progress: string
    region: string
  }[]
  onTrimChange: (index: number, start: number, end: number) => void
  onRemoveFile: (index: number) => void
}

export function Timeline({ audioFiles, colors, onTrimChange, onRemoveFile }: TimelineProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragType, setDragType] = useState<'start' | 'end' | 'move' | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const totalDuration = useMemo(() => {
    return audioFiles.reduce((acc, f) => acc + (f.endTrim - f.startTrim), 0)
  }, [audioFiles])

  const maxDuration = useMemo(() => {
    return Math.max(totalDuration, ...audioFiles.map(f => f.duration))
  }, [audioFiles, totalDuration])

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
    const markers = []
    const step = Math.max(1, Math.floor(maxDuration / 20))
    for (let i = 0; i <= maxDuration; i += step) {
      markers.push(i)
    }
    return markers
  }, [maxDuration])

  const getTimelinePosition = (time: number) => {
    if (maxDuration === 0) return 0
    return (time / maxDuration) * 100
  }

  const getTimeFromPosition = (positionPercent: number) => {
    return (positionPercent / 100) * maxDuration
  }

  const audioSegments = useMemo(() => {
    const segments: {
      id: string
      fileName: string
      start: number
      end: number
      color: string
      position: number
      duration: number
      index: number
    }[] = []
    let currentPosition = 0
    audioFiles.forEach((file, index) => {
      const clipDuration = file.endTrim - file.startTrim
      segments.push({
        id: file.id,
        fileName: file.fileName,
        start: file.startTrim,
        end: file.endTrim,
        color: colors[index % colors.length].wave,
        position: currentPosition,
        duration: clipDuration,
        index,
      })
      currentPosition += clipDuration
    })
    return segments
  }, [audioFiles, colors])

  const handleMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'move', index: number) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragType(type)
    setDragIndex(index)
    
    if (type !== 'move') {
      setSelectedIndex(index)
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || dragIndex === null || !timelineRef.current) return

    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const positionPercent = (x / rect.width) * 100
    
    const time = getTimeFromPosition(positionPercent)

    if (dragType === 'start') {
      const endTrim = audioFiles[dragIndex].endTrim
      const newStart = Math.max(0, Math.min(time, endTrim - 0.1))
      onTrimChange(dragIndex, newStart, endTrim)
    } else if (dragType === 'end') {
      const startTrim = audioFiles[dragIndex].startTrim
      const fileDuration = audioFiles[dragIndex].duration
      const newEnd = Math.min(fileDuration, Math.max(time, startTrim + 0.1))
      onTrimChange(dragIndex, startTrim, newEnd)
    } else if (dragType === 'move') {
      setCurrentTime(Math.max(0, Math.min(time, totalDuration)))
    }
  }, [isDragging, dragType, dragIndex, audioFiles, onTrimChange, totalDuration, maxDuration])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragType(null)
    setDragIndex(null)
  }, [])

  const handleSegmentClick = useCallback((index: number) => {
    setSelectedIndex(index)
  }, [])

  const handleDelete = useCallback(() => {
    if (selectedIndex !== null && audioFiles.length > 1) {
      onRemoveFile(selectedIndex)
      setSelectedIndex(null)
    }
  }, [selectedIndex, audioFiles.length, onRemoveFile])

  const handlePlayPause = useCallback(() => {
    console.log('Play/Pause at', currentTime)
  }, [currentTime])

  const handleReset = useCallback(() => {
    setCurrentTime(0)
    setSelectedIndex(null)
  }, [])

  return (
    <div className="bg-gray-900 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">🎬 时间轴</h3>
        <div className="flex items-center gap-3">
          {selectedIndex !== null && (
            <button
              onClick={handleDelete}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              删除选中片段
            </button>
          )}
          <span className="text-gray-400 text-sm">
            总时长: {formatTime(totalDuration)}
          </span>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex overflow-x-auto pb-2">
          <div 
            className="flex-shrink-0 relative" 
            style={{ width: `${getTimelinePosition(maxDuration) + 100}%`, minWidth: '100%' }}
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

            <div className="flex items-end gap-1 h-20 relative">
              {audioSegments.map((segment) => {
                const segmentWidth = getTimelinePosition(segment.duration)
                const segmentLeft = getTimelinePosition(segment.position)
                
                const isSelected = selectedIndex === segment.index

                return (
                  <div
                    key={segment.id}
                    className={`relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{
                      width: `${segmentWidth}%`,
                      left: `${segmentLeft}%`,
                      backgroundColor: `${segment.color}40`,
                      borderLeft: `3px solid ${segment.color}`,
                      height: '80%',
                    }}
                    onClick={() => handleSegmentClick(segment.index)}
                  >
                    <div 
                      className="w-full h-full"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 3px,
                          ${segment.color}50 3px,
                          ${segment.color}50 6px
                        )`,
                      }}
                    />

                    <div className="absolute top-1 left-1 right-1">
                      <span 
                        className="text-xs font-medium px-2 py-0.5 rounded truncate block"
                        style={{ backgroundColor: segment.color, color: 'white' }}
                      >
                        {segment.fileName}
                      </span>
                    </div>

                    <div className="absolute bottom-1 left-2 text-gray-300 text-xs">
                      {formatTime(segment.position)} - {formatTime(segment.position + segment.duration)}
                    </div>

                    <div
                      className="absolute top-0 left-0 w-3 h-full bg-white/70 cursor-ew-resize hover:bg-white transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleMouseDown(e, 'start', segment.index)}
                    >
                      <div className="w-0.5 h-6 bg-gray-600" />
                    </div>

                    <div
                      className="absolute top-0 right-0 w-3 h-full bg-white/70 cursor-ew-resize hover:bg-white transition-colors flex items-center justify-center"
                      onMouseDown={(e) => handleMouseDown(e, 'end', segment.index)}
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
                {audioFiles.map((file, index) => {
                  const isSelected = selectedIndex === index
                  return (
                    <div
                      key={file.id}
                      className={`flex-shrink-0 flex items-center gap-2 px-2 py-1 rounded ${
                        isSelected ? 'bg-gray-700' : ''
                      }`}
                      style={{ width: `${(file.endTrim - file.startTrim) / maxDuration * 100}%` }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[index % colors.length].wave }}
                      />
                      <span className="text-gray-300 text-xs truncate">{file.fileName}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg shadow-red-500/50 z-10"
          style={{ left: `${(currentTime / maxDuration) * 100}%` }}
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
        💡 提示: 拖动片段边缘可调整裁剪范围，点击片段选中，按 Delete 或点击删除按钮移除
      </div>
    </div>
  )
}
