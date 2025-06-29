import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ResumeAI - Smart Hiring Platform',
  description: 'AI-powered resume analysis with fraud detection, candidate ranking, and smart matching. Reduce hiring costs by 85% with intelligent automation.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen antialiased`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            {/* Navigation */}
            <Navbar />
            
            {/* Main content area */}
            <main className="flex-1 bg-gray-50">
              <div className="min-h-full">
                {children}
              </div>
            </main>
            
            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-6">
                  <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                      <p className="text-sm text-gray-600">
                        © 2025 ResumeAI. Built with Next.js and Python.
                      </p>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        <span>System Online</span>
                      </span>
                      <span>Token Usage Optimized</span>
                      <span>85% Cost Reduction Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
          
          {/* Toast notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
              },
              success: {
                style: {
                  background: '#10B981',
                },
              },
              error: {
                style: {
                  background: '#EF4444',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
} 