"""
analyzer.py

ATS Analysis Engine for CareerCopilot AI.

This module compares a resume's text against a job description's text
using a skill knowledge base (skills.json) to determine:
    - Which required skills the resume already has (matched skills)
    - Which required skills the resume is missing
    - A simple ATS Match Score

Expected shape of skills.json
------------------------------
This module accepts three possible shapes for skills.json:

1. A flat top-level list of skill entries::

    [
        {
            "name": "Python",
            "aliases": ["py"],
            "keywords": ["python programming", "python3"]
        },
        ...
    ]

2. A top-level object with a "skills" key mapping to a list of skill
   entries::

    {
        "skills": [
            {
                "name": "Python",
                "aliases": ["py"],
                "keywords": ["python programming", "python3"]
            },
            ...
        ]
    }

3. A top-level object where each key is a category name (e.g.
   "Programming Languages", "Frontend", "Backend") mapping to a list
   of skill entries::

    {
        "Programming Languages": [
            {
                "name": "Python",
                "aliases": ["py"],
                "keywords": ["python", "python3"]
            },
            ...
        ],
        "Frontend": [
            {
                "name": "React",
                "aliases": ["ReactJS"],
                "keywords": ["react", "reactjs", "react.js"]
            },
            ...
        ]
    }

In the categorized format (3), all categories are flattened into a
single list of skill entries. The category name itself is not used
for matching -- only "name", "aliases", and "keywords" are used by
this module. All matching against resume/job description text is
case insensitive and punctuation insensitive.

If a skill name appears in more than one category (e.g. "Postman"
under both "Testing" and "Tools"), it is automatically deduplicated
by `extract_skills()`, since detected skills are collected into a set
keyed by canonical name.
"""

import json
import os
import re
from typing import Dict, List, Union

# Type alias for a single skill entry as loaded from skills.json.
SkillEntry = Dict[str, Union[str, List[str]]]

# Default location of skills.json: same directory as this file.
_DEFAULT_SKILLS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "skills.json")


def load_skill_database(skills_path: str = _DEFAULT_SKILLS_PATH) -> List[SkillEntry]:
    """
    Load the skill knowledge base from a JSON file.

    The JSON file is expected to contain one of the following:
        - A top-level list of skill entries,
        - A top-level object with a "skills" key mapping to a list
          of skill entries, or
        - A top-level object where each key is a category name
          mapping to a list of skill entries (categorized format).
          In this case, all categories are flattened into a single
          list of skill entries.

    Each skill entry is expected to be a dictionary with at least a
    "name" key, and optionally "aliases" and "keywords" keys (each a
    list of strings).

    Args:
        skills_path: Path to the skills.json file. Defaults to a
            skills.json file located alongside this module.

    Returns:
        A flat list of skill entry dictionaries.

    Raises:
        FileNotFoundError: If no file exists at `skills_path`.
        ValueError: If the file is not valid JSON, does not match one
            of the supported structures, or contains no skill entries.
    """
    if not os.path.isfile(skills_path):
        raise FileNotFoundError(f"Skill database not found at path: {skills_path}")

    try:
        with open(skills_path, "r", encoding="utf-8") as file_handle:
            data = json.load(file_handle)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Skill database at '{skills_path}' is not valid JSON: {exc}") from exc

    skills = _normalize_skill_database_shape(data)

    if not skills:
        raise ValueError(
            f"No skill entries were found in skill database at '{skills_path}'."
        )

    for entry in skills:
        if not isinstance(entry, dict) or "name" not in entry:
            raise ValueError(
                "Each skill entry in the skill database must be a dictionary "
                "containing at least a 'name' key."
            )

    return skills


def _normalize_skill_database_shape(data: Union[list, dict]) -> List[SkillEntry]:
    """
    Normalize any supported skills.json shape into a flat list of
    skill entries.

    Supports:
        - A flat top-level list of skill entries.
        - A top-level object with a "skills" key mapping to a list.
        - A top-level object keyed by category, where each value is a
          list of skill entries (categorized format). All categories
          are flattened into a single list.

    Args:
        data: The raw JSON-decoded contents of skills.json.

    Returns:
        A flat list of skill entry dictionaries. May be empty if no
        recognizable skill entries were found.

    Raises:
        ValueError: If `data` is neither a list nor a dictionary.
    """
    if isinstance(data, list):
        return data

    if not isinstance(data, dict):
        raise ValueError(
            "Skill database must be a list of skill entries, or an object "
            "containing either a 'skills' key or category keys, each "
            "mapping to a list of skill entries."
        )

    # Supported format: {"skills": [...]}
    if isinstance(data.get("skills"), list):
        return data["skills"]

    # Categorized format: {"Category A": [...], "Category B": [...], ...}
    flattened: List[SkillEntry] = []
    for _category_name, entries in data.items():
        if not isinstance(entries, list):
            continue
        for entry in entries:
            if isinstance(entry, dict):
                flattened.append(entry)

    return flattened


