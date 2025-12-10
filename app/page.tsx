import ChatBot from './components/ChatBot';
import TicketSearch from './components/TicketSearch';

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
          <TicketSearch />
          <a href="/tickets/new" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:border-blue-300 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">Create Support Ticket</h3>
            <p className="text-sm text-gray-600">Need personalized help? Submit a ticket to our team</p>
          </a>
          <a href="/tickets/list" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:border-blue-300 transition-colors">
            <h3 className="font-semibold text-gray-900 mb-2">My Tickets</h3>
            <p className="text-sm text-gray-600">View all your support tickets</p>
          </a>
        </div>

        {/* Admin & Demo Links */}
        <div className="mt-8">
          <h3 className="text-center text-sm font-semibold text-gray-700 mb-4">Demo Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/analytics" className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:border-blue-400 transition-colors text-center">
              <h4 className="font-semibold text-blue-900 mb-1">📊 Analytics</h4>
              <p className="text-xs text-blue-700">View chatbot usage metrics</p>
            </a>
            <a href="/admin/tickets" className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:border-purple-400 transition-colors text-center">
              <h4 className="font-semibold text-purple-900 mb-1">🎫 Admin Dashboard</h4>
              <p className="text-xs text-purple-700">Manage support tickets</p>
            </a>
            <a href="/admin/sessions" className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 hover:border-indigo-400 transition-colors text-center">
              <h4 className="font-semibold text-indigo-900 mb-1">👥 Active Sessions</h4>
              <p className="text-xs text-indigo-700">View active user sessions</p>
            </a>
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
