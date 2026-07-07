"""
ai.py

AI Analysis module for CareerCopilot AI.

This module takes the resume text, job description text, and the
already-computed ATS analysis (from analyzer.py) and sends a structured
prompt to the Groq API to generate human-readable career feedback:
resume strengths/weaknesses, improvement suggestions, a personalized
learning roadmap, and interview questions.

This module does NOT calculate the ATS score itself — the score is
computed elsewhere (analyzer.py) and passed in. The AI is instructed
to explain the score, never to invent or recalculate it.
"""

import json
import os
from typing import Dict, List, Union

from dotenv import load_dotenv
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq, RateLimitError

# Load environment variables from a .env file (if present) so that
# GROQ_API_KEY can be read via os.environ.
load_dotenv()

# Default model: a free, capable instruction-following model on Groq.
# Can be overridden via the GROQ_MODEL environment variable.
_DEFAULT_MODEL = "llama-3.3-70b-versatile"

# Default request timeout, in seconds.
_DEFAULT_TIMEOUT_SECONDS = 30

# Type alias for the AI analysis result dictionary.
AIAnalysisResult = Dict[str, Union[List[str], Dict[str, List[str]]]]

_REQUIRED_TOP_LEVEL_KEYS = (
    "strengths",
    "weaknesses",
    "resume_suggestions",
    "learning_roadmap",
    "interview_questions",
)

_REQUIRED_INTERVIEW_KEYS = ("technical", "behavioral")


class AIAnalysisError(Exception):
    """Base exception for errors raised by the AI Analysis module."""


class MissingAPIKeyError(AIAnalysisError):
    """Raised when the GROQ_API_KEY environment variable is not set."""


class AIRequestTimeoutError(AIAnalysisError):
    """Raised when the request to the Groq API times out."""


class AIRateLimitError(AIAnalysisError):
    """Raised when the Groq API rate limit has been exceeded."""


class InvalidAIResponseError(AIAnalysisError):
    """Raised when the Groq API response is missing, malformed, or not
    valid JSON matching the expected schema."""


def _get_api_key() -> str:
    """
    Read the Groq API key from the environment.

    Returns:
        The Groq API key.

    Raises:
        MissingAPIKeyError: If GROQ_API_KEY is not set in the environment.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise MissingAPIKeyError(
            "GROQ_API_KEY is not set. Add it to your .env file "
            "(see .env.example) or export it as an environment variable."
        )
    return api_key


def _build_prompt(
    resume_text: str,
    job_description: str,
    ats_analysis: Dict[str, Union[int, List[str]]],
) -> str:
    """
    Build the user prompt sent to the Groq API.

    The prompt explicitly instructs the model to treat the ATS score as
    a given fact (not something to recalculate) and to return a single
    valid JSON object matching the expected schema.

    Args:
        resume_text: Full text content of the resume.
        job_description: Full text content of the job description.
        ats_analysis: The ATS analysis dictionary produced by
            analyzer.compare_resume_with_job().

    Returns:
        A formatted prompt string.
    """
    ats_score = ats_analysis.get("ats_score")
    matched_skills = ats_analysis.get("matched_skills", [])
    missing_skills = ats_analysis.get("missing_skills", [])

    return f"""You are a career coach and resume expert helping a job seeker.

You are given:
1. The candidate's resume text.
2. The target job description.
3. A pre-computed ATS analysis (score, matched skills, missing skills).

IMPORTANT RULES:
- The ATS score below is FINAL and already calculated. Do NOT recalculate,
  question, or invent a different score. Only explain what it means.
- Base all feedback strictly on the resume text, the job description, and
  the ATS analysis provided.
- Respond with ONLY a single valid JSON object. No markdown, no code
  fences, no commentary before or after the JSON.

ATS ANALYSIS (already computed, do not change):
- ATS Score: {ats_score}
- Matched Skills: {matched_skills}
- Missing Skills: {missing_skills}

RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return a JSON object with EXACTLY this structure:
{{
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "resume_suggestions": ["...", "..."],
  "learning_roadmap": ["...", "..."],
  "interview_questions": {{
    "technical": ["...", "..."],
    "behavioral": ["...", "..."]
  }}
}}

Guidelines for content:
- "strengths": What the resume does well relative to this job.
- "weaknesses": Weak, unclear, or missing areas in the resume.
- "resume_suggestions": Concrete, actionable edits to improve the resume.
- "learning_roadmap": Skills/topics to learn to close the missing-skill gaps.
- "interview_questions.technical": Likely technical interview questions
  for this role.
