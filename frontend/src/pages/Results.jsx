// ---------------------------------------------------------------------------
// CareerCopilot AI — Results
// Same visual identity as Home: ink + paper + a single brass accent, with the
// corner-frame "viewfinder" motif carried over as the report's signature.
// Renders the real backend response passed in via the `report` prop.
// ---------------------------------------------------------------------------
const INK = '#1C2027'
const PAPER = '#F3F5F1'
const BRASS = '#C9A227'
const BRASS_DARK = '#9C7A1D'
const SLATE = '#5B6472'
const HAIRLINE = '#DADFE0'
const MINT = '#2F9E68'
const MINT_BG = '#EAF6F0'
const CORAL = '#D1495B'
const CORAL_BG = '#FBEDEF'

const FONT_DISPLAY = "'Fraunces', ui-serif, Georgia, serif"
const FONT_BODY = "'Inter', ui-sans-serif, system-ui, sans-serif"
const FONT_MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"

// Viewfinder corner frame — carried over from Home as the report's signature.
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

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 ${className}`}
      style={{ borderColor: HAIRLINE }}
    >
      {children}
    </div>
  )
}

function CardTitle({ children }) {
  return (
    <h3
      className="text-xs uppercase tracking-[0.14em] mb-4"
      style={{ fontFamily: FONT_MONO, color: SLATE }}
    >
      {children}
    </h3>
  )
}

// Shown in place of a card's content whenever its underlying data is missing.
function EmptyNote({ children }) {
  return (
    <p className="text-sm" style={{ color: SLATE }}>
      {children}
    </p>
  )
}

function ScoreGauge({ score }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference * (1 - clamped / 100)
  const tone = clamped >= 80 ? MINT : clamped >= 60 ? BRASS_DARK : CORAL

  return (
    <Card>
      <CardTitle>ATS Score</CardTitle>
      <CornerFrame className="flex items-center gap-6" tone={HAIRLINE}>
        <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0 -rotate-90">
          <circle cx="70" cy="70" r={radius} fill="none" stroke={HAIRLINE} strokeWidth="10" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={tone}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="py-4">
          <div className="flex items-end gap-1">
            <span
              className="text-4xl font-semibold"
              style={{ fontFamily: FONT_MONO, color: INK }}
            >
              {clamped}
            </span>
            <span className="text-sm mb-1" style={{ color: SLATE }}>
              / 100
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed max-w-[16rem]" style={{ color: SLATE }}>
            {clamped >= 80
              ? 'A strong match for this role, with only minor gaps worth closing.'
              : clamped >= 60
              ? 'A reasonable match for this role, with a few gaps worth closing.'
              : 'A weaker match for this role — the gaps below are worth addressing first.'}
          </p>
        </div>
      </CornerFrame>
    </Card>
  )
}

function SkillsCard({ title, skills, tone, emptyMessage }) {
  const isPositive = tone === 'positive'
  const badgeStyle = isPositive
    ? { backgroundColor: MINT_BG, color: MINT, border: `1px solid ${MINT}` }
    : { backgroundColor: CORAL_BG, color: CORAL, border: `1px dashed ${CORAL}` }

  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {skills.length === 0 ? (
        <EmptyNote>{emptyMessage}</EmptyNote>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="text-xs px-3 py-1 rounded-full"
              style={{ ...badgeStyle, fontFamily: FONT_MONO }}
            >
              {isPositive ? '✓ ' : '+ '}
              {skill}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

function ListCard({ title, items, mark, tone, emptyMessage }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {items.length === 0 ? (
        <EmptyNote>{emptyMessage}</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#333A44' }}>
              <span
                className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                style={{ fontFamily: FONT_MONO, backgroundColor: `${tone}1A`, color: tone }}
              >
                {mark}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RoadmapCard({ steps, emptyMessage }) {
  return (
    <Card>
      <CardTitle>Learning Roadmap</CardTitle>
      {steps.length === 0 ? (
        <EmptyNote>{emptyMessage}</EmptyNote>
      ) : (
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-semibold flex items-center justify-center"
                style={{ backgroundColor: INK, fontFamily: FONT_MONO }}
              >
                {i + 1}
              </span>
              <span className="text-sm pt-0.5 leading-relaxed" style={{ color: '#333A44' }}>
                {step}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function InterviewQuestionsCard({ questions, emptyMessage }) {
  return (
    <Card className="md:col-span-2">
      <CardTitle>Interview Questions</CardTitle>
      {questions.length === 0 ? (
        <EmptyNote>{emptyMessage}</EmptyNote>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {questions.map((q, i) => (
            <div
              key={i}
              className="rounded-xl p-4 text-sm leading-relaxed"
              style={{ backgroundColor: PAPER, border: `1px solid ${HAIRLINE}`, color: '#333A44' }}
            >
              <span
                className="flex items-center justify-between mb-2 text-[11px] uppercase tracking-[0.12em]"
                style={{ fontFamily: FONT_MONO, color: BRASS_DARK }}
              >
                <span>Q{String(i + 1).padStart(2, '0')}</span>
                {q.type && <span style={{ color: SLATE }}>{q.type}</span>}
              </span>
              {q.question}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// A single professional card used whenever the report is missing entirely,
// or the AI half of the pipeline didn't return usable results.
function NoticeCard({ title, children }) {
  return (
    <Card className="md:col-span-2 text-center">
      <p
        className="text-xs uppercase tracking-[0.14em] mb-2"
        style={{ fontFamily: FONT_MONO, color: SLATE }}
      >
        {title}
      </p>
      <p className="text-sm" style={{ color: '#333A44' }}>
        {children}
      </p>
    </Card>
  )
}

function Results({ report }) {
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const ats = report?.ats_analysis
  const ai = report?.ai_analysis

  const matchedSkills = ats?.matched_skills || []
  const missingSkills = ats?.missing_skills || []
  const interviewQuestions = ai
    ? [
        ...(ai.interview_questions?.technical || []).map((question) => ({
          question,
          type: 'Technical',
        })),
        ...(ai.interview_questions?.behavioral || []).map((question) => ({
          question,
          type: 'Behavioral',
        })),
      ]
    : []

  return (
    <div style={{ fontFamily: FONT_BODY, backgroundColor: PAPER }} className="min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');
      `}</style>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.14em] mb-3"
            style={{ fontFamily: FONT_MONO, color: SLATE }}
          >
            <span>Report generated {today}</span>
            <span style={{ color: HAIRLINE }}>&middot;</span>
            <span style={{ color: report ? MINT : CORAL }}>
              Status: {report ? 'Complete' : 'No Data'}
            </span>
          </div>
          <h1
            className="text-3xl sm:text-4xl"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, color: INK }}
          >
            Your Analysis
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: SLATE }}>
            Here&rsquo;s how your resume matches up against the job description.
          </p>
        </div>

        {!ats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <NoticeCard title="No Analysis Available">
              Run an analysis from the home page to see your ATS score, skill gaps, and AI
              feedback here.
            </NoticeCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ScoreGauge score={ats.ats_score ?? 0} />
            <SkillsCard
              title="Matching Skills"
              skills={matchedSkills}
              tone="positive"
              emptyMessage="No matching skills found."
            />
            <SkillsCard
              title="Missing Skills"
              skills={missingSkills}
              tone="negative"
              emptyMessage="No missing skills detected."
            />

            {!ai ? (
              <NoticeCard title="AI Analysis">AI analysis unavailable.</NoticeCard>
            ) : (
              <>
                <ListCard
                  title="Strengths"
                  items={ai.strengths || []}
                  mark="✓"
                  tone={MINT}
                  emptyMessage="AI analysis unavailable."
                />
                <ListCard
                  title="Weaknesses"
                  items={ai.weaknesses || []}
                  mark="!"
                  tone={CORAL}
                  emptyMessage="AI analysis unavailable."
                />
                <ListCard
                  title="Suggestions"
                  items={ai.resume_suggestions || []}
                  mark="→"
                  tone={BRASS_DARK}
                  emptyMessage="AI analysis unavailable."
                />
                <RoadmapCard
                  steps={ai.learning_roadmap || []}
                  emptyMessage="AI analysis unavailable."
                />
                <InterviewQuestionsCard
                  questions={interviewQuestions}
                  emptyMessage="AI analysis unavailable."
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Results
