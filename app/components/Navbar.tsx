'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  Home, 
  Upload, 
  FileText, 
  Search, 
  Briefcase, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  Shield,
  Users,
  TrendingUp,
  Table
} from 'lucide-react'

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upload Resume', href: '/?tab=upload', icon: Upload },
    { name: 'Resume Database', href: '/?tab=list', icon: FileText },
    { name: 'Candidate Spreadsheet', href: '/spreadsheet', icon: Table },
    { name: 'Smart Search', href: '/search', icon: Search },
    { name: 'Job Management', href: '/jobs', icon: Briefcase },
    { name: 'Analytics', href: '/?tab=analytics', icon: BarChart3 },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' && !searchParams.get('tab')
    }
    if (href.includes('?tab=')) {
      const tabParam = href.split('?tab=')[1]
      return pathname === '/' && searchParams.get('tab') === tabParam
    }
    return pathname === href
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ResumeAI</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Smart Hiring Platform</p>
              </div>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Stats and user info */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>Active System</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span>85% Cost Savings</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    active
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
          
          {/* Mobile stats */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span>System Active</span>
              </div>
              <div className="flex items-center space-x-2 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>85% Savings</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
} 