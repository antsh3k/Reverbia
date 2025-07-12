/**
 * Header component for the Reverbia application
 */

import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-purple-600">
              Reverbia
            </Link>
          </div>
          <nav className="hidden md:flex space-x-10">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/meetings" className="text-gray-500 hover:text-gray-900">
              Meetings
            </Link>
            <Link href="/templates" className="text-gray-500 hover:text-gray-900">
              Templates
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
              Sign In
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}