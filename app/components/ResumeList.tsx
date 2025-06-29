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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Fraud Risk
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedResumes.map((resume) => (
                  <tr key={resume.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {resume.parsed_data?.personal_info?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-[150px]">{resume.filename}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 truncate max-w-[140px]">
                        {resume.parsed_data?.contact_info?.email || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {resume.parsed_data?.contact_info?.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {resume.parsed_data?.experience?.total_years || 
                         resume.parsed_data?.experience?.years_experience || 
                         resume.parsed_data?.ai_parsing?.experience?.total_years ||
                         resume.parsed_data?.traditional_parsing?.experience?.years_experience || 0} years
                      </div>
                      <div className="text-sm text-gray-500">
                        {resume.parsed_data?.skills?.skills_count || 
                         Object.values(resume.parsed_data?.skills || {}).flat().length ||
                         resume.parsed_data?.skills?.all_skills?.length || 0} skills
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className={`text-lg font-semibold ${getScoreClass(resume.ranking_score?.total_score || 0)}`}>
                        {resume.ranking_score?.total_score || 0}/100
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-[80px]">
                        {resume.ranking_score?.recommendation || 'No recommendation'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={getRiskBadgeClass(resume.fraud_analysis?.risk_level || 'unknown')}>
                        {resume.fraud_analysis?.risk_level?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(resume.upload_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => setSelectedResume(resume.id)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(resume.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Resume"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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