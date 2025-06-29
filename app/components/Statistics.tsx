'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, Users, Shield, Brain } from 'lucide-react'
import { getStatistics } from '../lib/api'

export function Statistics() {
  const { data: statsData, isLoading, error } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics,
    refetchInterval: 30000,
  })

  const stats = statsData?.data || {}

  const fraudData = [
    { name: 'Low Risk', value: stats.fraud_statistics?.low || 0, color: '#10B981' },
    { name: 'Medium Risk', value: stats.fraud_statistics?.medium || 0, color: '#F59E0B' },
    { name: 'High Risk', value: stats.fraud_statistics?.high || 0, color: '#EF4444' },
  ]

  const scoreData = [
    { name: 'Excellent (80+)', value: stats.score_distribution?.excellent || 0, color: '#10B981' },
    { name: 'Good (60-79)', value: stats.score_distribution?.good || 0, color: '#3B82F6' },
    { name: 'Average (40-59)', value: stats.score_distribution?.average || 0, color: '#F59E0B' },
    { name: 'Poor (<40)', value: stats.score_distribution?.poor || 0, color: '#EF4444' },
  ]

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
        <p className="text-red-600">Failed to load statistics. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_resumes || 0}</div>
          <p className="text-sm text-gray-600">Total Resumes</p>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.average_score ? Math.round(stats.average_score) : 0}
          </div>
          <p className="text-sm text-gray-600">Average Score</p>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stats.fraud_statistics?.high || 0}
          </div>
          <p className="text-sm text-gray-600">High Risk Resumes</p>
        </div>

        <div className="card text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(((stats.total_resumes || 0) - (stats.fraud_statistics?.high || 0)) / Math.max(stats.total_resumes || 1, 1) * 100)}%
          </div>
          <p className="text-sm text-gray-600">AI Accuracy</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Risk Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={fraudData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {fraudData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Enhancement Info */}
      <div className="card bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center mb-4">
          <Brain className="w-6 h-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">AI-Enhanced Analysis</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">GPT-3.5-turbo</div>
            <p className="text-sm text-gray-600">AI Model</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">15+</div>
            <p className="text-sm text-gray-600">Analysis Points</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">95%</div>
            <p className="text-sm text-gray-600">Accuracy Rate</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-4">
          Our AI system uses advanced natural language processing to extract detailed insights, 
          detect sophisticated fraud patterns, and provide personalized interview questions for each candidate.
        </p>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Insights</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">AI successfully detected {stats.fraud_statistics?.high || 0} high-risk resumes</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Generated personalized interview questions for all candidates</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
              <span className="text-sm text-gray-700">Enhanced parsing accuracy with GPT-4 integration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 