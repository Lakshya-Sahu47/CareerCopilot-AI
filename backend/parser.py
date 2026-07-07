"""
parser.py

Resume Parsing module for CareerCopilot AI.

This module is responsible for extracting clean, readable text content
from PDF resumes so that it can later be consumed by the ATS Engine.

It uses PyMuPDF (imported as `fitz`) to open and read PDF files.
"""

import os
import re

import fitz  # PyMuPDF


def _validate_pdf_path(pdf_path: str) -> None:
    """
    Validate that the given path points to an existing PDF file.

    Args:
        pdf_path: Path to the PDF file to validate.

    Raises:
        FileNotFoundError: If the file does not exist at the given path.
        ValueError: If the path does not point to a file with a .pdf extension.
    """
    if not isinstance(pdf_path, str) or not pdf_path.strip():
        raise ValueError("pdf_path must be a non-empty string.")

    if not os.path.isfile(pdf_path):
        raise FileNotFoundError(f"No file found at path: {pdf_path}")

    if not pdf_path.lower().endswith(".pdf"):
        raise ValueError(f"File is not a PDF: {pdf_path}")


def _open_pdf(pdf_path: str) -> fitz.Document:
    """
    Open a PDF file using PyMuPDF.

    Args:
        pdf_path: Path to the PDF file to open.

    Returns:
        An open fitz.Document object representing the PDF.

    Raises:
        ValueError: If the file is not a valid or readable PDF (corrupted,
            malformed, or otherwise unable to be opened by PyMuPDF).
    """
    try:
        document = fitz.open(pdf_path)
    except Exception as exc:
        raise ValueError(f"Failed to open PDF file '{pdf_path}': {exc}") from exc

    if document.is_encrypted:
        # Try to authenticate with an empty password (common for
        # "restricted" but not truly password-protected PDFs).
        if not document.authenticate(""):
            document.close()
            raise ValueError(
                f"PDF file '{pdf_path}' is encrypted and could not be opened."
            )

    return document


def _extract_raw_text(document: fitz.Document) -> str:
    """
    Extract raw text from every page of an open PDF document.

    Args:
        document: An open fitz.Document object.

    Returns:
        A single string containing the concatenated raw text from all pages.

    Raises:
        ValueError: If the PDF contains no pages, or if no extractable
            text content is found on any page.
    """
    if document.page_count == 0:
        raise ValueError("PDF file contains no pages.")

    page_texts = []
    for page in document:
        page_text = page.get_text("text")
        if page_text:
            page_texts.append(page_text)

    merged_text = "\n".join(page_texts)

    if not merged_text.strip():
        raise ValueError(
            "PDF file appears to be empty or contains no extractable text "
            "(it may be a scanned/image-only document)."
        )

    return merged_text


def _clean_text(raw_text: str) -> str:
    """
    Clean raw extracted PDF text into readable, normalized text.

    Cleaning steps:
        - Replace tabs with a single space.
        - Collapse repeated horizontal whitespace into a single space.
        - Collapse 3+ consecutive newlines (repeated blank lines) into
          a single blank line, preserving paragraph breaks.
        - Strip leading/trailing whitespace from each line.
        - Strip leading/trailing whitespace from the final result.

    Args:
        raw_text: The raw, unprocessed text extracted from a PDF.

    Returns:
        A cleaned, readable string with normalized whitespace and
        preserved paragraph structure.
    """
    # Remove tabs.
    text = raw_text.replace("\t", " ")

    # Strip trailing whitespace from each line, keep line breaks intact.
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    # Collapse repeated horizontal spaces (but not newlines) into one space.
    text = re.sub(r"[ ]{2,}", " ", text)

    # Collapse 3 or more consecutive newlines into exactly two
    # (i.e., a single blank line), preserving paragraph separation.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def extract_resume_text(pdf_path: str) -> str:
    """
    Extract clean, readable text content from a PDF resume.

    This is the main entry point of the Resume Parsing module. It opens
    the PDF at `pdf_path`, reads every page, merges the extracted text,
    cleans it, and returns a single normalized string ready for downstream
    processing (e.g., by the ATS Engine).

    Args:
        pdf_path: Path to the resume PDF file.

    Returns:
        A single cleaned string containing the full text content of the
        resume, with paragraphs preserved.

    Raises:
        FileNotFoundError: If no file exists at `pdf_path`.
        ValueError: If the path is invalid, the file is not a PDF, the
            PDF is corrupted/unreadable, or the PDF contains no
            extractable text (e.g., empty or image-only).
    """
    _validate_pdf_path(pdf_path)

    document = _open_pdf(pdf_path)
    try:
        raw_text = _extract_raw_text(document)
    finally:
        document.close()

    return _clean_text(raw_text)
