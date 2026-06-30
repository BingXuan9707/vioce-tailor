import { useEffect, useRef, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'

interface WaveformProps {
  audioUrl: string
  onReady: (duration: number) => void
  onTimeUpdate: (time: number) => void
  onRegionUpdate: (start: number, end: number) => void
  onSeekAndPlay: (time: number) => void
  startTrim: number
  endTrim: number
  isPlaying: boolean
  currentTime: number
  waveColor?: string
  progressColor?: string
  regionColor?: string
}

export function Waveform({
  audioUrl,
  onReady,
  onTimeUpdate,
  onRegionUpdate,
  onSeekAndPlay,
  startTrim,
  endTrim,
  isPlaying,
  currentTime,
  waveColor = '#4F46E5',
  progressColor = '#818CF8',
  regionColor = 'rgba(99, 102, 241, 0.3)',
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const regionRef = useRef<any>(null)
  const initializedRef = useRef(false)

  const handleReady = useCallback((duration: number) => {
    onReady(duration)
  }, [onReady])

  const handleTimeUpdate = useCallback((time: number) => {
    onTimeUpdate(time)
  }, [onTimeUpdate])

  const handleRegionUpdate = useCallback((start: number, end: number) => {
    onRegionUpdate(start, end)
  }, [onRegionUpdate])

  const handleSeekAndPlay = useCallback((time: number) => {
    onSeekAndPlay(time)
  }, [onSeekAndPlay])

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return

    initializedRef.current = true

    const regionsPlugin = RegionsPlugin.create()

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor: '#EF4444',
      barWidth: 2,
      barGap: 1,
      cursorWidth: 2,
      height: 128,
      barRadius: 2,
      normalize: true,
      plugins: [regionsPlugin],
    })

    wavesurfer.load(audioUrl)

    wavesurfer.on('ready', () => {
      handleReady(wavesurfer.getDuration())
      
      try {
        regionRef.current = regionsPlugin.addRegion({
          start: startTrim,
          end: endTrim,
          color: regionColor,
          drag: true,
          resize: true,
        })

        regionRef.current.on('update-end', () => {
          if (regionRef.current) {
            handleRegionUpdate(regionRef.current.start, regionRef.current.end)
          }
        })
      } catch (error) {
        console.error('Failed to add region:', error)
      }
    })

    wavesurfer.on('audioprocess', () => {
      handleTimeUpdate(wavesurfer.getCurrentTime())
    })

    wavesurfer.on('seeking', (time) => {
      handleTimeUpdate(time)
    })

    wavesurfer.on('interaction', (time) => {
      handleTimeUpdate(time)
    })

    wavesurfer.on('click', () => {
      const currentPos = wavesurfer.getCurrentTime()
      handleSeekAndPlay(currentPos)
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
      initializedRef.current = false
    }
  }, [audioUrl])

  useEffect(() => {
    if (wavesurferRef.current) {
      const duration = wavesurferRef.current.getDuration()
      if (duration > 0 && !isNaN(currentTime) && currentTime >= 0 && currentTime <= duration) {
        const wavesurferTime = wavesurferRef.current.getCurrentTime()
        if (Math.abs(wavesurferTime - currentTime) > 0.1) {
          wavesurferRef.current.seekTo(currentTime / duration)
        }
      }
    }
  }, [currentTime])

  useEffect(() => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        const duration = wavesurferRef.current.getDuration()
        if (duration > 0 && !isNaN(currentTime) && currentTime >= 0 && currentTime <= duration) {
          const wavesurferTime = wavesurferRef.current.getCurrentTime()
          if (Math.abs(wavesurferTime - currentTime) > 0.1) {
            wavesurferRef.current.pause()
            wavesurferRef.current.seekTo(currentTime / duration)
          }
        }
        wavesurferRef.current.play()
      } else {
        wavesurferRef.current.pause()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (regionRef.current && regionRef.current.start !== startTrim) {
      regionRef.current.setOptions({ start: startTrim })
    }
  }, [startTrim])

  useEffect(() => {
    if (regionRef.current && regionRef.current.end !== endTrim) {
      regionRef.current.setOptions({ end: endTrim })
    }
  }, [endTrim])

  return (
    <div className="wavesurfer-container-wrapper">
      <div ref={containerRef} className="wavesurfer-container" />
    </div>
  )
}
