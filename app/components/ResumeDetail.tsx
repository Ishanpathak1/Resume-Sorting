'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertTriangle, CheckCircle, User, Mail, Phone, Calendar, Award, Trash2, HelpCircle, Bug } from 'lucide-react'
import { getResumeById, deleteResume, debugResumeSkills } from '../lib/api'

interface ResumeDetailProps {
  resumeId: string
  onClose: () => void
}

export function ResumeDetail({ resumeId, onClose }: ResumeDetailProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'fraud'>('overview')
  const [showDebugModal, setShowDebugModal] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  
  const { data: resumeData, isLoading, error } = useQuery({
    queryKey: ['resume', resumeId],
    queryFn: () => getResumeById(resumeId),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteResume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      onClose()
    },
  })

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      deleteMutation.mutate(resumeId)
    }
  }

  const resume = resumeData?.data

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

  // Debug function to analyze skill extraction
  const debugSkillExtraction = async () => {
    try {
      const result = await debugResumeSkills(resumeId)
      
      if (result.success) {
        setDebugData(result.debug_info)
        setShowDebugModal(true)
      } else {
        console.error('Debug failed:', result.error)
      }
    } catch (error) {
      console.error('Debug request failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !resume) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600">Failed to load resume details</p>
            <button onClick={onClose} className="btn-primary mt-4">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {(resume.parsed_data?.personal_info?.full_name || resume.filename).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {resume.parsed_data?.personal_info?.full_name || 'Unknown Candidate'}
              </h2>
              <p className="text-sm text-gray-500">{resume.filename}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* NEW: Debug Button */}
            <button
              onClick={debugSkillExtraction}
              className="inline-flex items-center px-3 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              title="Debug skill extraction issues"
            >
              <Bug className="w-4 h-4 mr-2" />
              Debug Skills
            </button>
            <button
              onClick={handleDelete}
              className="text-gray-400 hover:text-gray-600"
            >
              <Trash2 className="w-6 h-6" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <div className={`text-3xl font-bold mb-2 ${getScoreClass(resume.ranking_score?.total_score || 0)}`}>
                {resume.ranking_score?.total_score || 0}/100
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <p className="text-xs text-gray-500 mt-1">
                {resume.ranking_score?.recommendation}
              </p>
            </div>

            <div className="card text-center">
              <div className="mb-2">
                <span className={getRiskBadgeClass(resume.fraud_analysis?.risk_level || 'unknown')}>
                  {resume.fraud_analysis?.risk_level?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              <p className="text-sm text-gray-600">Fraud Risk</p>
              <p className="text-xs text-gray-500 mt-1">
                {resume.fraud_analysis?.detected_issues?.length || 0} issues detected
              </p>
            </div>

            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {resume.parsed_data?.experience?.total_years || 
                 resume.parsed_data?.experience?.years_experience || 
                 resume.parsed_data?.ai_parsing?.experience?.total_years ||
                 resume.parsed_data?.traditional_parsing?.experience?.years_experience || 0}
              </div>
              <p className="text-sm text-gray-600">Years Experience</p>
              <p className="text-xs text-gray-500 mt-1">
                {resume.parsed_data?.skills?.skills_count || 
                 Object.values(resume.parsed_data?.skills || {}).flat().length ||
                 resume.parsed_data?.skills?.all_skills?.length || 0} skills identified
              </p>
            </div>
          </div>

          {/* Personal Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm">
                    <span className="font-medium">Name:</span> {resume.parsed_data?.personal_info?.full_name || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm">
                    <span className="font-medium">Email:</span> {resume.parsed_data?.contact_info?.email || 'Not provided'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm">
                    <span className="font-medium">Phone:</span> {resume.parsed_data?.contact_info?.phone || 'Not provided'}
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm">
                    <span className="font-medium">Uploaded:</span> {new Date(resume.upload_date).toLocaleString()}
                  </span>
                </div>
                {resume.parsed_data?.contact_info?.linkedin && (
                  <div className="flex items-center">
                    <span className="text-sm">
                      <span className="font-medium">LinkedIn:</span> 
                      <a href={resume.parsed_data.contact_info.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                        Profile
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Skills Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills Analysis</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(resume.parsed_data?.skills || {}).map(([category, skills]) => {
                if (category === 'all_skills' || category === 'skills_count' || !Array.isArray(skills)) return null
                
                return (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2 capitalize">
                      {category.replace('_', ' ')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(skills as string[]).map((skill, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(resume.ranking_score?.component_scores || {}).map(([component, score]) => (
                <div key={component}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{component}</span>
                    <span className={getScoreClass(Number(score))}>{Number(score)}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        Number(score) >= 80 ? 'bg-green-600' :
                        Number(score) >= 60 ? 'bg-blue-600' :
                        Number(score) >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Number(score)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Explanations - Why Scores Are Low */}
          {resume.ranking_score?.detailed_explanations && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <HelpCircle className="w-5 h-5 mr-2" />
                Why These Scores? - Detailed Analysis
              </h3>
              
              {/* Skills Explanation */}
              {resume.ranking_score.detailed_explanations.skills && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      resume.ranking_score.detailed_explanations.skills.score >= 60 ? 'bg-green-500' :
                      resume.ranking_score.detailed_explanations.skills.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    Skills Analysis ({resume.ranking_score.detailed_explanations.skills.score.toFixed(1)}/100)
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-medium">Reason:</span> {resume.ranking_score.detailed_explanations.skills.reason}
                    </p>
                    
                    {resume.ranking_score.detailed_explanations.skills.missing_categories?.length > 0 && (
                      <div className="mb-3">
                        <span className="font-medium text-sm text-gray-700">Missing Skill Categories:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.ranking_score.detailed_explanations.skills.missing_categories.map((category: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-sm text-gray-700">Improvement Suggestions:</span>
                      <ul className="list-disc list-inside mt-1 text-sm text-gray-600 space-y-1">
                        {resume.ranking_score.detailed_explanations.skills.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Experience Explanation */}
              {resume.ranking_score.detailed_explanations.experience && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      resume.ranking_score.detailed_explanations.experience.score >= 60 ? 'bg-green-500' :
                      resume.ranking_score.detailed_explanations.experience.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    Experience Analysis ({resume.ranking_score.detailed_explanations.experience.score.toFixed(1)}/100)
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="font-medium">Years Found:</span> {resume.ranking_score.detailed_explanations.experience.years_found}
                      </div>
                      <div>
                        <span className="font-medium">Positions:</span> {resume.ranking_score.detailed_explanations.experience.positions_count}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-medium">Reason:</span> {resume.ranking_score.detailed_explanations.experience.reason}
                    </p>
                    
                    <div>
                      <span className="font-medium text-sm text-gray-700">Improvement Suggestions:</span>
                      <ul className="list-disc list-inside mt-1 text-sm text-gray-600 space-y-1">
                        {resume.ranking_score.detailed_explanations.experience.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Education Explanation */}
              {resume.ranking_score.detailed_explanations.education && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      resume.ranking_score.detailed_explanations.education.score >= 60 ? 'bg-green-500' :
                      resume.ranking_score.detailed_explanations.education.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    Education Analysis ({resume.ranking_score.detailed_explanations.education.score.toFixed(1)}/100)
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">Degrees Found:</span> {resume.ranking_score.detailed_explanations.education.degrees_found}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-medium">Reason:</span> {resume.ranking_score.detailed_explanations.education.reason}
                    </p>
                    
                    <div>
                      <span className="font-medium text-sm text-gray-700">Improvement Suggestions:</span>
                      <ul className="list-disc list-inside mt-1 text-sm text-gray-600 space-y-1">
                        {resume.ranking_score.detailed_explanations.education.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Authenticity Explanation */}
              {resume.ranking_score.detailed_explanations.authenticity && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                      resume.ranking_score.detailed_explanations.authenticity.score >= 80 ? 'bg-green-500' :
                      resume.ranking_score.detailed_explanations.authenticity.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></span>
                    Authenticity Analysis ({resume.ranking_score.detailed_explanations.authenticity.score.toFixed(1)}/100)
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-medium">Reason:</span> {resume.ranking_score.detailed_explanations.authenticity.reason}
                    </p>
                    
                    {resume.ranking_score.detailed_explanations.authenticity.detected_issues?.length > 0 && (
                      <div className="mb-3">
                        <span className="font-medium text-sm text-red-700">Detected Issues:</span>
                        <ul className="list-disc list-inside mt-1 text-sm text-red-600 space-y-1">
                          {resume.ranking_score.detailed_explanations.authenticity.detected_issues.map((issue: string, index: number) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <span className="font-medium text-sm text-gray-700">Improvement Suggestions:</span>
                      <ul className="list-disc list-inside mt-1 text-sm text-gray-600 space-y-1">
                        {resume.ranking_score.detailed_explanations.authenticity.suggestions.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Overall Recommendations */}
              {resume.ranking_score.detailed_explanations.overall_recommendations?.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🎯 Top Priority Improvements</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {resume.ranking_score.detailed_explanations.overall_recommendations.map((recommendation: string, index: number) => (
                      <li key={index}>• {recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Detailed Scoring Analysis */}
          {resume.ranking_score?.scoring_details && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Scoring Analysis</h3>
              
              {/* Skills Breakdown */}
              {resume.ranking_score.scoring_details.skills_breakdown && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Skills Analysis</h4>
                  <div className="space-y-3">
                    {Object.entries(resume.ranking_score.scoring_details.skills_breakdown)
                      .filter(([category]) => category !== 'total_skills' && category !== 'diversity_bonus')
                      .map(([category, data]: [string, any]) => {
                        const skillData = data as any;
                        return (
                          <div key={category} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium capitalize text-sm">{category.replace('_', ' ')}</span>
                              <span className="text-sm text-gray-600">
                                {skillData.count || 0} skills {skillData.score && `(${skillData.score.toFixed(1)} pts)`}
                              </span>
                            </div>
                            {skillData.skills && skillData.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {skillData.skills.map((skill: string, index: number) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                            {skillData.count === 0 && (
                              <p className="text-xs text-gray-500">No skills found in this category</p>
                            )}
                          </div>
                        );
                      })}
                    
                    {resume.ranking_score.scoring_details.skills_breakdown.total_skills !== undefined && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Total Skills:</span> {resume.ranking_score.scoring_details.skills_breakdown.total_skills}
                          {resume.ranking_score.scoring_details.skills_breakdown.diversity_bonus && (
                            <span className="ml-4">
                              <span className="font-medium">Diversity Bonus:</span> +{resume.ranking_score.scoring_details.skills_breakdown.diversity_bonus.toFixed(1)} pts
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Experience Breakdown */}
              {resume.ranking_score.scoring_details.experience_breakdown && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Experience Analysis</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Years of Experience:</span> {resume.ranking_score.scoring_details.experience_breakdown.years || 0}
                      </div>
                      <div>
                        <span className="font-medium">Experience Score:</span> {resume.ranking_score.scoring_details.experience_breakdown.years_score?.toFixed(1) || 0} pts
                      </div>
                      <div>
                        <span className="font-medium">Positions:</span> {resume.ranking_score.scoring_details.experience_breakdown.positions_count || 0}
                      </div>
                      <div>
                        <span className="font-medium">Seniority Analysis:</span> {resume.ranking_score.scoring_details.experience_breakdown.seniority_bonus}
                      </div>
                    </div>
                    {resume.ranking_score.scoring_details.experience_breakdown.positions && resume.ranking_score.scoring_details.experience_breakdown.positions.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-sm">Positions:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.ranking_score.scoring_details.experience_breakdown.positions.map((position: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {position}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Education Breakdown */}
              {resume.ranking_score.scoring_details.education_breakdown && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Education Analysis</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium">Degrees Found:</span> {resume.ranking_score.scoring_details.education_breakdown.degrees_count || 0}
                      </div>
                      <div>
                        <span className="font-medium">Analysis:</span> {resume.ranking_score.scoring_details.education_breakdown.highest_level}
                      </div>
                    </div>
                    {resume.ranking_score.scoring_details.education_breakdown.degrees && resume.ranking_score.scoring_details.education_breakdown.degrees.length > 0 && (
                      <div>
                        <span className="font-medium text-sm">Degrees:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resume.ranking_score.scoring_details.education_breakdown.degrees.map((degree: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {degree}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Authenticity Breakdown */}
              {resume.ranking_score.scoring_details.authenticity_breakdown && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Authenticity Analysis</h4>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {resume.ranking_score.scoring_details.authenticity_breakdown.status ? (
                      <p className="text-sm text-gray-600">{resume.ranking_score.scoring_details.authenticity_breakdown.status}</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Risk Level:</span> {resume.ranking_score.scoring_details.authenticity_breakdown.risk_level}
                          </div>
                          <div>
                            <span className="font-medium">Risk Score:</span> {(resume.ranking_score.scoring_details.authenticity_breakdown.risk_score * 100).toFixed(1)}%
                          </div>
                        </div>
                        {resume.ranking_score.scoring_details.authenticity_breakdown.detected_issues && resume.ranking_score.scoring_details.authenticity_breakdown.detected_issues.length > 0 && (
                          <div>
                            <span className="font-medium">Issues Detected:</span>
                            <ul className="list-disc list-inside mt-1 text-gray-600">
                              {resume.ranking_score.scoring_details.authenticity_breakdown.detected_issues.map((issue: string, index: number) => (
                                <li key={index}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations for Improvement */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Recommendations for Score Improvement</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {resume.ranking_score.component_scores.skills < 50 && (
                    <li>• Add more relevant technical skills and certifications</li>
                  )}
                  {resume.ranking_score.component_scores.experience < 50 && (
                    <li>• Highlight more years of relevant experience and senior positions</li>
                  )}
                  {resume.ranking_score.component_scores.education < 50 && (
                    <li>• Include higher education degrees or relevant certifications</li>
                  )}
                  {resume.ranking_score.component_scores.authenticity < 80 && (
                    <li>• Provide more specific details and examples in experience descriptions</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Fraud Analysis */}
          {resume.fraud_analysis?.detected_issues?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
                Fraud Detection Results
              </h3>
              <div className="space-y-3">
                {resume.fraud_analysis.detected_issues.map((issue: string, index: number) => (
                  <div key={index} className="flex items-start bg-red-50 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-800">{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education & Certifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Education
              </h3>
              <div className="space-y-2">
                {resume.parsed_data?.education?.degrees && resume.parsed_data.education.degrees.length > 0 ? (
                  resume.parsed_data.education.degrees.map((degree: any, index: number) => (
                    <div key={index} className="text-sm text-gray-700 capitalize">
                      {typeof degree === 'string' ? degree : `${degree.degree} ${degree.field ? `in ${degree.field}` : ''} ${degree.institution ? `from ${degree.institution}` : ''}`}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No education information found</p>
                )}
                {resume.parsed_data?.education?.gpa && (
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">GPA:</span> {resume.parsed_data.education.gpa}
                  </p>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
              <div className="space-y-2">
                {resume.parsed_data?.certifications?.length > 0 ? (
                  resume.parsed_data.certifications.map((cert: string, index: number) => (
                    <div key={index} className="text-sm text-gray-700">
                      {cert}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No certifications found</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {resume.parsed_data?.summary && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {resume.parsed_data.summary}
              </p>
            </div>
          )}

          {/* AI Insights */}
          {resume.ai_insights && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
              
              {/* Hiring Recommendation */}
              {resume.ai_insights.hiring_recommendation && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">AI Hiring Recommendation</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        resume.ai_insights.hiring_recommendation.decision === 'strong_hire' ? 'bg-green-100 text-green-800' :
                        resume.ai_insights.hiring_recommendation.decision === 'hire' ? 'bg-blue-100 text-blue-800' :
                        resume.ai_insights.hiring_recommendation.decision === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {resume.ai_insights.hiring_recommendation.decision?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        Confidence: {resume.ai_insights.hiring_recommendation.confidence}/10
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{resume.ai_insights.hiring_recommendation.reasoning}</p>
                  </div>
                </div>
              )}

              {/* Strengths and Weaknesses */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {resume.ai_insights.strengths && resume.ai_insights.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {resume.ai_insights.strengths.map((strength: string, index: number) => (
                        <li key={index} className="text-sm text-green-600 flex items-start">
                          <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {resume.ai_insights.weaknesses && resume.ai_insights.weaknesses.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Areas for Improvement</h4>
                    <ul className="space-y-1">
                      {resume.ai_insights.weaknesses.map((weakness: string, index: number) => (
                        <li key={index} className="text-sm text-red-600 flex items-start">
                          <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          {weakness}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Skill Assessment */}
              {resume.ai_insights.skill_assessment && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Skill Assessment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technical Skills</span>
                        <span className="font-medium">{resume.ai_insights.skill_assessment.technical_skills_rating}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(resume.ai_insights.skill_assessment.technical_skills_rating / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Experience Relevance</span>
                        <span className="font-medium">{resume.ai_insights.skill_assessment.experience_relevance}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(resume.ai_insights.skill_assessment.experience_relevance / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  {resume.ai_insights.skill_assessment.skill_depth_analysis && (
                    <p className="text-sm text-gray-600 mt-3">{resume.ai_insights.skill_assessment.skill_depth_analysis}</p>
                  )}
                </div>
              )}

              {/* Interview Focus Areas */}
              {resume.ai_insights.interview_focus_areas && resume.ai_insights.interview_focus_areas.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Interview Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {resume.ai_insights.interview_focus_areas.map((area: string, index: number) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interview Questions */}
          {resume.interview_questions && resume.interview_questions.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Generated Interview Questions</h3>
              <div className="space-y-3">
                {resume.interview_questions.map((question: string, index: number) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{index + 1}.</span> {question}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NEW: Debug Modal */}
      {showDebugModal && debugData && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowDebugModal(false)} />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    🐛 Skill Extraction Debug: {debugData.filename}
                  </h3>
                  <button
                    onClick={() => setShowDebugModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-6">
                    {/* File Status */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">File Information</h4>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">File exists:</span> {debugData.file_exists ? '✅ Yes' : '❌ No'}</p>
                        <p><span className="font-medium">Raw text length:</span> {debugData.raw_text_length || 0} characters</p>
                      </div>
                    </div>

                    {/* Raw Text Preview */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Raw Text Preview</h4>
                      <div className="text-sm bg-white p-3 rounded border max-h-32 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-xs">
                          {debugData.raw_text_preview || 'No text available'}
                        </pre>
                      </div>
                    </div>

                    {/* Skills Found */}
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Skills Found ({debugData.skill_extraction_debug?.total_skills_found || 0})
                      </h4>
                      {debugData.skill_extraction_debug?.all_found_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {debugData.skill_extraction_debug.all_found_skills.map((skill: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No skills detected by traditional parser</p>
                      )}
                    </div>

                    {/* Stored Skills Comparison */}
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Stored Skills (AI + Traditional)</h4>
                      {debugData.stored_skills?.all_skills?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {debugData.stored_skills.all_skills.map((skill: string, index: number) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No stored skills found</p>
                      )}
                    </div>

                    {/* Detailed Skill Analysis by Category */}
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Detailed Analysis by Category</h4>
                      <div className="space-y-3">
                        {Object.entries(debugData.skill_extraction_debug?.skill_matches || {}).map(([category, skills]: [string, any]) => (
                          <div key={category} className="bg-white p-3 rounded border">
                            <h5 className="font-medium text-sm capitalize mb-2">{category.replace('_', ' ')}</h5>
                            <div className="flex flex-wrap gap-1">
                              {skills.map((skill: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Debugging Tips */}
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">🔍 Debugging Tips</h4>
                      <div className="text-sm space-y-2">
                        <p><strong>If skills are missing:</strong></p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>Check if skills are written differently in the resume (e.g., "Node.js" vs "NodeJS")</li>
                          <li>Verify the raw text was extracted properly from the PDF/DOCX</li>
                          <li>Look for formatting issues or special characters around skill names</li>
                          <li>Some skills might be detected by AI but not traditional parsing</li>
                        </ul>
                        <p><strong>Solutions:</strong></p>
                        <ul className="list-disc list-inside space-y-1 text-gray-600">
                          <li>Re-upload the resume with better formatting</li>
                          <li>Use a different file format (PDF vs DOCX)</li>
                          <li>Manually check the AI-detected skills in the "AI Insights" section</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 