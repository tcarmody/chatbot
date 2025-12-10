'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Ticket {
  id: number;
  ticket_number: string;
  user_email: string;
  user_name?: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  category?: string;
  created_at: string;
  updated_at: string;
}

export default function TicketViewPage() {
  const params = useParams();
  const ticketNumber = params?.ticketNumber as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ticketNumber) {
      fetchTicket();
    }
  }, [ticketNumber]);

  const fetchTicket = async () => {
    try {
      const response = await fetch(`/api/tickets?ticket_number=${ticketNumber}`);

      if (!response.ok) {
        throw new Error('Ticket not found');
      }

      const data = await response.json();
      setTicket(data.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error || 'Ticket not found'}</div>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Ticket #{ticket.ticket_number}
              </h1>
              <p className="text-gray-600">
                Created {formatDate(ticket.created_at)}
              </p>
            </div>
            <div className="flex space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority.toUpperCase()} PRIORITY
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Contact Info */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.user_name && (
                <div>
                  <div className="text-sm text-gray-600">Name</div>
                  <div className="text-gray-900">{ticket.user_name}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-600">Email</div>
                <div className="text-gray-900">{ticket.user_email}</div>
              </div>
              {ticket.category && (
                <div>
                  <div className="text-sm text-gray-600">Category</div>
                  <div className="text-gray-900">{ticket.category}</div>
                </div>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Subject</h2>
            <p className="text-gray-900">{ticket.subject}</p>
          </div>

          {/* Description */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <div className="text-gray-900 whitespace-pre-wrap">{ticket.description}</div>
          </div>

          {/* Status Message */}
          <div className="p-6 bg-blue-50 border-t border-gray-200">
            <div className="flex items-start space-x-3">
              <svg
                className="w-6 h-6 text-blue-600 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-medium text-gray-900 mb-1">What happens next?</h3>
                <p className="text-sm text-gray-700">
                  Our support team has received your ticket and will review it shortly. You'll receive
                  an email at <span className="font-medium">{ticket.user_email}</span> with updates
                  on your ticket status.
                </p>
                {ticket.status === 'resolved' && (
                  <p className="text-sm text-gray-700 mt-2">
                    This ticket has been marked as resolved. If you need further assistance, please
                    create a new ticket.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center space-x-4">
          <Link
            href="/tickets/new"
            className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Create Another Ticket
          </Link>
          <Link
            href="/"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Chat with Support Bot
          </Link>
        </div>
      </div>
    </div>
  );
}
