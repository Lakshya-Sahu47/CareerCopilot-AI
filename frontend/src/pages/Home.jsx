import { useState, useRef } from 'react'
import { analyzeResume } from '../services/api'

// ---------------------------------------------------------------------------
// CareerCopilot AI — visual identity
// A "dossier under the scanner" theme: your resume as a document being read
// by a precise instrument. Ink + paper + a single brass accent used only for
// the signal that matters (the scan, the score, the call to action).
// ---------------------------------------------------------------------------
const INK = '#1C2027'
const PAPER = '#F3F5F1'
const BRASS = '#C9A227'
const BRASS_DARK = '#9C7A1D'
const SLATE = '#5B6472'
const HAIRLINE = '#DADFE0'
const MINT = '#2F9E68'
const CORAL = '#D1495B'
const CORAL_BG = '#FBEDEF'

// Classifies the human-readable message returned by analyzeResume() into a
// short, professional card title. api.js already forwards the backend's own
// error text when available, so this only picks the right heading for it.
function classifyError(message = '') {
  const lower = message.toLowerCase()
  if (lower.includes('reach the server') || lower.includes('connection')) {
    return 'Backend Offline'
  }
  if (lower.includes('too long') || lower.includes('timed out') || lower.includes('timeout')) {
    return 'AI Timeout'
  }
  if (lower.includes('pdf') || lower.includes('resume')) {
    return 'Invalid Resume'
  }
  if (lower.includes('job description')) {
    return 'Invalid Job Description'
  }
  if (lower.includes('too many requests')) {
    return 'Rate Limit Reached'
  }
  return 'Analysis Failed'
}

const FONT_DISPLAY = "'Fraunces', ui-serif, Georgia, serif"
const FONT_BODY = "'Inter', ui-sans-serif, system-ui, sans-serif"
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"

