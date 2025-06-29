'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, MessageCircle, Search, Users, TrendingUp, Sparkles } from 'lucide-react';
import { getStatistics } from '../lib/api';
import ChatSearch from '../components/ChatSearch';

export default function SearchPage() {
  const [foundCandidates, setFoundCandidates] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);

  // Get statistics for quick stats
  const { data: stats } = useQuery({
    queryKey: ['statistics'],
    queryFn: getStatistics
  });

  const handleCandidatesFound = (candidates: any[]) => {
    setFoundCandidates(candidates);
  };

  const handleComparisonGenerated = (comparisonData: any) => {
    setComparison(comparisonData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  AI Smart Search
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Conversational AI search - ask naturally and get intelligent insights
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-2 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">AI Assistant Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.data?.total_resumes || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Search className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Search Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {foundCandidates.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comparisons Made</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {comparison ? 1 : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">AI Insights</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats?.data?.average_score?.toFixed(0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Search - Takes up most space */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[700px]">
              <ChatSearch 
                onCandidatesFound={handleCandidatesFound}
                onComparisonGenerated={handleComparisonGenerated}
              />
            </div>
          </div>

          {/* Results Sidebar */}
          <div className="space-y-6">
            {/* Recent Results */}
            {foundCandidates.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Latest Results
                </h3>
                <div className="space-y-3">
                  {foundCandidates.slice(0, 5).map((candidate, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">
                            {candidate.name || candidate.filename}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {candidate.experience_years || 0} years exp.
                          </p>
                          {candidate.top_skills && candidate.top_skills.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {candidate.top_skills.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-blue-600">
                            {candidate.total_score || 0}
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            candidate.risk_level === 'low' ? 'bg-green-100 text-green-800' :
                            candidate.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {candidate.risk_level || 'unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {foundCandidates.length > 5 && (
                  <p className="text-sm text-gray-500 mt-3">
                    + {foundCandidates.length - 5} more candidates
                  </p>
                )}
              </div>
            )}

            {/* Comparison Results */}
            {comparison && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Comparison Results
                </h3>
                {comparison.ranking && (
                  <div className="space-y-3">
                    {comparison.ranking.slice(0, 3).map((candidate: any, idx: number) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium text-gray-900 text-sm">
                              #{candidate.rank} {candidate.candidate_name}
                            </span>
                            <p className="text-xs text-gray-600">
                              {candidate.recommendation}
                            </p>
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            {candidate.overall_score}/100
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {comparison.hiring_recommendation && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900">
                      Top Choice: {comparison.hiring_recommendation.top_choice}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {comparison.hiring_recommendation.reasoning}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                How to Use
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Search:</strong> "Find Python developers with 3+ years"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Compare:</strong> "Compare my top 3 candidates"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Analyze:</strong> "What skills are most common?"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Insights:</strong> "Show me market trends"</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">
                  💡 <strong>Tip:</strong> Ask naturally like you're talking to a colleague. The AI understands context and follow-up questions!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 