- "interview_questions.behavioral": Likely behavioral interview questions
  for this role.
"""


def _parse_ai_response(raw_content: str) -> AIAnalysisResult:
    """
    Parse and validate the raw text content returned by the Groq API.

    Args:
        raw_content: The raw string content from the model's response.

    Returns:
        The parsed AI analysis dictionary.

    Raises:
        InvalidAIResponseError: If the content is empty, not valid JSON,
            or missing required keys.
    """
    if not raw_content or not raw_content.strip():
        raise InvalidAIResponseError("Groq API returned an empty response.")

    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise InvalidAIResponseError(
            f"Groq API response was not valid JSON: {exc}"
        ) from exc

    if not isinstance(parsed, dict):
        raise InvalidAIResponseError("Groq API response JSON must be an object.")

    missing_keys = [key for key in _REQUIRED_TOP_LEVEL_KEYS if key not in parsed]
    if missing_keys:
        raise InvalidAIResponseError(
            f"Groq API response is missing required keys: {missing_keys}"
        )

    interview_questions = parsed.get("interview_questions")
    if not isinstance(interview_questions, dict):
        raise InvalidAIResponseError(
            "'interview_questions' must be an object with 'technical' "
            "and 'behavioral' keys."
        )

    missing_interview_keys = [
        key for key in _REQUIRED_INTERVIEW_KEYS if key not in interview_questions
    ]
    if missing_interview_keys:
        raise InvalidAIResponseError(
            f"'interview_questions' is missing required keys: {missing_interview_keys}"
        )

    return parsed


def generate_ai_analysis(
    resume_text: str,
    job_description: str,
    ats_analysis: Dict[str, Union[int, List[str]]],
    model: str = None,
    timeout: int = _DEFAULT_TIMEOUT_SECONDS,
) -> AIAnalysisResult:
    """
    Generate human-readable AI career feedback using the Groq API.

    Args:
        resume_text: Full text content of the resume.
        job_description: Full text content of the target job description.
        ats_analysis: The ATS analysis dictionary produced by
            analyzer.compare_resume_with_job() (must include at least
            "ats_score", "matched_skills", and "missing_skills").
        model: Optional Groq model name override. Defaults to the
            GROQ_MODEL environment variable, or "llama-3.3-70b-versatile"
            if unset.
        timeout: Request timeout in seconds.

    Returns:
        A dictionary with the following keys:
            - "strengths" (List[str])
            - "weaknesses" (List[str])
            - "resume_suggestions" (List[str])
            - "learning_roadmap" (List[str])
            - "interview_questions" (Dict[str, List[str]]) with
              "technical" and "behavioral" keys.

    Raises:
        MissingAPIKeyError: If GROQ_API_KEY is not set.
        AIRequestTimeoutError: If the request to Groq times out.
        AIRateLimitError: If the Groq API rate limit is exceeded.
        InvalidAIResponseError: If the response is missing, malformed,
            or does not match the expected JSON schema.
        AIAnalysisError: For any other Groq API failure.
    """
    api_key = _get_api_key()
    selected_model = model or os.environ.get("GROQ_MODEL", _DEFAULT_MODEL)

    client = Groq(api_key=api_key, timeout=timeout)
    prompt = _build_prompt(resume_text, job_description, ats_analysis)

    try:
        completion = client.chat.completions.create(
            model=selected_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise career coach. You always respond "
                        "with a single valid JSON object and nothing else."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
    except RateLimitError as exc:
        raise AIRateLimitError(
            f"Groq API rate limit exceeded. Please try again later: {exc}"
        ) from exc
    except APITimeoutError as exc:
        raise AIRequestTimeoutError(
            f"Groq API request timed out after {timeout} seconds: {exc}"
        ) from exc
    except APIConnectionError as exc:
        raise AIAnalysisError(f"Failed to connect to the Groq API: {exc}") from exc
    except APIStatusError as exc:
        raise AIAnalysisError(
            f"Groq API returned an error (status {exc.status_code}): {exc}"
        ) from exc

    if not completion.choices:
        raise InvalidAIResponseError("Groq API response contained no choices.")

    raw_content = completion.choices[0].message.content
    return _parse_ai_response(raw_content)
