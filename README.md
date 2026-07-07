# CareerCopilot AI

### AI-Powered Resume Intelligence Platform

---

## Project Overview

**CareerCopilot AI** is an AI-powered Resume Intelligence Platform designed to help job seekers understand how well their resume aligns with a specific job description. In its first version, users upload a resume (PDF) and paste a job description, and the platform analyzes both to produce a detailed, AI-generated report — including an ATS match score, skill gap analysis, resume feedback, a personalized learning roadmap, and likely interview questions.

The goal of CareerCopilot AI is to give candidates the same kind of insight that recruiters and Applicant Tracking Systems (ATS) use, so they can improve their resumes and their odds of landing an interview.

---

## Why This Project

Most job seekers apply to roles without knowing whether their resume will even pass an ATS filter, let alone catch a recruiter's attention. Existing tools are often generic, expensive, or locked behind paywalls, and they rarely explain *why* a resume scores the way it does or *what* to do next.

CareerCopilot AI was built to solve this problem with a focused, no-friction experience:

- Give instant, actionable feedback instead of vague scores
- Highlight the exact skills a resume is missing for a target role
- Use AI to generate genuinely useful guidance — not just keyword matching
- Keep V1 simple and functional, with a clear path to more advanced features later

---

## Features

Version 1 of CareerCopilot AI includes:

- 📄 **Resume Upload** — Upload a resume in PDF format
- 📝 **Job Description Input** — Paste any job description as plain text
- 🔍 **Resume Text Extraction** — Extracts and cleans raw text content from the uploaded PDF
- 🎯 **ATS Match Score** — Calculates a compatibility score between the resume and job description
- ✅ **Matching Skills Detection** — Identifies skills present in both the resume and job description
- ❌ **Missing Skills Detection** — Identifies skills required by the job description but absent from the resume
- 💪 **AI-Generated Resume Strengths** — Highlights what the resume does well
- ⚠️ **AI-Generated Resume Weaknesses** — Points out weak or unclear areas
- 🛠️ **AI-Generated Improvement Suggestions** — Actionable recommendations to strengthen the resume
- 📚 **Personalized Learning Roadmap** — Suggests what to learn to close skill gaps
- 🎤 **AI-Generated Interview Questions** — Technical and behavioral questions likely to come up for the role

---

## Workflow

```
Resume PDF
     ↓
Text Extraction (parser.py)
     ↓
Skill Extraction (analyzer.py + skills.json)
     ↓
Resume vs Job Description Comparison
     ↓
ATS Score
     ↓
AI Analysis (ai.py + Groq API)
     ↓
Final Report
```

**Step-by-step:**

1. The user uploads their resume (PDF) and pastes a job description.
2. The Flask backend saves the resume to a temporary file and extracts clean, normalized text from it using **PyMuPDF**.
3. Skills are extracted from both the resume and job description by matching against a custom skill knowledge base (`skills.json`), using case- and punctuation-insensitive matching on skill names, aliases, and keywords.
4. The resume's detected skills are compared against the job description's detected skills to find matched and missing skills.
5. An **ATS Match Score** is calculated as `(matched skills / total job skills) × 100`, rounded and clamped to 0–100.
6. The AI engine (**Groq API**, default model `llama-3.3-70b-versatile`) receives the resume text, job description, and the already-computed ATS analysis, and generates strengths, weaknesses, resume suggestions, a learning roadmap, and interview questions — returned as structured JSON. The AI is explicitly instructed never to recalculate the ATS score, only to explain it.
7. All results are compiled into a final JSON report and returned to the frontend.

---

## Tech Stack

| Layer               | Technology                     |
|---------------------|---------------------------------|
| Frontend            | React, Vite, Tailwind CSS       |
| Backend             | Flask + Flask-CORS              |
| Resume Parsing      | PyMuPDF (`fitz`)                |
| AI Engine           | Groq API (`llama-3.3-70b-versatile`, configurable via `GROQ_MODEL`) |
| Skill Matching      | Custom Skill Knowledge Base (`skills.json`) |
| Frontend Deployment | Vercel                          |
| Backend Deployment  | Render                          |

---

## API

### `GET /`
Health check. Returns application status.

### `POST /analyze`
Runs the full analysis pipeline on a resume and job description.

**Request:** `multipart/form-data`
| Field | Type | Required | Notes |
|---|---|---|---|
| `resume` | file | Yes | Must be a `.pdf` file |
| `job_description` | text | Yes | Plain text, cannot be empty |

**Response (200):**
```json
{
  "success": true,
  "ats_analysis": {
    "ats_score": 0,
    "matched_skills": ["..."],
    "missing_skills": ["..."],
    "resume_skill_count": 0,
    "job_skill_count": 0
  },
  "ai_analysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "resume_suggestions": ["..."],
    "learning_roadmap": ["..."],
    "interview_questions": {
      "technical": ["..."],
      "behavioral": ["..."]
    }
  }
}
```

**Error responses** use `{"success": false, "error": "..."}` with an appropriate status code (`400` for validation/parsing issues, `429` for AI rate limits, `500` for server/config issues, `502` for invalid AI responses, `504` for AI timeouts).

---

## Environment Variables

Configured via `backend/.env` (see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | API key for the Groq AI engine |
| `GROQ_MODEL` | No | Overrides the default model (`llama-3.3-70b-versatile`) |
| `PORT` | No | Backend port (defaults to `5000`) |

---

## Project Structure

```
CareerCopilot-AI/
│
├── README.md
│
├── backend/
│   ├── app.py
│   ├── parser.py
│   ├── analyzer.py
│   ├── ai.py
│   ├── skills.json
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── pages/
        │   ├── Home.jsx
        │   └── Results.jsx
        ├── components/
        │   ├── UploadForm.jsx
        │   ├── ATSCard.jsx
        │   ├── SkillsCard.jsx
        │   ├── SuggestionsCard.jsx
        │   └── InterviewCard.jsx
        └── services/
            └── api.js
```

---

## Future Improvements

Planned enhancements for future versions include:

- 💬 **AI Career Chat** — Conversational AI assistant for career guidance
- 🕒 **Resume Version History** — Track and compare resume changes over time
- ✉️ **Cover Letter Generator** — AI-generated, job-specific cover letters
- 🐙 **GitHub Profile Analysis** — Insights based on public GitHub activity
- 💼 **LinkedIn Profile Review** — AI-powered feedback on LinkedIn profiles

---

## License

This project is licensed under the **MIT License**.

---

## Author

- **GitHub:** [your-github-url]
- **LinkedIn:** [your-linkedin-url]
- **Portfolio:** [your-portfolio-url]
