'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { uploadResume } from '../lib/api'

interface ResumeUploadProps {
  onUploadSuccess?: () => void
}

export function ResumeUpload({ onUploadSuccess }: ResumeUploadProps) {
  const [uploadResult, setUploadResult] = useState<any>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: uploadResume,
    onSuccess: (data) => {
      setUploadResult(data.data)
      toast.success('Resume uploaded and analyzed successfully!')
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      onUploadSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Upload failed')
    },
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }, [uploadMutation])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        
        {uploadMutation.isPending ? (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
            <p className="text-lg font-medium text-gray-900">Analyzing Resume...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop the resume here' : 'Upload Resume'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop a PDF or DOCX file, or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Maximum file size: 10MB
            </p>
          </div>
        )}
      </div>

      {/* Upload Result */}
      {uploadResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 animate-fade-in">
          <div className="flex items-center mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis Complete</h3>
            {uploadResult.analysis_method === 'ai_enhanced' && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                AI Enhanced
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Personal Information</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Name:</span> {uploadResult.parsed_data?.personal_info?.full_name || 'Not found'}</p>
                <p><span className="font-medium">Email:</span> {uploadResult.parsed_data?.contact_info?.email || 'Not found'}</p>
                <p><span className="font-medium">Phone:</span> {uploadResult.parsed_data?.contact_info?.phone || 'Not found'}</p>
                {uploadResult.parsed_data?.contact_info?.location && (
                  <p><span className="font-medium">Location:</span> {uploadResult.parsed_data.contact_info.location}</p>
                )}
                {uploadResult.parsed_data?.ai_confidence && (
                  <p><span className="font-medium">AI Confidence:</span> {Math.round(uploadResult.parsed_data.ai_confidence * 100)}%</p>
                )}
              </div>
            </div>

            {/* Experience & Skills */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Experience & Skills</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Experience:</span> {uploadResult.parsed_data?.experience?.total_years || uploadResult.parsed_data?.experience?.years_experience || 0} years</p>
                <p><span className="font-medium">Skills:</span> {uploadResult.parsed_data?.skills?.skills_count || Object.values(uploadResult.parsed_data?.skills || {}).flat().length || 0} identified</p>
                <p><span className="font-medium">Education:</span> {uploadResult.parsed_data?.education?.degrees?.map((d: any) => typeof d === 'string' ? d : d.degree).join(', ') || 'Not specified'}</p>
                {uploadResult.parsed_data?.professional_summary && (
                  <p><span className="font-medium">Summary:</span> {uploadResult.parsed_data.professional_summary.substring(0, 100)}...</p>
                )}
              </div>
            </div>

            {/* AI Insights */}
            {uploadResult.ai_insights && (
              <div className="space-y-3 md:col-span-2">
                <h4 className="font-medium text-gray-900">AI Insights</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {uploadResult.ai_insights.hiring_recommendation && (
                      <div>
                        <span className="font-medium">AI Recommendation:</span>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          uploadResult.ai_insights.hiring_recommendation.decision === 'strong_hire' ? 'bg-green-100 text-green-800' :
                          uploadResult.ai_insights.hiring_recommendation.decision === 'hire' ? 'bg-blue-100 text-blue-800' :
                          uploadResult.ai_insights.hiring_recommendation.decision === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {uploadResult.ai_insights.hiring_recommendation.decision?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    )}
                    {uploadResult.ai_insights.overall_score && (
                      <div>
                        <span className="font-medium">AI Score:</span> 
                        <span className={`ml-1 font-bold ${getScoreClass(uploadResult.ai_insights.overall_score)}`}>
                          {uploadResult.ai_insights.overall_score}/100
                        </span>
                      </div>
                    )}
                  </div>
                  {uploadResult.ai_insights.strengths && uploadResult.ai_insights.strengths.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-green-700">Key Strengths:</span>
                      <ul className="mt-1 text-sm text-green-600">
                        {uploadResult.ai_insights.strengths.slice(0, 3).map((strength: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-1">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fraud Analysis */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Fraud Analysis</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Risk Level:</span>
                  <span className={getRiskBadgeClass(uploadResult.fraud_analysis?.risk_level)}>
                    {uploadResult.fraud_analysis?.risk_level?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                {uploadResult.fraud_analysis?.detected_issues?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Issues Detected:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {uploadResult.fraud_analysis.detected_issues.map((issue: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Score */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Candidate Score</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Total Score:</span>
                  <span className={`text-lg font-bold ${getScoreClass(uploadResult.ranking_score?.total_score || 0)}`}>
                    {uploadResult.ranking_score?.total_score || 0}/100
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {uploadResult.ranking_score?.recommendation || 'No recommendation available'}
                </p>
                
                {uploadResult.ranking_score?.component_scores && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Skills: {uploadResult.ranking_score.component_scores.skills}/100</p>
                    <p>Experience: {uploadResult.ranking_score.component_scores.experience}/100</p>
                    <p>Education: {uploadResult.ranking_score.component_scores.education}/100</p>
                    <p>Authenticity: {uploadResult.ranking_score.component_scores.authenticity}/100</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 