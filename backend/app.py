"""
app.py

Flask backend entry point for CareerCopilot AI.

Wires together the previously built modules into a single API:
    - parser.py   -> extracts text from an uploaded resume PDF
    - analyzer.py -> computes the ATS skill match analysis
    - ai.py       -> generates AI career feedback via the Groq API

Endpoints:
    GET  /         Health check.
    POST /analyze  Full resume analysis pipeline.
"""

import os
import tempfile
from typing import Any, Dict, Optional, Tuple

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

import ai
import analyzer
import parser

app = Flask(__name__)
CORS(app)

_ALLOWED_EXTENSION = ".pdf"


class _AppError(Exception):
    """
    Internal exception used to carry an HTTP status code alongside a
    human-readable error message, so route handlers can translate any
    module-level failure into a consistent JSON error response.
    """

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _error_response(message: str, status_code: int) -> Tuple[Response, int]:
    """
    Build a standardized JSON error response.

    Args:
        message: Human-readable error message.
        status_code: HTTP status code to return.

    Returns:
        A (Flask JSON response, status_code) tuple.
    """
    return jsonify({"success": False, "error": message}), status_code


def _validate_analyze_request(
    resume_file: Optional[FileStorage], job_description: str
) -> Optional[str]:
    """
    Validate the inputs to the /analyze endpoint.

    Args:
        resume_file: The uploaded resume file, or None if missing.
        job_description: The submitted job description text.

    Returns:
        An error message string if validation fails, otherwise None.
    """
    if resume_file is None or resume_file.filename == "":
        return "No resume file uploaded. Attach a PDF under the 'resume' field."

    if not resume_file.filename.lower().endswith(_ALLOWED_EXTENSION):
        return "Uploaded resume must be a PDF file."

    if not job_description or not job_description.strip():
        return "Job description is required and cannot be empty."

    return None


def _save_temp_resume(resume_file: FileStorage) -> str:
    """
    Save the uploaded resume file to a temporary location on disk.

    Args:
        resume_file: The uploaded PDF file.

    Returns:
        The filesystem path to the saved temporary file.

    Raises:
        _AppError: If the file cannot be written to disk.
    """
    try:
        filename = secure_filename(resume_file.filename) or "resume.pdf"
        suffix = os.path.splitext(filename)[1] or _ALLOWED_EXTENSION
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_path = temp_file.name
        resume_file.save(temp_path)
        return temp_path
    except Exception as exc:
        raise _AppError(f"Failed to save uploaded resume: {exc}", 500) from exc


def _cleanup_temp_file(temp_path: Optional[str]) -> None:
    """
    Delete a temporary file if it exists, silently ignoring failures.

    Args:
        temp_path: Path to the temporary file to remove.
    """
    if temp_path and os.path.exists(temp_path):
        try:
            os.remove(temp_path)
        except OSError:
            pass


def _extract_resume_text(pdf_path: str) -> str:
    """
    Extract clean text from the resume PDF, translating parser.py
    errors into standardized API errors.

    Args:
        pdf_path: Path to the temporarily saved resume PDF.

    Returns:
        The extracted, cleaned resume text.

    Raises:
        _AppError: If the PDF is missing, invalid, corrupted, or empty.
    """
    try:
        return parser.extract_resume_text(pdf_path)
    except FileNotFoundError as exc:
        raise _AppError(f"Resume file could not be found: {exc}", 400) from exc
    except ValueError as exc:
        raise _AppError(f"Could not parse resume PDF: {exc}", 400) from exc


def _run_ats_analysis(resume_text: str, job_description: str) -> Dict[str, Any]:
    """
    Run the ATS skill-matching analysis, translating analyzer.py
    errors into standardized API errors.

    Args:
        resume_text: Extracted resume text.
        job_description: Job description text.

    Returns:
        The ATS analysis dictionary (ats_score, matched_skills,
        missing_skills, resume_skill_count, job_skill_count).

    Raises:
        _AppError: If the skill database cannot be loaded or parsed.
    """
    try:
        return analyzer.compare_resume_with_job(resume_text, job_description)
    except (FileNotFoundError, ValueError) as exc:
        raise _AppError(f"ATS analysis failed: {exc}", 500) from exc


def _run_ai_analysis(
    resume_text: str, job_description: str, ats_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Run the AI career feedback generation, translating ai.py errors
    into standardized API errors.

    Args:
        resume_text: Extracted resume text.
        job_description: Job description text.
        ats_analysis: The ATS analysis dictionary from analyzer.py.

    Returns:
        The AI analysis dictionary (strengths, weaknesses,
        resume_suggestions, learning_roadmap, interview_questions).

    Raises:
        _AppError: If the Groq API key is missing, the request times
            out, hits a rate limit, or returns an invalid response.
    """
    try:
        return ai.generate_ai_analysis(resume_text, job_description, ats_analysis)
    except ai.MissingAPIKeyError as exc:
        raise _AppError(f"AI analysis is unavailable: {exc}", 500) from exc
    except ai.AIRequestTimeoutError as exc:
        raise _AppError(f"AI analysis timed out: {exc}", 504) from exc
    except ai.AIRateLimitError as exc:
        raise _AppError(f"AI analysis rate limit exceeded: {exc}", 429) from exc
    except ai.InvalidAIResponseError as exc:
        raise _AppError(f"AI analysis returned an invalid response: {exc}", 502) from exc
    except ai.AIAnalysisError as exc:
        raise _AppError(f"AI analysis failed: {exc}", 502) from exc


@app.route("/", methods=["GET"])
def health_check() -> Response:
    """
    Health check endpoint.

    Returns:
        JSON confirming the application is running.
    """
    return jsonify({"application": "CareerCopilot AI", "status": "running"})


@app.route("/analyze", methods=["POST"])
def analyze() -> Tuple[Response, int]:
    """
    Analyze an uploaded resume against a job description.

    Expects multipart/form-data with:
        - resume: a PDF file.
        - job_description: plain text.

    Returns:
        On success, a JSON object with "success": true, "ats_analysis",
        and "ai_analysis". On failure, a JSON object with
        "success": false and an "error" message, with an appropriate
        HTTP status code.
    """
    resume_file = request.files.get("resume")
    job_description = request.form.get("job_description", "")

    validation_error = _validate_analyze_request(resume_file, job_description)
    if validation_error:
        return _error_response(validation_error, 400)

    temp_path: Optional[str] = None
    try:
        temp_path = _save_temp_resume(resume_file)
        resume_text = _extract_resume_text(temp_path)
        ats_analysis = _run_ats_analysis(resume_text, job_description)
        ai_analysis = _run_ai_analysis(resume_text, job_description, ats_analysis)
    except _AppError as exc:
        return _error_response(exc.message, exc.status_code)
    except Exception as exc:  # noqa: BLE001 - final safety net for unexpected errors
        return _error_response(f"An unexpected error occurred: {exc}", 500)
    finally:
        _cleanup_temp_file(temp_path)

    return (
        jsonify(
            {
                "success": True,
                "ats_analysis": ats_analysis,
                "ai_analysis": ai_analysis,
            }
        ),
        200,
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
