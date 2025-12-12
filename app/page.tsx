import ChatBot from './components/ChatBot';
import TicketSearch from './components/TicketSearch';
import Navigation from './components/Navigation';
import { TicketPlus, ListTodo, BarChart3, TicketIcon, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navigation variant="public" />

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
          <a href="/tickets/new" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <TicketPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Create Support Ticket</h3>
            </div>
            <p className="text-sm text-gray-600">Need personalized help? Submit a ticket to our team</p>
          </a>
          <a href="/tickets/list" className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                <ListTodo className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">My Tickets</h3>
            </div>
            <p className="text-sm text-gray-600">View all your support tickets</p>
          </a>
        </div>

        {/* Admin & Demo Links */}
        <div className="mt-12">
          <h3 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Demo Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/analytics" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Analytics</h4>
                <p className="text-xs text-gray-500">View chatbot usage metrics</p>
              </div>
            </a>
            <a href="/admin/tickets" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <TicketIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Admin Dashboard</h4>
                <p className="text-xs text-gray-500">Manage support tickets</p>
              </div>
            </a>
            <a href="/admin/sessions" className="bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Active Sessions</h4>
                <p className="text-xs text-gray-500">View active user sessions</p>
              </div>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} AI Education Co. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
