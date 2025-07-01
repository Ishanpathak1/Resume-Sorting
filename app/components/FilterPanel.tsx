'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { ResumeFilters } from '../lib/api'

interface FilterPanelProps {
  filters: ResumeFilters
  onFiltersChange: (filters: ResumeFilters) => void
}

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState<ResumeFilters>(filters)

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setIsOpen(false)
  }

  const activeFilterCount = Object.keys(filters).filter(key => filters[key as keyof ResumeFilters]).length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center space-x-2"
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Filter Resumes</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Quick Fraud Detection Toggle */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-red-800 mb-1">
                      🚨 Show Only Fraudulent Resumes
                    </label>
                    <p className="text-xs text-red-600">
                      Filter to show only resumes with detected fraud issues
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localFilters.fraud_risk === 'high' || localFilters.fraud_risk === 'medium'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalFilters({ 
                          ...localFilters, 
                          fraud_risk: 'high' // Show high and medium risk
                        })
                      } else {
                        setLocalFilters({ 
                          ...localFilters, 
                          fraud_risk: undefined 
                        })
                      }
                    }}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-red-300 rounded"
                  />
                </div>
              </div>

              {/* Name Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Candidate Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={localFilters.name || ''}
                    onChange={(e) => setLocalFilters({ ...localFilters, name: e.target.value })}
                    placeholder="Search by name..."
                    className="input-field pl-10"
                  />
                </div>
              </div>

              {/* Skills Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills
                </label>
                <input
                  type="text"
                  value={localFilters.skills || ''}
                  onChange={(e) => setLocalFilters({ ...localFilters, skills: e.target.value })}
                  placeholder="e.g., Python, React, AWS..."
                  className="input-field"
                />
              </div>

              {/* Experience Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={localFilters.experience_min || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      experience_min: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="Min"
                    className="input-field"
                    min="0"
                  />
                  <input
                    type="number"
                    value={localFilters.experience_max || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      experience_max: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="Max"
                    className="input-field"
                    min="0"
                  />
                </div>
              </div>

              {/* Score Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={localFilters.min_score || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      min_score: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Min Score"
                    className="input-field"
                    min="0"
                    max="100"
                  />
                  <input
                    type="number"
                    value={localFilters.max_score || ''}
                    onChange={(e) => setLocalFilters({ 
                      ...localFilters, 
                      max_score: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Max Score"
                    className="input-field"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              {/* Enhanced Fraud Risk Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Fraud Risk Level
                </label>
                <select
                  value={localFilters.fraud_risk || ''}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    fraud_risk: e.target.value || undefined 
                  })}
                  className="input-field"
                >
                  <option value="">All Risk Levels</option>
                  <option value="low">✅ Low Risk (Verified)</option>
                  <option value="medium">⚠️ Medium Risk (Caution)</option>
                  <option value="high">🚨 High Risk (Fraudulent)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  High risk includes hidden text, keyword stuffing, and other fraud indicators
                </p>
              </div>

              {/* Education Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education Level
                </label>
                <select
                  value={localFilters.education || ''}
                  onChange={(e) => setLocalFilters({ 
                    ...localFilters, 
                    education: e.target.value || undefined 
                  })}
                  className="input-field"
                >
                  <option value="">All Education Levels</option>
                  <option value="phd">PhD/Doctorate</option>
                  <option value="master">Master's Degree</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="associate">Associate Degree</option>
                  <option value="certificate">Certificate</option>
                </select>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between space-x-2">
              <button
                onClick={handleClearFilters}
                className="btn-secondary text-sm"
              >
                Clear All
              </button>
              <button
                onClick={handleApplyFilters}
                className="btn-primary text-sm"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 