'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Search, 
  Sparkles, 
  Filter, 
  X, 
  Clock, 
  User, 
  Code, 
  MapPin, 
  GraduationCap,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../lib/api';

interface SearchFilters {
  min_experience?: number;
  max_experience?: number;
  required_skills?: string[];
  programming_languages?: string[];
  frameworks?: string[];
  job_titles?: string[];
  education_level?: string;
  location?: string;
  salary_range?: string;
}

interface CandidateData {
  id: string;
  filename: string;
  upload_date: string;
  parsed_data: Record<string, any>;
  ranking_score?: Record<string, any>;
  fraud_analysis?: Record<string, any>;
  ai_insights?: Record<string, any>;
}

interface SearchResult {
  query: string;
  filters_applied: SearchFilters;
  results: CandidateData[];
  total_results: number;
}

interface SmartSearchProps {
  onResults: (results: SearchResult) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
}

interface SmartSearchState {
  query: string;
  isExpanded: boolean;
  manualFilters: SearchFilters;
  suggestions: string[];
  showSuggestions: boolean;
}

export default function SmartSearch({ onResults, onFiltersChange }: SmartSearchProps) {
  // Better state management for React DevTools
  const [searchState, setSearchState] = useState<SmartSearchState>({
    query: '',
    isExpanded: false,
    manualFilters: {},
    suggestions: [],
    showSuggestions: false
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Predefined search suggestions - memoized for performance
  const searchSuggestions = useMemo(() => [
    "Find Python developers with 3+ years experience",
    "Senior React engineers in San Francisco",
    "Full stack developers with Django experience",
    "JavaScript developers with Node.js skills",
    "Data scientists with machine learning experience",
    "Frontend developers with React and TypeScript",
    "Backend engineers with 5+ years experience",
    "DevOps engineers with AWS experience",
    "Mobile developers with React Native skills",
    "UI/UX designers with Figma experience"
  ], []);

  // Smart search mutation with better error handling
  const searchMutation = useMutation({
    mutationFn: async (searchData: { query: string; filters: SearchFilters }) => {
      console.log('Performing search with data:', searchData); // Debug log
      const response = await api.post('/api/candidates/search', searchData);
      console.log('Search response:', response.data); // Debug log
      return response.data;
    },
    onSuccess: (data: SearchResult) => {
      console.log('Search successful, calling onResults:', data); // Debug log
      onResults(data);
      setSearchState(prev => ({ ...prev, showSuggestions: false }));
    },
    onError: (error) => {
      console.error('Search failed:', error); // Debug log
    }
  });

  // Memoized handlers
  const handleSearch = useCallback(() => {
    const { query, manualFilters } = searchState;
    if (!query.trim() && Object.keys(manualFilters).length === 0) {
      return;
    }

    const searchData = {
      query: query.trim(),
      filters: manualFilters
    };

    console.log('Initiating search:', searchData); // Debug log
    searchMutation.mutate(searchData);
  }, [searchState, searchMutation]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchState(prev => ({
      ...prev,
      query: suggestion,
      showSuggestions: false
    }));
    
    // Auto-search when suggestion is clicked
    setTimeout(() => {
      searchMutation.mutate({
        query: suggestion,
        filters: searchState.manualFilters
      });
    }, 100);
  }, [searchMutation, searchState.manualFilters]);

  const updateManualFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setSearchState(prev => {
      const newFilters = { ...prev.manualFilters, [key]: value };
      onFiltersChange?.(newFilters);
      return {
        ...prev,
        manualFilters: newFilters
      };
    });
  }, [onFiltersChange]);

  const removeFilter = useCallback((key: keyof SearchFilters) => {
    setSearchState(prev => {
      const newFilters = { ...prev.manualFilters };
      delete newFilters[key];
      onFiltersChange?.(newFilters);
      return {
        ...prev,
        manualFilters: newFilters
      };
    });
  }, [onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      manualFilters: {},
      query: ''
    }));
    onFiltersChange?.({});
  }, [onFiltersChange]);

  // Update query handler
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchState(prev => ({ ...prev, query: newQuery }));
  }, []);

  // Toggle expanded handler
  const toggleExpanded = useCallback(() => {
    setSearchState(prev => ({ ...prev, isExpanded: !prev.isExpanded }));
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    if (searchState.query.length > 2) {
      setSearchState(prev => ({ ...prev, showSuggestions: true }));
    }
  }, [searchState.query.length]);

  // Destructure state for cleaner access
  const { query, isExpanded, manualFilters, suggestions, showSuggestions } = searchState;

  // Filter suggestions based on query
  useEffect(() => {
    if (query.length > 2) {
      const filtered = searchSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      );
      setSearchState(prev => ({ 
        ...prev, 
        suggestions: filtered.slice(0, 5),
        showSuggestions: true
      }));
    } else {
      setSearchState(prev => ({ 
        ...prev, 
        suggestions: [],
        showSuggestions: false
      }));
    }
  }, [query, searchSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setSearchState(prev => ({ ...prev, showSuggestions: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeFiltersCount = Object.keys(manualFilters).length;

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative" ref={searchInputRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Sparkles className="h-5 w-5 text-blue-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            placeholder="Try: 'Find Python developers with 3+ years' or 'Senior React engineers in NYC'"
            className="block w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button
              onClick={toggleExpanded}
              className="p-2 text-gray-400 hover:text-gray-600 mr-1"
              title="Advanced Filters"
            >
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            <button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {searchMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Smart suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <Search className="h-3 w-3 text-gray-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Advanced Filters
            </h3>
            <button
              onClick={toggleExpanded}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Experience Range */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Clock className="inline h-3 w-3 mr-1" />
                Experience (years)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={manualFilters.min_experience || ''}
                  onChange={(e) => updateManualFilter('min_experience', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={manualFilters.max_experience || ''}
                  onChange={(e) => updateManualFilter('max_experience', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Programming Languages */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Code className="inline h-3 w-3 mr-1" />
                Programming Languages
              </label>
              <input
                type="text"
                placeholder="e.g., Python, JavaScript, Java"
                value={manualFilters.programming_languages?.join(', ') || ''}
                onChange={(e) => updateManualFilter('programming_languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <MapPin className="inline h-3 w-3 mr-1" />
                Location
              </label>
              <input
                type="text"
                placeholder="e.g., San Francisco, Remote"
                value={manualFilters.location || ''}
                onChange={(e) => updateManualFilter('location', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Education Level */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <GraduationCap className="inline h-3 w-3 mr-1" />
                Education Level
              </label>
              <select
                value={manualFilters.education_level || ''}
                onChange={(e) => updateManualFilter('education_level', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="High School">High School</option>
                <option value="Associate">Associate's</option>
                <option value="Bachelor">Bachelor's</option>
                <option value="Master">Master's</option>
                <option value="PhD">PhD</option>
              </select>
            </div>

            {/* Job Titles */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <User className="inline h-3 w-3 mr-1" />
                Job Titles
              </label>
              <input
                type="text"
                placeholder="e.g., Senior Engineer, Developer"
                value={manualFilters.job_titles?.join(', ') || ''}
                onChange={(e) => updateManualFilter('job_titles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Frameworks */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Code className="inline h-3 w-3 mr-1" />
                Frameworks/Libraries
              </label>
              <input
                type="text"
                placeholder="e.g., React, Django, Spring"
                value={manualFilters.frameworks?.join(', ') || ''}
                onChange={(e) => updateManualFilter('frameworks', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Active Filters:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(manualFilters).map(([key, value]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;
                  
                  const displayValue = Array.isArray(value) ? value.join(', ') : value.toString();
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {key.replace(/_/g, ' ')}: {displayValue}
                      <button
                        onClick={() => removeFilter(key as keyof SearchFilters)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Status */}
      {searchMutation.isPending && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">AI is analyzing your search...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Add display name for React DevTools
SmartSearch.displayName = 'SmartSearch'; 