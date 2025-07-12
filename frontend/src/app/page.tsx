/**
 * Home page for Reverbia application
 */

import Layout from '@/components/layout/Layout'
import Button from '@/components/ui/Button'

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Transform Conversations Into{' '}
            <span className="text-purple-600">Actionable Intelligence</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Enable anyone to fully engage in important conversations while AI handles 
            recording, understanding, documentation, and follow-up automatically.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            <div className="rounded-md shadow">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
              </Button>
            </div>
            <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                🎤
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Smart Recording</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Automatic transcription with speaker identification
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                🧠
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">AI Understanding</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Context-aware analysis of conversations and documents
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                📄
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Auto Documentation</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Generate SOWs, action plans, and technical specs
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                ⚡
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Instant Queries</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Ask questions about any past conversation
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
