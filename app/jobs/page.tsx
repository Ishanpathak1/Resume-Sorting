'use client';

import { Briefcase, Plus, Search, Filter, Users, TrendingUp } from 'lucide-react'
import JobList from '../components/JobList';

export default function JobsPage() {
  return (
    <div className="min-h-full bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">Job Management</h1>
                </div>
                <p className="text-lg text-gray-600 max-w-2xl">
                  Create job postings, analyze requirements, and match candidates with AI-powered insights.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Search className="w-4 h-4 mr-2" />
                  Search Jobs
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Job
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900">Loading...</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">Loading...</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Match Rate</p>
                <p className="text-2xl font-bold text-gray-900">Loading...</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">AI Analysis</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Job List Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">All Jobs</h2>
              <div className="flex items-center space-x-3">
                <select className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>All Departments</option>
                  <option>Engineering</option>
                  <option>Product</option>
                  <option>Design</option>
                  <option>Marketing</option>
                </select>
                <select className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500">
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Draft</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
          </div>
          <JobList />
        </div>
      </div>
    </div>
  );
} 