'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, Trash2, Download, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { getResumes, deleteResume, exportData, ResumeFilters } from '../lib/api'
import { ResumeDetail } from './ResumeDetail'

interface ResumeListProps {
  filters: ResumeFilters
}

export function ResumeList({ filters }: ResumeListProps) {
  const [selectedResume, setSelectedResume] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'name'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const queryClient = useQueryClient()

  const { data: resumesData, isLoading, error } = useQuery({
    queryKey: ['resumes', filters],
    queryFn: () => getResumes(filters),
    refetchInterval: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteResume,
    onSuccess: () => {
      toast.success('Resume deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete resume')
    },
  })

  const exportMutation = useMutation({
    mutationFn: ({ format, filters }: { format: 'excel' | 'csv', filters: ResumeFilters }) => 
      exportData(format, filters),
    onSuccess: (data) => {
      toast.success('Export initiated successfully')
      // In a real app, you'd handle the download URL
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Export failed')
    },
  })

  const resumes = resumesData?.data || []

  // Sort resumes
  const sortedResumes = [...resumes].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'score':
        aValue = a.ranking_score?.total_score || 0
        bValue = b.ranking_score?.total_score || 0
        break
      case 'name':
        aValue = a.parsed_data?.personal_info?.full_name || a.filename
        bValue = b.parsed_data?.personal_info?.full_name || b.filename
        break
      case 'date':
      default:
        aValue = new Date(a.upload_date).getTime()
        bValue = new Date(b.upload_date).getTime()
        break
    }
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (field: 'date' | 'score' | 'name') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'risk-badge-high'
      case 'medium': return 'risk-badge-medium'
      case 'low': return 'risk-badge-low'
      default: return 'risk-badge-low'
    }
  }

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'score-excellent'
    if (score >= 60) return 'score-good'
    if (score >= 40) return 'score-average'
    return 'score-poor'
  }

  // NEW: Function to get row styling based on fraud detection
  const getRowClass = (resume: any) => {
    const fraudAnalysis = resume.fraud_analysis
    const riskLevel = fraudAnalysis?.risk_level || 'low'
    
    // Base class
    let baseClass = 'hover:bg-gray-50 transition-colors'
    
    // Add fraud-specific styling
    if (riskLevel === 'high') {
      baseClass += ' bg-red-50 border-l-4 border-red-500'
    } else if (riskLevel === 'medium') {
      baseClass += ' bg-yellow-50 border-l-4 border-yellow-500'
    }
    
    // Special highlighting for hidden text fraud
    const detectedIssues = fraudAnalysis?.detected_issues || []
    const hasHiddenText = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('white') || 
      issue.toLowerCase().includes('hidden') ||
      issue.toLowerCase().includes('tiny text') ||
      issue.toLowerCase().includes('invisible')
    )
    
    if (hasHiddenText) {
      baseClass += ' ring-2 ring-red-300 bg-red-100'
    }
    
    return baseClass
  }

  // NEW: Function to get fraud indicators for display
  const getFraudIndicators = (resume: any) => {
    const fraudAnalysis = resume.fraud_analysis
    const detectedIssues = fraudAnalysis?.detected_issues || []
    const indicators = []
    
    // Check for specific fraud types
    const hasHiddenText = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('white') || 
      issue.toLowerCase().includes('hidden') ||
      issue.toLowerCase().includes('tiny text') ||
      issue.toLowerCase().includes('invisible')
    )
    
    const hasKeywordStuffing = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('keyword') || issue.toLowerCase().includes('stuffing')
    )
    
    const hasSuspiciousFormatting = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('formatting') || issue.toLowerCase().includes('font')
    )
    
    if (hasHiddenText) {
      indicators.push({ type: 'hidden_text', label: 'Hidden Text', color: 'red' })
    }
    if (hasKeywordStuffing) {
      indicators.push({ type: 'keyword_stuffing', label: 'Keyword Stuffing', color: 'orange' })
    }
    if (hasSuspiciousFormatting) {
      indicators.push({ type: 'formatting', label: 'Suspicious Format', color: 'yellow' })
    }
    
    return indicators
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load resumes. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {resumes.length} resume{resumes.length !== 1 ? 's' : ''} found
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportMutation.mutate({ format: 'excel', filters })}
            disabled={exportMutation.isPending}
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export Excel
          </button>
          <button
            onClick={() => exportMutation.mutate({ format: 'csv', filters })}
            disabled={exportMutation.isPending}
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Resume Table */}
      {resumes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No resumes found. Upload a resume to get started.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[180px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Candidate</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Experience
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]"
                    onClick={() => handleSort('score')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Score</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Fraud Risk & Issues
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[100px]"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Uploaded</span>
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResumes.map((resume) => {
                  const personalInfo = resume.parsed_data?.personal_info || {}
                  const contactInfo = resume.parsed_data?.contact_info || {}
                  const experience = resume.parsed_data?.experience || {}
                  const fraudIndicators = getFraudIndicators(resume)
                  
                  return (
                    <tr key={resume.id} className={getRowClass(resume)}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                              {(personalInfo.full_name || resume.filename).charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {personalInfo.full_name || 'Unknown Name'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[140px]">
                              {resume.filename}
                            </div>
                            {/* NEW: Fraud indicator badges */}
                            {fraudIndicators.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fraudIndicators.map((indicator, idx) => (
                                  <span 
                                    key={idx}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                      indicator.color === 'red' ? 'bg-red-100 text-red-800 border border-red-200' :
                                      indicator.color === 'orange' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                      'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                    }`}
                                    title={`Fraud detected: ${indicator.label}`}
                                  >
                                    🚨 {indicator.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {contactInfo.email && (
                            <div className="truncate max-w-[150px]">{contactInfo.email}</div>
                          )}
                          {contactInfo.phone && (
                            <div className="text-xs text-gray-500">{contactInfo.phone}</div>
                          )}
                          {!contactInfo.email && !contactInfo.phone && (
                            <span className="text-xs text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">
                          {experience.total_years || experience.years_experience || 0} years
                        </div>
                        <div className="text-xs text-gray-500">
                          {experience.current_position || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreClass(resume.ranking_score?.total_score || 0)}`}>
                            {Math.round(resume.ranking_score?.total_score || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeClass(resume.fraud_analysis?.risk_level)}`}>
                            {(resume.fraud_analysis?.risk_level || 'unknown').toUpperCase()}
                          </span>
                          {/* NEW: Show detected fraud issues */}
                          {resume.fraud_analysis?.detected_issues?.length > 0 && (
                            <div className="text-xs text-red-600">
                              {resume.fraud_analysis.detected_issues.length} issue{resume.fraud_analysis.detected_issues.length > 1 ? 's' : ''} detected
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(resume.upload_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedResume(resume.id)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(resume.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resume Detail Modal */}
      {selectedResume && (
        <ResumeDetail
          resumeId={selectedResume}
          onClose={() => setSelectedResume(null)}
        />
      )}
    </div>
  )
} 