'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ArrowUpDown, 
  Filter, 
  Download, 
  Eye, 
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  FileText
} from 'lucide-react'
import { getResumes, exportData, ResumeFilters } from '../lib/api'
import { ResumeDetail } from './ResumeDetail'

interface FilterState {
  name: string
  skills: string[]
  experience_min: number
  experience_max: number
  education: string[]
  location: string
  languages: string[]
  certifications: string[]
  risk_level: string[]
  score_min: number
  score_max: number
  sortBy: keyof CandidateData
  sortOrder: 'asc' | 'desc'
  rankingMode: 'smart' | 'simple'
  smartRankingCriteria: string
}

interface CandidateData {
  id: string
  name: string
  email: string
  phone: string
  location: string
  experience_years: number
  education: string
  skills: string[]
  programming_languages: string[]
  certifications: string[]
  projects_count: number
  total_score: number
  fraud_risk: string
  upload_date: string
  filename: string
  parsed_data: any
}

const COLUMN_CONFIGS = [
  { key: 'name', label: 'Name', width: '200px', sortable: true },
  { key: 'email', label: 'Email', width: '220px', sortable: true },
  { key: 'phone', label: 'Phone', width: '140px', sortable: false },
  { key: 'location', label: 'Location', width: '150px', sortable: true },
  { key: 'experience_years', label: 'Experience', width: '120px', sortable: true },
  { key: 'education', label: 'Education', width: '180px', sortable: true },
  { key: 'programming_languages', label: 'Programming', width: '200px', sortable: false },
  { key: 'skills', label: 'Skills', width: '250px', sortable: false },
  { key: 'certifications', label: 'Certifications', width: '180px', sortable: false },
  { key: 'projects_count', label: 'Projects', width: '100px', sortable: true },
  { key: 'total_score', label: 'Score', width: '100px', sortable: true },
  { key: 'fraud_risk', label: 'Risk', width: '100px', sortable: true },
  { key: 'upload_date', label: 'Uploaded', width: '120px', sortable: true },
]

