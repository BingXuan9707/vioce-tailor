import { useMemo } from 'react'

interface TimelineProps {
  audioFiles: {
    id: string
    fileName: string
    duration: number
    startTrim: number
    endTrim: number
  }[]
  colors: {
    wave: string
    progress: string
    region: string
  }[]
}

export function Timeline({ audioFiles, colors }: TimelineProps) {
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
    const step = Math.max(0.5, Math.floor(maxDuration / 20))
    for (let i = 0; i <= maxDuration; i += step) {
      markers.push(i)
    }
    return markers
  }, [maxDuration])

  const getTimelinePosition = (time: number, totalTime: number) => {
    if (totalTime === 0) return 0
    return (time / totalTime) * 100
  }

  const audioSegments = useMemo(() => {
    const segments: {
      id: string
      fileName: string
      start: number
      end: number
      color: string
      position: number
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
      })
      currentPosition += clipDuration
    })
    
    return segments
  }, [audioFiles, colors])

  return (
    <div className="bg-gray-900 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">🎬 时间轴</h3>
        <span className="text-gray-400 text-sm">
          总时长: {formatTime(totalDuration)}
        </span>
      </div>

      <div className="relative">
        <div className="flex overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          <div className="flex-shrink-0" style={{ width: `${getTimelinePosition(maxDuration, maxDuration) + 100}%` }}>
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

            <div className="flex items-end gap-1 h-24">
              {audioSegments.map((segment) => {
                const segmentWidth = getTimelinePosition(segment.end - segment.start, maxDuration) * (100 / getTimelinePosition(maxDuration, maxDuration))
                return (
                  <div
                    key={segment.id}
                    className="relative flex-shrink-0 rounded-lg overflow-hidden group"
                    style={{
                      width: `${segmentWidth}%`,
                      backgroundColor: `${segment.color}30`,
                      borderLeft: `3px solid ${segment.color}`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div 
                        className="w-full h-16 opacity-60"
                        style={{
                          backgroundImage: `repeating-linear-gradient(
                            90deg,
                            transparent,
                            transparent 2px,
                            ${segment.color}40 2px,
                            ${segment.color}40 4px
                          )`,
                        }}
                      />
                    </div>

                    <div className="absolute top-1 left-1 right-1">
                      <span 
                        className="text-xs font-medium px-2 py-0.5 rounded truncate block"
                        style={{ backgroundColor: segment.color, color: 'white' }}
                      >
                        {segment.fileName}
                      </span>
                    </div>

                    <div className="absolute bottom-1 left-2 text-gray-400 text-xs">
                      {formatTime(segment.position)} - {formatTime(segment.position + (segment.end - segment.start))}
                    </div>

                    <div className="absolute top-0 left-0 w-2 h-full bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize" />
                    <div className="absolute top-0 right-0 w-2 h-full bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize" />
                  </div>
                )
              })}
            </div>

            <div className="flex mt-2">
              <div className="flex-shrink-0 w-16 text-gray-500 text-xs">轨道</div>
              <div className="flex-1 flex">
                {audioFiles.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex-shrink-0 flex items-center gap-2"
                    style={{ width: `${(file.endTrim - file.startTrim) / maxDuration * 100}%` }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colors[index % colors.length].wave }}
                    />
                    <span className="text-gray-400 text-xs truncate">{file.fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none shadow-lg shadow-red-500/50" style={{ left: '0' }}>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-red-500" />
          </div>
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-red-500" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="w-px h-6 bg-gray-700" />
          <span className="text-gray-500 text-sm">缩放: 100%</span>
        </div>

        <div className="text-gray-500 text-sm">
          当前时间: {formatTime(0)}
        </div>
      </div>
    </div>
  )
}
