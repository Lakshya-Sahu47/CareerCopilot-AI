const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

/**
 * Sends the resume file and job description text to the Flask backend
 * for analysis and returns the generated report.
 *
 * @param {File} resumeFile - The uploaded resume PDF file.
 * @param {string} jobDescription - The pasted job description text.
 * @returns {Promise<Object>} The analysis report from the backend.
 */
export async function analyzeResume(resumeFile, jobDescription) {
  const formData = new FormData()
  formData.append('resume', resumeFile)
  formData.append('jobDescription', jobDescription)

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message || `Request failed with status ${response.status}`)
  }

  return response.json()
}