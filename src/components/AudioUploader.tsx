import { useCallback, useState } from 'react'

interface AudioUploaderProps {
  onFileSelect: (file: File) => void
}

export function AudioUploader({ onFileSelect }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type.startsWith('audio/')) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files[0])
    }
  }, [onFileSelect])

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
        id="audio-upload"
      />
      <label htmlFor="audio-upload" className="cursor-pointer block">
        <div className="text-5xl mb-4">🎵</div>
        <p className="text-lg font-medium text-gray-700">
          {isDragging ? '释放以上传文件' : '拖拽音频文件到这里'}
        </p>
        <p className="text-gray-500 mt-2">或点击选择文件</p>
        <p className="text-sm text-gray-400 mt-4">支持 MP3, WAV, OGG, M4A 等格式</p>
      </label>
    </div>
  )
}
