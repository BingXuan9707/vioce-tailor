export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export function parseTime(timeStr: string): number {
  const trimmed = timeStr.trim()
  
  if (!trimmed) return 0
  
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    if (parts.length === 2) {
      const [mins, secMs] = parts
      const [secs, ms] = secMs.split('.')
      let minsNum = parseFloat(mins) || 0
      let secsNum = parseFloat(secs) || 0
      let msNum = parseFloat(ms || '0') || 0
      
      if (msNum >= 100) {
        secsNum += Math.floor(msNum / 100)
        msNum = msNum % 100
      }
      
      if (secsNum >= 60) {
        minsNum += Math.floor(secsNum / 60)
        secsNum = secsNum % 60
      }
      
      return minsNum * 60 + secsNum + (msNum / 100)
    }
  } else if (trimmed.includes('.')) {
    const [secs, ms] = trimmed.split('.')
    let secsNum = parseFloat(secs) || 0
    let msNum = parseFloat(ms) || 0
    
    if (msNum >= 100) {
      secsNum += Math.floor(msNum / 100)
      msNum = msNum % 100
    }
    
    return secsNum + (msNum / 100)
  }
  
  const num = parseFloat(trimmed)
  return num >= 0 ? num : 0
}

export interface AudioSegment {
  buffer: AudioBuffer
  start: number
  end: number
  fileName: string
}

export type ExportFormat = 'wav' | 'wav-compressed'

export interface ExportOptions {
  format?: ExportFormat
  quality?: 'low' | 'medium' | 'high'
}

const qualitySettings = {
  low: { sampleRate: 11025, bitDepth: 8 },
  medium: { sampleRate: 22050, bitDepth: 16 },
  high: { sampleRate: 44100, bitDepth: 16 },
}

export async function exportAudio(
  audioBuffer: AudioBuffer,
  start: number,
  end: number,
  fileName: string,
  options: ExportOptions = {}
): Promise<void> {
  const { format = 'wav-compressed', quality = 'medium' } = options
  
  const startSample = Math.floor(start * audioBuffer.sampleRate)
  const endSample = Math.floor(end * audioBuffer.sampleRate)
  const duration = endSample - startSample
  
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    duration,
    audioBuffer.sampleRate
  )
  
  const newBuffer = offlineContext.createBuffer(
    audioBuffer.numberOfChannels,
    duration,
    audioBuffer.sampleRate
  )
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel)
    const newChannelData = newBuffer.getChannelData(channel)
    for (let i = 0; i < duration; i++) {
      newChannelData[i] = channelData[startSample + i]
    }
  }
  
  const source = offlineContext.createBufferSource()
  source.buffer = newBuffer
  source.connect(offlineContext.destination)
  source.start(0)
  
  const renderedBuffer = await offlineContext.startRendering()
  
  if (format === 'wav-compressed') {
    const compressedBuffer = compressAudioBuffer(renderedBuffer, quality)
    const wavData = audioBufferToWav(compressedBuffer, qualitySettings[quality].bitDepth)
    downloadBlob(wavData, `${fileName}_trimmed_compressed.wav`)
  } else {
    const wavData = audioBufferToWav(renderedBuffer, 16)
    downloadBlob(wavData, `${fileName}_trimmed.wav`)
  }
}

function compressAudioBuffer(buffer: AudioBuffer, quality: 'low' | 'medium' | 'high'): AudioBuffer {
  const settings = qualitySettings[quality]
  const targetSampleRate = settings.sampleRate
  
  if (buffer.sampleRate === targetSampleRate) {
    return buffer
  }
  
  const sampleRateRatio = buffer.sampleRate / targetSampleRate
  const newLength = Math.ceil(buffer.length / sampleRateRatio)
  const newBuffer = new AudioBuffer({
    length: newLength,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: targetSampleRate,
  })
  
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    const newChannelData = newBuffer.getChannelData(channel)
    
    for (let i = 0; i < newLength; i++) {
      const originalIndex = Math.floor(i * sampleRateRatio)
      const nextIndex = Math.min(originalIndex + 1, channelData.length - 1)
      const t = (i * sampleRateRatio) - originalIndex
      
      newChannelData[i] = channelData[originalIndex] * (1 - t) + channelData[nextIndex] * t
    }
  }
  
  return newBuffer
}

function audioBufferToWav(buffer: AudioBuffer, bitDepth: number): Blob {
  const numberOfChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const bytesPerSample = bitDepth / 8
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = buffer.length * blockAlign
  
  const bufferArray = new ArrayBuffer(44 + dataSize)
  const view = new DataView(bufferArray)
  
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)
  
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
      
      if (bitDepth === 8) {
        const intSample = Math.floor((sample + 1) * 128)
        view.setUint8(offset, intSample)
        offset += 1
      } else {
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        view.setInt16(offset, intSample, true)
        offset += 2
      }
    }
  }
  
  return new Blob([bufferArray], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportMergedAudio(
  segments: AudioSegment[],
  outputFileName: string,
  options: ExportOptions = {}
): Promise<void> {
  if (segments.length === 0) {
    return
  }

  const { format = 'wav-compressed', quality = 'medium' } = options

  const sampleRate = segments[0].buffer.sampleRate
  const numberOfChannels = segments[0].buffer.numberOfChannels

  let totalDuration = 0
  const audioBuffers: AudioBuffer[] = []

  for (const segment of segments) {
    const startSample = Math.floor(segment.start * segment.buffer.sampleRate)
    const endSample = Math.floor(segment.end * segment.buffer.sampleRate)
    const duration = endSample - startSample

    const offlineContext = new OfflineAudioContext(
      segment.buffer.numberOfChannels,
      duration,
      segment.buffer.sampleRate
    )

    const trimmedBuffer = offlineContext.createBuffer(
      segment.buffer.numberOfChannels,
      duration,
      segment.buffer.sampleRate
    )

    for (let channel = 0; channel < segment.buffer.numberOfChannels; channel++) {
      const channelData = segment.buffer.getChannelData(channel)
      const newChannelData = trimmedBuffer.getChannelData(channel)
      for (let i = 0; i < duration; i++) {
        newChannelData[i] = channelData[startSample + i]
      }
    }

    audioBuffers.push(trimmedBuffer)
    totalDuration += duration / segment.buffer.sampleRate
  }

  const totalSamples = Math.floor(totalDuration * sampleRate)
  const mergedContext = new OfflineAudioContext(numberOfChannels, totalSamples, sampleRate)
  const mergedBuffer = mergedContext.createBuffer(numberOfChannels, totalSamples, sampleRate)

  let currentOffset = 0
  for (const buffer of audioBuffers) {
    const bufferSamples = buffer.length

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = mergedBuffer.getChannelData(channel)
      const sourceChannelData = buffer.getChannelData(channel)

      for (let i = 0; i < bufferSamples; i++) {
        if (currentOffset + i < totalSamples) {
          channelData[currentOffset + i] = sourceChannelData[i]
        }
      }
    }

    currentOffset += bufferSamples
  }

  if (format === 'wav-compressed') {
    const compressedBuffer = compressAudioBuffer(mergedBuffer, quality)
    const wavData = audioBufferToWav(compressedBuffer, qualitySettings[quality].bitDepth)
    downloadBlob(wavData, `${outputFileName}_merged_compressed.wav`)
  } else {
    const wavData = audioBufferToWav(mergedBuffer, 16)
    downloadBlob(wavData, `${outputFileName}_merged.wav`)
  }
}
