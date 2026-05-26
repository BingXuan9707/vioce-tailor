import { useState } from 'react'

interface ExportButtonProps {
  onExport: () => void
  disabled: boolean
}

export function ExportButton({ onExport, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleClick = async () => {
    setIsExporting(true)
    try {
      await onExport()
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isExporting}
      className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg ${
        disabled || isExporting
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl transform hover:-translate-y-0.5'
      }`}
    >
      {isExporting ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          导出中...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          导出音频
        </span>
      )}
    </button>
  )
}
