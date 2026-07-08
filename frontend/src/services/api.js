import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'
const REQUEST_TIMEOUT_MS = 30000

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
})

/**
 * Maps a failed axios request to a human-readable error message,
 * covering backend error responses, network failures, and timeouts.
 *
 * @param {import('axios').AxiosError} error
 * @returns {string}
 */
function resolveErrorMessage(error) {
  // Timeout — the request was aborted client-side before a response arrived.
  if (error.code === 'ECONNABORTED') {
    return 'The request took too long to respond. Please try again.'
  }

  // The server responded, but with an error status.
  if (error.response) {
    const { status, data } = error.response
    const backendMessage = data?.error || data?.message

    switch (status) {
      case 400:
        return backendMessage || 'The resume or job description could not be processed. Please check your input and try again.'
      case 404:
        return backendMessage || 'The analysis service could not be found. Please check that the backend is running.'
      case 429:
        return backendMessage || 'Too many requests right now. Please wait a moment and try again.'
      case 500:
        return backendMessage || 'Something went wrong on the server while analyzing your resume.'
      case 502:
        return backendMessage || 'The AI service returned an invalid response. Please try again.'
      case 504:
        return backendMessage || 'The AI service took too long to respond. Please try again.'
      default:
        return backendMessage || `Request failed with status ${status}.`
    }
  }

  // The request was sent but no response was received (server down, CORS, offline, etc.)
  if (error.request) {
    return 'Unable to reach the server. Please check your connection and that the backend is running.'
  }

  // Something happened while setting up the request.
  return error.message || 'An unexpected error occurred.'
}

/**
 * Sends the resume file and job description text to the Flask backend
 * for analysis and returns the generated report.
 *
 * @param {File} resumeFile - The uploaded resume PDF file.
 * @param {string} jobDescription - The pasted job description text.
 * @returns {Promise<{success: true, data: Object} | {success: false, error: string}>}
 */
export async function analyzeResume(resumeFile, jobDescription) {
  try {
    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('job_description', jobDescription)

    const response = await apiClient.post('/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return { success: true, data: response.data }
  } catch (error) {
    return { success: false, error: resolveErrorMessage(error) }
  }
}
