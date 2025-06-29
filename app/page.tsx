'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Upload, FileText, Shield, BarChart3, Search, Filter, TrendingUp, Users, CheckCircle } from 'lucide-react'
import { ResumeUpload } from './components/ResumeUpload'
import { ResumeList } from './components/ResumeList'
import { Statistics } from './components/Statistics'
import { FilterPanel } from './components/FilterPanel'
import { getStatistics } from './lib/api'

export default function HomePage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filters, setFilters] = useState({})

  // Fetch statistics for dashboard
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    refetchInterval: 30000,
  })

  const stats = statsData?.data || {}

  // Handle URL parameters for navigation
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    } else {
      setActiveTab('dashboard')
    }
  }, [searchParams])

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'upload', label: 'Upload Resume', icon: Upload },
    { id: 'list', label: 'Resume Database', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="min-h-full">
      {/* Hero Section - Only show on dashboard */}
      {activeTab === 'dashboard' && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                AI-Powered Resume Analysis
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto mb-8">
                Upload resumes to automatically extract candidate information, detect fraud, 
                and rank candidates based on legitimate skills and experience.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>85% Cost Reduction</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Smart AI Analysis</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Fraud Detection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 stats-card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Resumes</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        stats.total_resumes || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 stats-card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Verified Candidates</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        Math.max(0, (stats.total_resumes || 0) - (stats.fraud_statistics?.high || 0))
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 stats-card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Fraud Detected</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        stats.fraud_statistics?.high || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 stats-card">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                    <p className="text-2xl font-bold text-green-600">85%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Parsing</h3>
                <p className="text-gray-600 mb-4">
                  Automatically extract names, skills, experience, education, and contact information from PDFs and DOCX files.
                </p>
                <button 
                  onClick={() => setActiveTab('upload')}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                >
                  Upload Resume →
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Fraud Detection</h3>
                <p className="text-gray-600 mb-4">
                  Detect white text, keyword stuffing, and other ATS manipulation techniques used to cheat hiring systems.
                </p>
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                >
                  View Analytics →
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Ranking</h3>
                <p className="text-gray-600 mb-4">
                  Rank candidates based on legitimate skills and experience while penalizing fraudulent resumes.
                </p>
                <button 
                  onClick={() => setActiveTab('list')}
                  className="text-green-600 hover:text-green-700 font-medium text-sm transition-colors"
                >
                  View Database →
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
              </div>
              <div className="p-6">
                <Statistics />
              </div>
            </div>
          </div>
        )}

        {/* Tab Content for other sections */}
        {activeTab !== 'dashboard' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.filter(tab => tab.id !== 'dashboard').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'upload' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Upload New Resume
                    </h2>
                    <p className="text-gray-600">
                      Upload a PDF or DOCX file to analyze candidate information with AI-powered extraction and fraud detection.
                    </p>
                  </div>
                  <ResumeUpload onUploadSuccess={() => setActiveTab('list')} />
                </div>
              )}

              {activeTab === 'list' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Resume Database
                      </h2>
                      <p className="text-gray-600">
                        Browse and filter through all analyzed resumes with advanced search capabilities.
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <FilterPanel filters={filters} onFiltersChange={setFilters} />
                    </div>
                  </div>
                  <ResumeList filters={filters} />
                </div>
              )}

              {activeTab === 'analytics' && (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Analytics Dashboard
                    </h2>
                    <p className="text-gray-600">
                      Comprehensive analytics and insights about your resume database and system performance.
                    </p>
                  </div>
                  <Statistics />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 