def _normalize_text(text: str) -> str:
    """
    Normalize text for case-insensitive, punctuation-insensitive matching.

    Args:
        text: The raw input text.

    Returns:
        A lowercased version of the text with punctuation replaced by
        spaces and whitespace collapsed, suitable for substring search.
    """
    lowered = text.lower()
    no_punctuation = re.sub(r"[^\w\s]", " ", lowered)
    collapsed = re.sub(r"\s+", " ", no_punctuation).strip()
    return collapsed


def _build_search_terms(skill_entry: SkillEntry) -> List[str]:
    """
    Build the full list of normalized search terms for a skill entry.

    The search terms include the skill's canonical name, all of its
    aliases, and all of its keywords.

    Args:
        skill_entry: A single skill entry from the skill database.

    Returns:
        A list of normalized (lowercased, punctuation-stripped) search
        terms that should be searched for in resume/job description text.
    """
    name = skill_entry.get("name", "")
    aliases = skill_entry.get("aliases", []) or []
    keywords = skill_entry.get("keywords", []) or []

    raw_terms = [name] + list(aliases) + list(keywords)
    normalized_terms = [_normalize_text(term) for term in raw_terms if term]

    # Remove empty strings that may result from normalization.
    return [term for term in normalized_terms if term]


def extract_skills(text: str, skill_database: List[SkillEntry] = None) -> List[str]:
    """
    Extract a unique, sorted list of skills detected in the given text.

    Matching is case insensitive and punctuation insensitive. A skill is
    considered "detected" if its canonical name, any of its aliases, or
    any of its keywords appears as a substring of the normalized text.

    If the same canonical skill name appears in multiple categories of
    a categorized skills.json (e.g. "Postman" under both "Testing" and
    "Tools"), it is only counted once, since detected skills are
    collected into a set keyed by canonical name.

    Args:
        text: The text to scan for skills (e.g., resume text or job
            description text).
        skill_database: The skill knowledge base to match against, as
            returned by `load_skill_database()`. If not provided, the
            default skills.json (located alongside this module) is
            loaded automatically.

    Returns:
        A sorted list of unique canonical skill names found in the text.
    """
    if skill_database is None:
        skill_database = load_skill_database()

    normalized_text = _normalize_text(text)

    detected_skills = set()

    for skill_entry in skill_database:
        canonical_name = skill_entry.get("name", "")
        if not canonical_name:
            continue

        search_terms = _build_search_terms(skill_entry)
        if any(term in normalized_text for term in search_terms):
            detected_skills.add(canonical_name)

    return sorted(detected_skills, key=str.lower)


def _calculate_ats_score(matched_skill_count: int, job_skill_count: int) -> int:
    """
    Calculate the ATS Match Score as a percentage.

    Formula (V1):
        ATS Score = (matched_skill_count / job_skill_count) * 100

    The result is rounded to the nearest integer and clamped to the
    inclusive range [0, 100].

    Args:
        matched_skill_count: Number of job-required skills also found
            in the resume.
        job_skill_count: Total number of skills detected in the job
            description.

    Returns:
        An integer ATS score between 0 and 100. If `job_skill_count`
        is 0, the score is 0 (there is nothing to match against).
    """
    if job_skill_count <= 0:
        return 0

    raw_score = (matched_skill_count / job_skill_count) * 100
    rounded_score = round(raw_score)

    return max(0, min(100, rounded_score))


def compare_resume_with_job(
    resume_text: str,
    job_description_text: str,
    skill_database: List[SkillEntry] = None,
) -> Dict[str, Union[int, List[str]]]:
    """
    Compare a resume against a job description and compute ATS results.

    Args:
        resume_text: The full text content of the resume.
        job_description_text: The full text content of the job
            description.
        skill_database: The skill knowledge base to match against, as
            returned by `load_skill_database()`. If not provided, the
            default skills.json (located alongside this module) is
            loaded automatically.

    Returns:
        A dictionary with the following keys:
            - "ats_score" (int): Match score from 0 to 100.
            - "matched_skills" (List[str]): Sorted list of skills found
              in both the resume and the job description.
            - "missing_skills" (List[str]): Sorted list of skills
              required by the job description but absent from the
              resume.
            - "resume_skill_count" (int): Total unique skills detected
              in the resume.
            - "job_skill_count" (int): Total unique skills detected in
              the job description.
    """
    if skill_database is None:
        skill_database = load_skill_database()

    resume_skills = extract_skills(resume_text, skill_database)
    job_skills = extract_skills(job_description_text, skill_database)

    resume_skill_set = set(resume_skills)
    job_skill_set = set(job_skills)

    matched_skills = sorted(resume_skill_set & job_skill_set, key=str.lower)
    missing_skills = sorted(job_skill_set - resume_skill_set, key=str.lower)

    ats_score = _calculate_ats_score(
        matched_skill_count=len(matched_skills),
        job_skill_count=len(job_skills),
    )

    return {
        "ats_score": ats_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "resume_skill_count": len(resume_skills),
        "job_skill_count": len(job_skills),
    }
    