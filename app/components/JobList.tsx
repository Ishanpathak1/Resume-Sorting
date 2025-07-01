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
  candidate_name?: string;
  candidate_email?: string;
  candidate_experience?: number;
}

interface CandidateDetails {
  id: string;
  parsed_data: {
    personal_info: {
      full_name?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
    experience: {
      total_years?: number;
      current_position?: string;
    };
    skills: any;
  };
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
  const [candidateDetails, setCandidateDetails] = useState<{ [key: string]: CandidateDetails }>({});

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
    onSuccess: async (data: any) => {
      const matches = data.data.matches;
      setJobMatches(matches);
      
      // Fetch candidate details for matches that don't have names
      const candidatesNeedingDetails = matches.filter(
        (match: JobMatch) => !match.candidate_name || match.candidate_name.startsWith('Candidate ')
      );
      
      if (candidatesNeedingDetails.length > 0) {
        const detailsPromises = candidatesNeedingDetails.map(async (match: JobMatch) => {
          try {
            const response = await api.get(`/api/resume/${match.candidate_id}`);
            return { id: match.candidate_id, data: response.data };
          } catch (error) {
            console.error(`Failed to fetch details for candidate ${match.candidate_id}`);
            return null;
          }
        });
        
        const results = await Promise.all(detailsPromises);
        const newCandidateDetails: { [key: string]: CandidateDetails } = {};
        
        results.forEach(result => {
          if (result) {
            newCandidateDetails[result.id] = result.data;
          }
        });
        
        setCandidateDetails(newCandidateDetails);
      }
      
      setIsGeneratingMatches(false);
    },
  });

  const handleGenerateMatches = async (job: Job) => {
    setSelectedJob(job);
    setIsGeneratingMatches(true);
    setShowMatchModal(true);
    setCandidateDetails({});
    
    try {
      await generateMatchesMutation.mutateAsync(job.id);
    } catch (error) {
      console.error('Error generating matches:', error);
      setIsGeneratingMatches(false);
    }
  };

  const getCandidateName = (match: JobMatch): string => {
    // Use candidate_name from match response if available
    if (match.candidate_name && !match.candidate_name.startsWith('C') && !match.candidate_name.startsWith('Candidate ')) {
      return match.candidate_name;
    }
    
    const details = candidateDetails[match.candidate_id];
    if (details?.parsed_data?.personal_info?.full_name) {
      return details.parsed_data.personal_info.full_name;
    }
    
    return match.candidate_name || `Candidate ${match.candidate_id.slice(0, 8)}`;
  };

  const getCandidateInfo = (match: JobMatch) => {
    const details = candidateDetails[match.candidate_id];
    const personalInfo = details?.parsed_data?.personal_info || {};
    const experienceInfo = details?.parsed_data?.experience || {};
    
    return {
      name: getCandidateName(match),
      email: personalInfo.email || 'N/A',
      phone: personalInfo.phone || 'N/A',
      location: personalInfo.location || 'N/A',
      experienceYears: experienceInfo.total_years || 0,
      currentRole: experienceInfo.current_position || 'N/A'
    };
  };

  const handleViewCandidate = (candidateId: string) => {
    // Navigate to candidate detail page
    window.open(`/search?candidate=${candidateId}`, '_blank');
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
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Candidate Matches for "{selectedJob.title}"
              </h2>
              <button
                onClick={() => setShowMatchModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Job Summary and Match Statistics */}
            {!isGeneratingMatches && jobMatches.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{jobMatches.length}</div>
                    <div className="text-sm text-gray-600">Total Candidates</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {jobMatches.filter(m => m.compatibility_score >= 70).length}
                    </div>
                    <div className="text-sm text-gray-600">High Match (70%+)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {jobMatches.filter(m => m.recommendation === 'excellent_fit' || m.recommendation === 'good_fit').length}
                    </div>
                    <div className="text-sm text-gray-600">Recommended</div>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Department:</span> {selectedJob.department} | 
                    <span className="font-medium ml-2">Location:</span> {selectedJob.location} | 
                    <span className="font-medium ml-2">Salary:</span> {selectedJob.salary_range || 'Not specified'}
                  </p>
                </div>
              </div>
            )}

            {isGeneratingMatches ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">AI is analyzing candidates...</p>
                <p className="mt-2 text-sm text-gray-500">This may take a few moments</p>
              </div>
            ) : jobMatches.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No candidate matches found.</p>
                <p className="text-sm text-gray-400 mt-2">Try adjusting the job requirements or adding more candidates to your database.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobMatches.map((match) => {
                  const candidateInfo = getCandidateInfo(match);
                  return (
                    <div key={match.candidate_id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {candidateInfo.name}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              match.compatibility_score >= 80 ? 'bg-green-100 text-green-800' :
                              match.compatibility_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {match.compatibility_score}% Match
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              match.recommendation === 'excellent_fit' ? 'bg-green-100 text-green-800' :
                              match.recommendation === 'good_fit' ? 'bg-blue-100 text-blue-800' :
                              match.recommendation === 'potential_fit' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {match.recommendation.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Email:</span>
                              <p className="truncate">{candidateInfo.email}</p>
                            </div>
                            <div>
                              <span className="font-medium">Experience:</span>
                              <p>{candidateInfo.experienceYears} years</p>
                            </div>
                            <div>
                              <span className="font-medium">Location:</span>
                              <p className="truncate">{candidateInfo.location}</p>
                            </div>
                            <div>
                              <span className="font-medium">Current Role:</span>
                              <p className="truncate">{candidateInfo.currentRole}</p>
                            </div>
                          </div>
                          
                          <p className="text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">
                            {match.quick_assessment}
                          </p>
                        </div>
                        
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => handleViewCandidate(match.candidate_id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            View Profile
                          </button>
                          <a
                            href={`mailto:${candidateInfo.email}`}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm text-center"
                          >
                            Contact
                          </a>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Key Strengths
                          </h4>
                          <ul className="space-y-1">
                            {match.top_strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm text-green-700 flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Areas of Concern
                          </h4>
                          <ul className="space-y-1">
                            {match.main_concerns.map((concern, idx) => (
                              <li key={idx} className="text-sm text-orange-700 flex items-start">
                                <span className="text-orange-500 mr-2">•</span>
                                {concern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
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