import { formatTime } from '../utils/audioUtils'

interface PlaybackControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeekAndPlay: (time: number) => void
}

export function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeekAndPlay,
}: PlaybackControlsProps) {
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    onSeekAndPlay(time)
  }

  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
      <button
        onClick={onPlayPause}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors shadow-lg"
      >
        {isPlaying ? (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 ml-6">
        <div className="flex items-center gap-3">
          <span className="text-white font-mono text-sm min-w-[80px]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration.toString()}
            step="0.1"
            value={currentTime}
            onChange={handleProgressChange}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-white font-mono text-sm min-w-[80px] text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
