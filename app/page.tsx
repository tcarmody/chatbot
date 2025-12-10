import ChatBot from './components/ChatBot';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Education Co.</h1>
              <p className="text-sm text-gray-600">Learn AI, Transform Your Career</p>
            </div>
            <nav className="flex space-x-6">
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">Courses</a>
              <a href="#" className="text-gray-700 hover:text-blue-600 font-medium">About</a>
              <a href="#" className="text-blue-600 font-medium">Support</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Customer Support</h2>
          <p className="text-lg text-gray-600">
            Ask us anything about our courses, enrollment, or technical support
          </p>
        </div>

        {/* ChatBot Component */}
        <ChatBot />

        {/* Quick Links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Browse Courses</h3>
            <p className="text-sm text-gray-600">Explore our comprehensive AI and ML curriculum</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
            <p className="text-sm text-gray-600">support@aieducation.com</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Community Forum</h3>
            <p className="text-sm text-gray-600">Connect with fellow learners</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600 text-sm">
            © 2024 AI Education Co. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
