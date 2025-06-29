'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Building, 
  Calendar, 
  Users, 
  Trash2,
  Eye,
  Edit,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { api } from '../lib/api';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  salary_range: string;
  status: 'active' | 'paused' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
  ai_requirements?: any;
}

interface JobMatch {
  candidate_id: string;
  compatibility_score: number;
  quick_assessment: string;
  top_strengths: string[];
  main_concerns: string[];
  recommendation: string;
}

export default function JobList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [isGeneratingMatches, setIsGeneratingMatches] = useState(false);

  const queryClient = useQueryClient();

  // Fetch jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', searchTerm, selectedDepartment, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('title', searchTerm);
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedStatus) params.append('status', selectedStatus);
      
      const response = await api.get(`/api/jobs?${params.toString()}`);
      return response.data;
    },
  });

  // Delete job mutation
  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => api.delete(`/api/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // Generate matches mutation
  const generateMatchesMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/api/jobs/${jobId}/matches`),
    onSuccess: (data: any) => {
      setJobMatches(data.data.matches);
      setIsGeneratingMatches(false);
    },
  });

  const handleGenerateMatches = async (job: Job) => {
    setSelectedJob(job);
    setIsGeneratingMatches(true);
    setShowMatchModal(true);
    
    try {
      await generateMatchesMutation.mutateAsync(job.id);
    } catch (error) {
      console.error('Error generating matches:', error);
      setIsGeneratingMatches(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Clock className="w-4 h-4" />;
      case 'closed': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const uniqueDepartments: string[] = Array.from(
    new Set(
      jobs
        .map((job: Job) => job.department)
        .filter((dept: string | undefined): dept is string => Boolean(dept))
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
          <p className="text-gray-600">Manage job postings and find the best candidates</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Job
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Departments</option>
            {uniqueDepartments.map((dept: string) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{jobs.length} jobs</span>
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No jobs found. Create your first job posting!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job: Job) => (
            <div key={job.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Job Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      {job.department && (
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {job.department}
                        </div>
                      )}
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                    {job.status}
                  </div>
                </div>

                {/* Job Description Preview */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {job.description.substring(0, 150)}...
                </p>

                {/* Salary Range */}
                {job.salary_range && (
                  <div className="text-sm text-green-600 font-medium mb-4">
                    💰 {job.salary_range}
                  </div>
                )}

                {/* AI Insights */}
                {job.ai_requirements && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">AI Analysis</span>
                    </div>
                    <div className="text-xs text-blue-700">
                      <div>Min Experience: {job.ai_requirements.experience_requirements?.minimum_years || 0} years</div>
                      <div>Level: {job.ai_requirements.experience_requirements?.level || 'Not specified'}</div>
                      <div>Skills: {job.ai_requirements.required_skills?.programming_languages?.slice(0, 3).join(', ') || 'Various'}</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGenerateMatches(job)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                    >
                      <Target className="w-4 h-4" />
                      Find Matches
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm">
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-gray-600 hover:text-gray-800">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(job.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Matches Modal */}
      {showMatchModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                Candidate Matches for "{selectedJob.title}"
              </h2>
              <button
                onClick={() => setShowMatchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {isGeneratingMatches ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">AI is analyzing candidates...</p>
              </div>
            ) : jobMatches.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No candidate matches found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobMatches.map((match) => (
                  <div key={match.candidate_id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-medium">Candidate ID: {match.candidate_id}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            match.compatibility_score >= 80 ? 'bg-green-100 text-green-800' :
                            match.compatibility_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {match.compatibility_score}% Match
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            match.recommendation === 'strong_fit' ? 'bg-green-100 text-green-800' :
                            match.recommendation === 'good_fit' ? 'bg-blue-100 text-blue-800' :
                            match.recommendation === 'potential_fit' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {match.recommendation.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{match.quick_assessment}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-green-800 mb-1">Strengths:</h4>
                        <ul className="text-sm text-green-700 list-disc list-inside">
                          {match.top_strengths.map((strength, idx) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-red-800 mb-1">Concerns:</h4>
                        <ul className="text-sm text-red-700 list-disc list-inside">
                          {match.main_concerns.map((concern, idx) => (
                            <li key={idx}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
          }}
        />
      )}
    </div>
  );
}

// Create Job Modal Component
function CreateJobModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    description: '',
    requirements: '',
    salary_range: '',
    status: 'active',
    created_by: 'system'
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/jobs', data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Create New Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description *
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Requirements *
            </label>
            <textarea
              required
              rows={4}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salary Range
              </label>
              <input
                type="text"
                placeholder="e.g., $80,000 - $120,000"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 