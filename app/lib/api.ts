import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Add request/response interceptors for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`, response.data)
    return response
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export interface ResumeData {
  id: string
  filename: string
  upload_date: string
  parsed_data: any
  fraud_analysis: any
  ranking_score: any
  ai_insights?: any
  interview_questions?: string[]
  analysis_method?: string
  created_at: string
}

export interface ResumeFilters {
  name?: string
  skills?: string
  experience_min?: number
  experience_max?: number
  education?: string
  fraud_risk?: string
  min_score?: number
  max_score?: number
}

export const uploadResume = async (file: File): Promise<{ success: boolean; data: ResumeData }> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await api.post('/api/upload-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

export const getResumes = async (filters?: ResumeFilters): Promise<{ success: boolean; data: ResumeData[] }> => {
  const response = await api.get('/api/resumes', {
    params: filters,
  })
  
  return response.data
}

export const getResumeById = async (id: string): Promise<{ success: boolean; data: ResumeData }> => {
  const response = await api.get(`/api/resume/${id}`)
  return response.data
}

export const deleteResume = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/api/resume/${id}`)
  return response.data
}

export const getStatistics = async (): Promise<{ success: boolean; data: any }> => {
  try {
    console.log('Fetching statistics from API...')
    const response = await api.get('/api/stats')
    console.log('Statistics response:', response.data)
    return response.data
  } catch (error) {
    console.error('Statistics API error:', error)
    throw error
  }
}

export const exportData = async (format: 'excel' | 'csv', filters?: ResumeFilters): Promise<{ success: boolean; download_url: string }> => {
  const response = await api.post('/api/export', {
    format,
    filters,
  })
  
  return response.data
}

export const getResumeInsights = async (id: string): Promise<{ success: boolean; data: any }> => {
  const response = await api.get(`/api/resume/${id}/insights`)
  return response.data
}

export const regenerateInsights = async (id: string): Promise<{ success: boolean; data: any }> => {
  const response = await api.post(`/api/resume/${id}/regenerate-insights`)
  return response.data
}

// Conversational Search APIs
export const chatSearchCandidates = async (message: string, conversationHistory: any[] = [], context: any = {}): Promise<any> => {
  const response = await api.post('/api/candidates/chat-search', {
    message,
    conversation_history: conversationHistory,
    context
  })
  return response.data
}

export const compareCandidates = async (candidateIds: string[], criteria: string = 'overall'): Promise<any> => {
  const response = await api.post('/api/candidates/compare', {
    candidate_ids: candidateIds,
    criteria
  })
  return response.data
}

// Export the api instance for direct use
export { api } 