export function CandidateSpreadsheet() {
  const [selectedResume, setSelectedResume] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMN_CONFIGS.map(col => col.key))
  )
  
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    skills: [],
    experience_min: 0,
    experience_max: 50,
    education: [],
    location: '',
    languages: [],
    certifications: [],
    risk_level: [],
    score_min: 0,
    score_max: 100,
    sortBy: 'total_score',
    sortOrder: 'desc',
    rankingMode: 'smart',
    smartRankingCriteria: 'overall'
  })

  const { data: resumesData, isLoading, error } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => getResumes({}),
    refetchInterval: 30000,
  })

  // Transform resume data for spreadsheet view
  const candidateData: CandidateData[] = useMemo(() => {
    if (!resumesData?.data) return []
    
    return resumesData.data.map((resume: any) => {
      const personalInfo = resume.parsed_data?.personal_info || {}
      const contactInfo = resume.parsed_data?.contact_info || {}
      const experience = resume.parsed_data?.experience || {}
      const education = resume.parsed_data?.education || {}
      const skills = resume.parsed_data?.skills || {}
      const projects = resume.parsed_data?.projects || []
      
      // FIXED: Collect ALL skills from ALL categories
      const getAllSkills = () => {
        const allSkills: string[] = []
        
        // Add skills from all categories
        if (skills.programming_languages) allSkills.push(...skills.programming_languages)
        if (skills.web_technologies) allSkills.push(...skills.web_technologies)
        if (skills.databases) allSkills.push(...skills.databases)
        if (skills.cloud_platforms) allSkills.push(...skills.cloud_platforms)
        if (skills.data_science) allSkills.push(...skills.data_science)
        if (skills.soft_skills) allSkills.push(...skills.soft_skills)
        if (skills.frameworks_libraries) allSkills.push(...skills.frameworks_libraries)
        if (skills.tools_technologies) allSkills.push(...skills.tools_technologies)
        if (skills.technical_skills) allSkills.push(...skills.technical_skills)
        
        // Also include the pre-aggregated all_skills if available
        if (skills.all_skills) allSkills.push(...skills.all_skills)
        
        // Remove duplicates and return
        return Array.from(new Set(allSkills.filter(skill => skill && typeof skill === 'string')))
      }
      
      const allSkills = getAllSkills()
      
      return {
        id: resume.id,
        name: personalInfo.full_name || 'Unknown',
        email: contactInfo.email || 'N/A',
        phone: contactInfo.phone || 'N/A',
        location: contactInfo.location || personalInfo.location || 'N/A',
        experience_years: experience.total_years || experience.years_experience || 0,
        education: education.highest_degree || education.degree || 'N/A',
        skills: allSkills, // NOW includes ALL skill categories
        programming_languages: skills.programming_languages || [],
        certifications: skills.certifications || [],
        projects_count: Array.isArray(projects) ? projects.length : 0,
        total_score: resume.ranking_score?.total_score || 0,
        fraud_risk: resume.fraud_analysis?.risk_level || 'unknown',
        upload_date: new Date(resume.upload_date).toLocaleDateString(),
        filename: resume.filename,
        parsed_data: resume.parsed_data
      }
    })
  }, [resumesData])

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const skills = new Set<string>()
    const education = new Set<string>()
    const languages = new Set<string>()
    const certifications = new Set<string>()
    const riskLevels = new Set<string>()

    candidateData.forEach(candidate => {
      candidate.skills.forEach(skill => skills.add(skill))
      candidate.programming_languages.forEach(lang => languages.add(lang))
      candidate.certifications.forEach(cert => certifications.add(cert))
      if (candidate.education !== 'N/A') education.add(candidate.education)
      riskLevels.add(candidate.fraud_risk)
      
      // ENHANCED: Also add web technologies and frameworks to languages dropdown
      const rawSkills = candidate.parsed_data?.skills || {}
      if (rawSkills.web_technologies) {
        rawSkills.web_technologies.forEach((tech: any) => {
          if (typeof tech === 'string') languages.add(tech)
        })
      }
      if (rawSkills.frameworks_libraries) {
        rawSkills.frameworks_libraries.forEach((framework: any) => {
          if (typeof framework === 'string') languages.add(framework)
        })
      }
    })

    return {
      skills: Array.from(skills).sort(),
      education: Array.from(education).sort(),
      languages: Array.from(languages).sort(),
      certifications: Array.from(certifications).sort(),
      riskLevels: Array.from(riskLevels).sort()
    }
  }, [candidateData])

  // Smart ranking function
  const applySmartRanking = (candidates: CandidateData[], criteria: string) => {
    const rankedCandidates = [...candidates]
    
    switch (criteria) {
      case 'overall':
        // Comprehensive ranking considering multiple factors
        rankedCandidates.sort((a, b) => {
          const scoreA = calculateOverallRank(a)
          const scoreB = calculateOverallRank(b)
          return scoreB - scoreA
        })
        break
      case 'experience':
        rankedCandidates.sort((a, b) => {
          const expA = a.experience_years + (a.projects_count * 0.5)
          const expB = b.experience_years + (b.projects_count * 0.5)
          return expB - expA
        })
        break
      case 'skills':
        rankedCandidates.sort((a, b) => {
          const skillsA = a.skills.length + a.programming_languages.length + a.certifications.length
          const skillsB = b.skills.length + b.programming_languages.length + b.certifications.length
          return skillsB - skillsA
        })
        break
      case 'quality':
        rankedCandidates.sort((a, b) => {
          const qualityA = a.total_score + (a.fraud_risk === 'low' ? 10 : a.fraud_risk === 'medium' ? 0 : -10)
          const qualityB = b.total_score + (b.fraud_risk === 'low' ? 10 : b.fraud_risk === 'medium' ? 0 : -10)
          return qualityB - qualityA
        })
        break
      case 'recent':
        rankedCandidates.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
        break
      default:
        rankedCandidates.sort((a, b) => b.total_score - a.total_score)
    }
    
    return rankedCandidates
  }

  // Calculate overall ranking score
  const calculateOverallRank = (candidate: CandidateData) => {
    let score = candidate.total_score * 0.4 // Base score weight
    score += candidate.experience_years * 3 // Experience weight
    score += (candidate.skills.length + candidate.programming_languages.length) * 1.5 // Skills weight
    score += candidate.projects_count * 2 // Projects weight
    score += candidate.certifications.length * 2.5 // Certifications weight
    
    // Risk penalty
    if (candidate.fraud_risk === 'high') score -= 15
    else if (candidate.fraud_risk === 'medium') score -= 5
    else if (candidate.fraud_risk === 'low') score += 5
    
    return score
  }

  // Apply filters and search
  const filteredData = useMemo(() => {
    let filtered = candidateData

    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchLower) ||
        candidate.email.toLowerCase().includes(searchLower) ||
        candidate.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        candidate.programming_languages.some(lang => lang.toLowerCase().includes(searchLower))
      )
    }

    // DEBUGGING: Log skills for each candidate when filtering by skills
    if (filters.skills.length > 0) {
      console.log('🔍 SKILL FILTER DEBUG:', {
        filteringFor: filters.skills,
        candidates: candidateData.map(c => ({
          name: c.name,
          allSkills: c.skills,
          programmingLanguages: c.programming_languages,
          rawSkillsCategories: Object.keys(c.parsed_data?.skills || {}),
          skillsInEachCategory: c.parsed_data?.skills
        }))
      })
    }

    // Apply filters
    filtered = filtered.filter(candidate => {
      if (filters.name && !candidate.name.toLowerCase().includes(filters.name.toLowerCase())) return false
      if (filters.experience_min > candidate.experience_years) return false
      if (filters.experience_max < candidate.experience_years) return false
      if (filters.location && !candidate.location.toLowerCase().includes(filters.location.toLowerCase())) return false
      if (filters.score_min > candidate.total_score) return false
      if (filters.score_max < candidate.total_score) return false
      
      if (filters.skills.length > 0) {
        const hasSkill = filters.skills.some(skill => {
          const skillLower = skill.toLowerCase()
          
          // Check in the transformed skills array
          const inSkills = candidate.skills.some(candidateSkill => 
            candidateSkill.toLowerCase().includes(skillLower)
          )
          
          // Check in programming languages
          const inProgrammingLanguages = candidate.programming_languages.some(lang => 
            lang.toLowerCase().includes(skillLower)
          )
          
          // ENHANCED: Also check directly in the raw parsed data for any missed skills
          const rawSkills = candidate.parsed_data?.skills || {}
          const inRawData = Object.values(rawSkills).some(skillCategory => {
            if (Array.isArray(skillCategory)) {
              return skillCategory.some(rawSkill => 
                typeof rawSkill === 'string' && rawSkill.toLowerCase().includes(skillLower)
              )
            }
            return false
          })
          
          // ENHANCED: Also check in the raw text for skills that might be missed by parsers
          const rawText = candidate.parsed_data?.raw_text || ''
          const inRawText = rawText.toLowerCase().includes(skillLower)
          
          // DEBUG LOG for this candidate
          const found = inSkills || inProgrammingLanguages || inRawData || inRawText
          if (filters.skills.includes('HTML') || filters.skills.includes('html')) {
            console.log(`🔍 ${candidate.name} - HTML check:`, {
              skill: skillLower,
              inSkills,
              inProgrammingLanguages,
              inRawData,
              inRawText,
              found,
              candidateSkills: candidate.skills,
              rawSkillsData: rawSkills
            })
          }
          
          return found
        })
        if (!hasSkill) return false
      }

      if (filters.education.length > 0 && !filters.education.includes(candidate.education)) return false
      if (filters.languages.length > 0) {
        const hasLanguage = filters.languages.some(lang => {
          const langLower = lang.toLowerCase()
          
          // Check in programming languages
          const inProgrammingLanguages = candidate.programming_languages.some(candidateLang => 
            candidateLang.toLowerCase().includes(langLower)
          )
          
          // ENHANCED: Also check web technologies (HTML, CSS, etc.)
          const rawSkills = candidate.parsed_data?.skills || {}
          const webTechnologies = rawSkills.web_technologies || []
          const inWebTechnologies = webTechnologies.some((tech: any) => 
            typeof tech === 'string' && tech.toLowerCase().includes(langLower)
          )
          
          // ENHANCED: Also check frameworks/libraries 
          const frameworksLibraries = rawSkills.frameworks_libraries || []
          const inFrameworks = frameworksLibraries.some((framework: any) => 
            typeof framework === 'string' && framework.toLowerCase().includes(langLower)
          )
          
          // ENHANCED: Also check all skills array for broader matching
          const inAllSkills = candidate.skills.some(skill => 
            skill.toLowerCase().includes(langLower)
          )
          
          // DEBUG LOG for languages filter
          const found = inProgrammingLanguages || inWebTechnologies || inFrameworks || inAllSkills
          if (langLower === 'html' || langLower === 'css' || langLower === 'javascript') {
            console.log(`🔍 ${candidate.name} - Language "${lang}" check:`, {
              language: langLower,
              inProgrammingLanguages,
              inWebTechnologies,
              inFrameworks,
              inAllSkills,
              found,
              programmingLanguages: candidate.programming_languages,
              webTechnologies: webTechnologies,
              frameworks: frameworksLibraries,
              allSkills: candidate.skills
            })
          }
          
          return found
        })
        if (!hasLanguage) return false
      }
      if (filters.certifications.length > 0) {
        const hasCert = filters.certifications.some(cert =>
          candidate.certifications.some(candidateCert => candidateCert.toLowerCase().includes(cert.toLowerCase()))
        )
        if (!hasCert) return false
      }
      if (filters.risk_level.length > 0 && !filters.risk_level.includes(candidate.fraud_risk)) return false

      return true
    })

    // Apply smart ranking or simple sorting
    if (filters.rankingMode === 'smart') {
      // Smart ranking based on criteria
      filtered = applySmartRanking(filtered, filters.smartRankingCriteria)
    } else {
      // Simple sorting
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy]
        const bValue = b[filters.sortBy]
        
        let comparison = 0
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue)
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else if (Array.isArray(aValue) && Array.isArray(bValue)) {
          comparison = aValue.length - bValue.length
        }
        
        return filters.sortOrder === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [candidateData, searchTerm, filters])

  const handleSort = (column: keyof CandidateData) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      name: '',
      skills: [],
      experience_min: 0,
      experience_max: 50,
      education: [],
      location: '',
      languages: [],
      certifications: [],
      risk_level: [],
      score_min: 0,
      score_max: 100,
      sortBy: 'total_score',
      sortOrder: 'desc',
      rankingMode: 'smart',
      smartRankingCriteria: 'overall'
    })
    setSearchTerm('')
  }

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey)
      } else {
        newSet.add(columnKey)
      }
      return newSet
    })
  }

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border border-green-200'
      default: return 'bg-gray-100 text-gray-800 border border-gray-200'
    }
  }

  const getScoreClass = (score: number) => {
    if (score >= 80) return 'text-green-600 font-semibold'
    if (score >= 60) return 'text-blue-600 font-medium'
    if (score >= 40) return 'text-yellow-600 font-medium'
    return 'text-red-600 font-medium'
  }

  // NEW: Function to get row styling based on fraud detection
  const getRowClass = (candidate: CandidateData, resume: any) => {
    const fraudAnalysis = resume?.fraud_analysis
    const riskLevel = fraudAnalysis?.risk_level || 'low'
    
    // Base class
    let baseClass = 'hover:bg-gray-50 transition-colors border-b border-gray-100'
    
    // Add fraud-specific styling
    if (riskLevel === 'high') {
      baseClass += ' bg-red-50 border-l-4 border-red-500'
    } else if (riskLevel === 'medium') {
      baseClass += ' bg-yellow-50 border-l-4 border-yellow-500'
    }
    
    // Special highlighting for hidden text fraud
    const detectedIssues = fraudAnalysis?.detected_issues || []
    const hasHiddenText = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('white') || 
      issue.toLowerCase().includes('hidden') ||
      issue.toLowerCase().includes('tiny text') ||
      issue.toLowerCase().includes('invisible')
    )
    
    if (hasHiddenText) {
      baseClass += ' ring-2 ring-red-300 bg-red-100'
    }
    
    return baseClass
  }

  // NEW: Function to get fraud indicators for display
  const getFraudIndicators = (resume: any) => {
    const fraudAnalysis = resume?.fraud_analysis
    const detectedIssues = fraudAnalysis?.detected_issues || []
    const indicators = []
    
    // Check for specific fraud types
    const hasHiddenText = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('white') || 
      issue.toLowerCase().includes('hidden') ||
      issue.toLowerCase().includes('tiny text') ||
      issue.toLowerCase().includes('invisible')
    )
    
    const hasKeywordStuffing = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('keyword') || issue.toLowerCase().includes('stuffing')
    )
    
    const hasSuspiciousFormatting = detectedIssues.some((issue: string) => 
      issue.toLowerCase().includes('formatting') || issue.toLowerCase().includes('font')
    )
    
    if (hasHiddenText) {
      indicators.push({ type: 'hidden_text', label: 'HT', title: 'Hidden Text Detected', color: 'red' })
    }
    if (hasKeywordStuffing) {
      indicators.push({ type: 'keyword_stuffing', label: 'KS', title: 'Keyword Stuffing Detected', color: 'orange' })
    }
    if (hasSuspiciousFormatting) {
      indicators.push({ type: 'formatting', label: 'SF', title: 'Suspicious Formatting Detected', color: 'yellow' })
    }
    
    return indicators
  }

  const exportToCSV = () => {
    const headers = COLUMN_CONFIGS
      .filter(col => visibleColumns.has(col.key))
      .map(col => col.label)
    
    const csvContent = [
      headers.join(','),
      ...filteredData.map(candidate => 
        COLUMN_CONFIGS
          .filter(col => visibleColumns.has(col.key))
          .map(col => {
            const value = candidate[col.key as keyof CandidateData]
            if (Array.isArray(value)) {
              return `"${value.join('; ')}"`
            }
            return `"${value}"`
          })
          .join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidates_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const exportToExcel = async () => {
    try {
      const response = await exportData('excel', {})
      // Handle the export response - this would typically trigger a download
      console.log('Excel export initiated')
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

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
        <p className="text-red-600">Failed to load candidates. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Candidate Database</h2>
          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {filteredData.length} of {candidateData.length} candidates
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="btn-secondary flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Columns
            </button>
            
            {/* Column Selector Dropdown */}
            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Visible Columns</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {COLUMN_CONFIGS.map(column => (
                      <label key={column.key} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(column.key)}
                          onChange={() => toggleColumn(column.key)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{column.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between">
                    <button
                      onClick={() => setVisibleColumns(new Set(COLUMN_CONFIGS.map(col => col.key)))}
                      className="text-xs text-primary-600 hover:text-primary-800"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setVisibleColumns(new Set(['name', 'email', 'experience_years', 'total_score']))}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Reset to Default
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button className="btn-secondary flex items-center group">
              <Download className="w-4 h-4 mr-2" />
              Export
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {/* Export Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1">
                <button
                  onClick={exportToCSV}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Ranking Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">Ranking</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleFilterChange('rankingMode', 'smart')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.rankingMode === 'smart' 
                    ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Smart Ranking
              </button>
              <button
                onClick={() => handleFilterChange('rankingMode', 'simple')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filters.rankingMode === 'simple' 
                    ? 'bg-primary-100 text-primary-700 border border-primary-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Simple Sort
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {filters.rankingMode === 'smart' ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Rank by:</span>
                <select
                  value={filters.smartRankingCriteria}
                  onChange={(e) => handleFilterChange('smartRankingCriteria', e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="overall">🏆 Best Overall Match</option>
                  <option value="experience">👨‍💼 Most Experienced</option>
                  <option value="skills">🛠️ Most Skilled</option>
                  <option value="quality">⭐ Highest Quality</option>
                  <option value="recent">📅 Most Recent</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="total_score">Overall Score</option>
                  <option value="experience_years">Experience</option>
                  <option value="name">Name</option>
                  <option value="upload_date">Upload Date</option>
                  <option value="projects_count">Projects</option>
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="desc">↓ High to Low</option>
                  <option value="asc">↑ Low to High</option>
                </select>
              </div>
            )}
            
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
            >
              Reset All
            </button>
          </div>
        </div>
        
        {/* Ranking Description */}
        {filters.rankingMode === 'smart' && (
          <div className="mt-3 text-sm text-gray-600">
            {filters.smartRankingCriteria === 'overall' && "Candidates ranked by comprehensive score including experience, skills, projects, and quality"}
            {filters.smartRankingCriteria === 'experience' && "Candidates ranked by years of experience and project count"}
            {filters.smartRankingCriteria === 'skills' && "Candidates ranked by technical skills, programming languages, and certifications"}
            {filters.smartRankingCriteria === 'quality' && "Candidates ranked by overall score and fraud risk assessment"}
            {filters.smartRankingCriteria === 'recent' && "Candidates ranked by most recent uploads first"}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search candidates by name, email, skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                placeholder="Filter by name..."
              />
            </div>

            {/* Experience Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.experience_min}
                  onChange={(e) => handleFilterChange('experience_min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  placeholder="Min"
                  min="0"
                />
                <input
                  type="number"
                  value={filters.experience_max}
                  onChange={(e) => handleFilterChange('experience_max', parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>

            {/* Score Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Score Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={filters.score_min}
                  onChange={(e) => handleFilterChange('score_min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  placeholder="Min"
                  min="0"
                  max="100"
                />
                <input
                  type="number"
                  value={filters.score_max}
                  onChange={(e) => handleFilterChange('score_max', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                  placeholder="Max"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                placeholder="Filter by location..."
              />
            </div>

            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <select
                multiple
                value={filters.skills}
                onChange={(e) => handleFilterChange('skills', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                size={3}
              >
                {filterOptions.skills.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            </div>

            {/* Programming Languages Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Programming Languages</label>
              <select
                multiple
                value={filters.languages}
                onChange={(e) => handleFilterChange('languages', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                size={3}
              >
                {filterOptions.languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>

            {/* Education Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
              <select
                multiple
                value={filters.education}
                onChange={(e) => handleFilterChange('education', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                size={3}
              >
                {filterOptions.education.map(edu => (
                  <option key={edu} value={edu}>{edu}</option>
                ))}
              </select>
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select
                multiple
                value={filters.risk_level}
                onChange={(e) => handleFilterChange('risk_level', Array.from(e.target.selectedOptions, option => option.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500"
                size={3}
              >
                {filterOptions.riskLevels.map(risk => (
                  <option key={risk} value={risk}>{risk.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdowns */}
      {(showColumnSelector) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowColumnSelector(false)}
        />
      )}

      {/* Spreadsheet Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {COLUMN_CONFIGS.filter(col => visibleColumns.has(col.key)).map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    style={{ minWidth: column.width }}
                    onClick={() => column.sortable && handleSort(column.key as keyof CandidateData)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                      {filters.sortBy === column.key && filters.rankingMode === 'simple' && (
                        filters.sortOrder === 'asc' ? 
                          <ChevronUp className="w-4 h-4 text-primary-600" /> : 
                          <ChevronDown className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((candidate, index) => {
                const resume = resumesData?.data?.find((r: any) => r.id === candidate.id)
                const fraudIndicators = getFraudIndicators(resume)
                
                return (
                  <tr key={candidate.id} className={getRowClass(candidate, resume)}>
                    {visibleColumns.has('name') && (
                      <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-200">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-xs">
                              {candidate.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                              {candidate.name}
                            </div>
                            {/* NEW: Fraud indicator badges */}
                            {fraudIndicators.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {fraudIndicators.map((indicator, idx) => (
                                  <span 
                                    key={idx}
                                    className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-bold ${
                                      indicator.color === 'red' ? 'bg-red-600 text-white' :
                                      indicator.color === 'orange' ? 'bg-orange-600 text-white' :
                                      'bg-yellow-600 text-white'
                                    }`}
                                    title={indicator.title}
                                  >
                                    🚨{indicator.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('email') && (
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">
                        {candidate.email}
                      </td>
                    )}
                    {visibleColumns.has('phone') && (
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {candidate.phone}
                      </td>
                    )}
                    {visibleColumns.has('location') && (
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate">
                        {candidate.location}
                      </td>
                    )}
                    {visibleColumns.has('experience_years') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">
                        {candidate.experience_years}
                      </td>
                    )}
                    {visibleColumns.has('education') && (
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[160px] truncate">
                        {candidate.education}
                      </td>
                    )}
                    {visibleColumns.has('programming_languages') && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {candidate.programming_languages.slice(0, 3).map((lang, langIndex) => (
                            <span key={langIndex} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {lang}
                            </span>
                          ))}
                          {candidate.programming_languages.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{candidate.programming_languages.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('skills') && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[230px]">
                          {candidate.skills.slice(0, 4).map((skill, skillIndex) => (
                            <span key={skillIndex} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{candidate.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('certifications') && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {candidate.certifications.slice(0, 2).map((cert, certIndex) => (
                            <span key={certIndex} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {cert}
                            </span>
                          ))}
                          {candidate.certifications.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{candidate.certifications.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('projects_count') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-center">
                        {candidate.projects_count}
                      </td>
                    )}
                    {visibleColumns.has('total_score') && (
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${getScoreClass(candidate.total_score)}`}>
                          {Math.round(candidate.total_score)}%
                        </span>
                      </td>
                    )}
                    {visibleColumns.has('fraud_risk') && (
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadgeClass(candidate.fraud_risk)}`}>
                            {candidate.fraud_risk.toUpperCase()}
                          </span>
                                                     {/* NEW: Show fraud issue count */}
                           {resume?.fraud_analysis?.detected_issues?.length > 0 && (
                             <div className="text-xs text-red-600 font-medium">
                               {resume?.fraud_analysis?.detected_issues?.length} issue{resume?.fraud_analysis?.detected_issues?.length > 1 ? 's' : ''}
                             </div>
                           )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('upload_date') && (
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {candidate.upload_date}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedResume(candidate.id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No candidates match your current filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-primary-600 hover:text-primary-800"
            >
              Clear filters to see all candidates
            </button>
          </div>
        )}
      </div>

      {/* Resume Detail Modal */}
      {selectedResume && (
        <ResumeDetail
          resumeId={selectedResume}
          onClose={() => setSelectedResume(null)}
        />
      )}
    </div>
  )
} 