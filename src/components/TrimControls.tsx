import { useState, useEffect } from 'react'
import { formatTime, parseTime } from '../utils/audioUtils'

interface TrimControlsProps {
  startTrim: number
  endTrim: number
  duration: number
  onStartChange: (time: number) => void
  onEndChange: (time: number) => void
}

export function TrimControls({
  startTrim,
  endTrim,
  duration,
  onStartChange,
  onEndChange,
}: TrimControlsProps) {
  const [startInput, setStartInput] = useState(formatTime(startTrim))
  const [endInput, setEndInput] = useState(formatTime(endTrim))
  const [hasManualInput, setHasManualInput] = useState(false)

  useEffect(() => {
    if (!hasManualInput) {
      setEndInput(formatTime(endTrim))
    }
  }, [endTrim, hasManualInput])

  useEffect(() => {
    setStartInput(formatTime(startTrim))
  }, [startTrim])

  const handleStartBlur = () => {
    const value = parseTime(startInput)
    if (value >= 0) {
      const clampedValue = Math.min(Math.max(value, 0), duration)
      onStartChange(clampedValue)
      setStartInput(formatTime(clampedValue))
    } else {
      setStartInput(formatTime(startTrim))
    }
  }

  const handleEndBlur = () => {
    const value = parseTime(endInput)
    if (value >= 0) {
      const clampedValue = Math.min(Math.max(value, 0), duration)
      onEndChange(clampedValue)
      setEndInput(formatTime(clampedValue))
      setHasManualInput(true)
    } else {
      setEndInput(formatTime(endTrim))
    }
  }

  const handleStartKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleStartBlur()
    }
  }

  const handleEndKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEndBlur()
    }
  }

  const handleResetEnd = () => {
    onEndChange(duration)
    setEndInput(formatTime(duration))
    setHasManualInput(false)
  }

  const trimDuration = endTrim - startTrim

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">裁剪设置</h3>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">开始时间</label>
          <input
            type="text"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={handleStartBlur}
            onKeyDown={handleStartKeyDown}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            placeholder="00:00.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">结束时间</label>
          <input
            type="text"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={handleEndBlur}
            onKeyDown={handleEndKeyDown}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            placeholder="00:00.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">裁剪长度</label>
          <div className="w-full px-4 py-2 bg-gray-100 rounded-lg font-mono text-gray-800">
            {formatTime(trimDuration)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            onStartChange(0)
            setStartInput(formatTime(0))
          }}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          重置开始
        </button>
        <button
          onClick={handleResetEnd}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          重置结束
        </button>
      </div>
    </div>
  )
}