// --- Small inline icons (no new dependencies) ---
function IconUpload(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" />
    </svg>
  )
}
function IconTarget(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    </svg>
  )
}
function IconLayers(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 5-9 5-9-5 9-5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13l9 5 9-5" />
    </svg>
  )
}
function IconSparkle(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </svg>
  )
}
function IconChat(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a8 8 0 01-11.6 7.1L4 20l1.1-4.2A8 8 0 1121 12z" />
    </svg>
  )
}
function IconSpinner(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="animate-spin" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// A viewfinder-style corner frame — the recurring signature element that
// signals "this is the thing being scanned."
function CornerFrame({ children, className = '', tone = BRASS }) {
  const arm = 'absolute w-5 h-5'
  const style = { borderColor: tone }
  return (
    <div className={`relative ${className}`}>
      <span className={`${arm} top-0 left-0 border-t-2 border-l-2 rounded-tl-md`} style={style} />
      <span className={`${arm} top-0 right-0 border-t-2 border-r-2 rounded-tr-md`} style={style} />
      <span className={`${arm} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-md`} style={style} />
      <span className={`${arm} bottom-0 right-0 border-b-2 border-r-2 rounded-br-md`} style={style} />
      {children}
    </div>
  )
}

const FEATURES = [
  {
    icon: IconTarget,
    title: 'ATS Score',
    description: 'See exactly how your resume reads to the machines that screen it — before a human ever does.',
  },
  {
    icon: IconLayers,
    title: 'Skill Gap Analysis',
    description: 'Every requirement in the posting, checked line by line against what your resume actually says.',
  },
  {
    icon: IconSparkle,
    title: 'Resume Suggestions',
    description: 'Rewrites and phrasing pulled from the job description\u2019s own vocabulary, not generic advice.',
  },
  {
    icon: IconChat,
    title: 'Interview Questions',
    description: 'The questions this exact role is likely to ask, generated before you ever walk into the room.',
  },
]

// `onAnalysisComplete` is called with the raw backend report once analysis
// succeeds, so a parent component can switch to the Results page and pass
// that data along. Home stays fully functional even if it isn't supplied.
function Home({ onAnalysisComplete } = {}) {
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [jobDescription, setJobDescription] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const isReady = Boolean(file) && jobDescription.trim().length > 0

  const acceptFile = (candidate) => {
    if (candidate && candidate.type === 'application/pdf') {
      setFile(candidate)
      setError(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  const handleFileChange = (e) => {
    acceptFile(e.target.files?.[0])
  }

  const handleAnalyze = async () => {
    if (!isReady || isAnalyzing) return
    setError(null)
    setIsAnalyzing(true)

    const result = await analyzeResume(file, jobDescription)

    setIsAnalyzing(false)

    if (result.success) {
      if (typeof onAnalysisComplete === 'function') {
        onAnalysisComplete(result.data)
      }
    } else {
      setError(result.error)
    }
  }

  return (
    <div style={{ fontFamily: FONT_BODY, backgroundColor: PAPER }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
        @keyframes cc-scan {
          0%   { top: 6%;  opacity: 0.15; }
          50%  { top: 92%; opacity: 0.85; }
          100% { top: 6%;  opacity: 0.15; }
        }
        .cc-scan-line { animation: cc-scan 3.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cc-scan-line { animation: none; top: 50%; opacity: 0.4; }
        }
      `}</style>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: INK }}>
        <div className="max-w-5xl mx-auto px-6 pt-24 pb-28 text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] mb-6"
            style={{ fontFamily: FONT_MONO, color: BRASS }}
          >
            <span className="w-6 h-px" style={{ backgroundColor: BRASS }} />
            CareerCopilot AI &mdash; Resume Intelligence
            <span className="w-6 h-px" style={{ backgroundColor: BRASS }} />
          </div>
          <h1
            className="text-4xl sm:text-6xl leading-tight text-white"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 600 }}
          >
            Read between
            <br />
            <span style={{ fontStyle: 'italic', color: BRASS }}>the lines.</span>
          </h1>
          <p className="mt-6 max-w-xl mx-auto text-base sm:text-lg" style={{ color: '#C4C9D1' }}>
            Upload your resume, paste the job description, and see precisely
            where you stand with the systems that screen you first &mdash; and
            exactly what closes the gap.
          </p>
        </div>

        {/* faint scanning document silhouette, decorative only */}
        <div className="pointer-events-none absolute inset-0 opacity-40 hidden sm:block">
          <div
            className="absolute right-[8%] top-10 w-40 h-52 rounded-md border"
            style={{ borderColor: 'rgba(201,162,39,0.25)' }}
          />
        </div>
      </section>

      {/* Analyze section */}
      <section className="max-w-3xl mx-auto px-6 -mt-14 relative z-20">
        <div
          className="rounded-2xl border shadow-xl p-6 sm:p-8 space-y-7 relative"
          style={{ backgroundColor: '#FFFFFF', borderColor: HAIRLINE }}
        >
          {/* dossier tab */}
          <div
            className="absolute -top-3 left-8 px-3 py-1 rounded-t-md text-[11px] uppercase tracking-[0.15em]"
            style={{ backgroundColor: BRASS, color: INK, fontFamily: FONT_MONO, fontWeight: 600 }}
          >
            New Analysis
          </div>

          {/* Resume upload */}
          <div>
            <label
              className="block text-xs uppercase tracking-[0.12em] mb-2"
              style={{ fontFamily: FONT_MONO, color: SLATE }}
            >
              01 &mdash; Resume
            </label>
            <CornerFrame tone={isDragging ? BRASS : 'transparent'}>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border px-6 py-10 text-center transition-colors ${
                  isDragging ? 'bg-[#FBF6E7]' : 'hover:bg-[#FAFAF8]'
                }`}
                style={{ borderColor: isDragging ? BRASS : HAIRLINE }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <IconUpload className="w-7 h-7 mx-auto" style={{ color: BRASS_DARK }} />
                {file ? (
                  <p className="mt-3 text-sm font-medium" style={{ color: INK }}>
                    {file.name}
                  </p>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-medium" style={{ color: INK }}>
                      Drag &amp; drop your resume here, or click to browse
                    </p>
                    <p className="mt-1 text-xs" style={{ fontFamily: FONT_MONO, color: SLATE }}>
                      PDF ONLY
                    </p>
                  </>
                )}
              </div>
            </CornerFrame>
          </div>

          {/* Job description */}
          <div>
            <label
              className="block text-xs uppercase tracking-[0.12em] mb-2"
              style={{ fontFamily: FONT_MONO, color: SLATE }}
            >
              02 &mdash; Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here..."
              rows={8}
              className="w-full rounded-xl border p-4 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 resize-none"
              style={{ borderColor: HAIRLINE, color: INK, ['--tw-ring-color']: BRASS }}
            />
          </div>

          {/* Analyze button */}
          <div className="text-center pt-1">
            <button
              onClick={handleAnalyze}
              disabled={!isReady || isAnalyzing}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
              style={{
                background: `linear-gradient(to right, ${BRASS}, ${BRASS_DARK})`,
                color: INK,
                fontFamily: FONT_BODY,
              }}
            >
              {isAnalyzing && <IconSpinner className="w-5 h-5" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
            </button>
          </div>

          {error && (
            <div
              className="rounded-xl px-5 py-4 text-left"
              style={{ backgroundColor: CORAL_BG, border: `1px solid ${CORAL}` }}
            >
              <p
                className="text-xs uppercase tracking-[0.14em] mb-1"
                style={{ fontFamily: FONT_MONO, color: CORAL }}
              >
                {classifyError(error)}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: INK }}>
                {error}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2
          className="text-center mb-12 text-2xl sm:text-3xl"
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, color: INK }}
        >
          Everything you need to land the interview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border bg-white p-6 hover:shadow-md transition-shadow"
              style={{ borderColor: HAIRLINE }}
            >
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center"
                style={{ backgroundColor: '#FBF6E7', color: BRASS_DARK }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 font-semibold" style={{ color: INK }}>
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: SLATE }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
