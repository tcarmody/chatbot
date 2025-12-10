'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TicketSearch() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tickets?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        throw new Error('Failed to search tickets');
      }

      const data = await response.json();

      if (data.tickets.length === 0) {
        setError('No tickets found for this email address');
        setLoading(false);
        return;
      }

      // If single ticket, go directly to it
      if (data.tickets.length === 1) {
        router.push(`/tickets/${data.tickets[0].ticket_number}`);
      } else {
        // Multiple tickets - go to list view
        router.push(`/tickets/list?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search tickets');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-2">Check Ticket Status</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter your email to view your support tickets
      </p>

      <form onSubmit={handleSearch} className="space-y-3">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="your@email.com"
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 text-sm"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          {loading ? 'Searching...' : 'Search Tickets'}
        </button>
      </form>
    </div>
  );
}
