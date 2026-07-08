import { useState } from 'react'
import Home from './pages/Home'
import Results from './pages/Results'

const INK = '#1C2027'
const BRASS = '#C9A227'
const BRASS_DARK = '#9C7A1D'
const HAIRLINE = '#DADFE0'
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"

function App() {
  const [report, setReport] = useState(null)

  const handleAnalysisComplete = (backendReport) => {
    setReport(backendReport)
  }

  const handleReset = () => {
    setReport(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {report ? (
        <>
          <div
            className="sticky top-0 z-30 flex justify-end px-6 py-3"
            style={{ backgroundColor: '#FFFFFF', borderBottom: `1px solid ${HAIRLINE}` }}
          >
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                color: INK,
                border: `1px solid ${BRASS_DARK}`,
                fontFamily: FONT_MONO,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FBF6E7')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              &larr; Analyze Another Resume
            </button>
          </div>
          <Results report={report} />
        </>
      ) : (
        <Home onAnalysisComplete={handleAnalysisComplete} />
      )}
    </div>
  )
}

export default App
