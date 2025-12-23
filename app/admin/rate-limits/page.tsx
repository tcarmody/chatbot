'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { SkeletonTable } from '@/app/components/Skeleton';
import {
  RefreshCw,
  LogOut,
  Info,
  Shield,
  AlertTriangle,
  Clock,
  Ban,
  Key,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface RateLimitStats {
  totalEvents: number;
  byType: { type: string; count: number }[];
  topIdentifiers: { identifier: string; type: string; count: number }[];
  recentEvents: Array<{
    identifier: string;
    identifierType: string;
    eventType: string;
    details: Record<string, unknown>;
    createdAt: string;
  }>;
}

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'support';
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  rate_limit_exceeded: {
    label: 'Rate Limit',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-800',
  },
  token_budget_exceeded: {
    label: 'Token Budget',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
  },
  conversation_limit: {
    label: 'Conversation',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
  },
  abuse_threshold: {
    label: 'Abuse Detected',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-red-100 text-red-800',
  },
  invalid_api_key: {
    label: 'Invalid Key',
    icon: <Key className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800',
  },
};

export default function RateLimitsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [timeRange, currentUser]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setCurrentUser(data.user);
      fetchStats();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/rate-limits?hours=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching rate limit stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPE_CONFIG[type] || {
      label: type,
      icon: <Ban className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-800',
    };
  };

  const truncateIdentifier = (id: string) => {
    if (id.length <= 20) return id;
    return id.substring(0, 20) + '...';
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <SkeletonTable rows={4} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="admin" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rate Limits</h1>
            <p className="text-gray-600 mt-1">Monitor blocked requests and rate limit events</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <div className="font-medium text-gray-900">{currentUser.name}</div>
              <div className="text-gray-500">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : formatNumber(stats?.totalEvents || 0)}
                </div>
                <div className="text-sm text-gray-500">Blocked Requests</div>
              </div>
            </div>
          </div>

          {stats?.byType.slice(0, 3).map((item) => {
            const config = getEventTypeConfig(item.type);
            return (
              <div key={item.type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {formatNumber(item.count)}
                    </div>
                    <div className="text-sm text-gray-500">{config.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Time range:</span>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Last hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Offenders */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Top Blocked Identifiers</h2>
            </div>
            {loading ? (
              <div className="p-6">
                <SkeletonTable rows={5} cols={3} />
              </div>
            ) : !stats?.topIdentifiers.length ? (
              <div className="p-8 text-center text-gray-500">
                No blocked requests in this time period
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {stats.topIdentifiers.map((item, index) => (
                  <div key={`${item.identifier}-${index}`} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {truncateIdentifier(item.identifier)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.type === 'api_key' ? 'API Key' : 'IP Address'}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
                      {formatNumber(item.count)} blocks
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Events by Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Events by Type</h2>
            </div>
            {loading ? (
              <div className="p-6">
                <SkeletonTable rows={5} cols={2} />
              </div>
            ) : !stats?.byType.length ? (
              <div className="p-8 text-center text-gray-500">
                No events in this time period
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {stats.byType.map((item) => {
                  const config = getEventTypeConfig(item.type);
                  const percentage = stats.totalEvents > 0 ? (item.count / stats.totalEvents) * 100 : 0;
                  return (
                    <div key={item.type} className="px-6 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                            {config.icon}
                            {config.label}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(item.count)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
          </div>
          {loading ? (
            <div className="p-6">
              <SkeletonTable rows={10} cols={5} />
            </div>
          ) : !stats?.recentEvents.length ? (
            <div className="p-8 text-center text-gray-500">
              No events in this time period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Identifier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentEvents.map((event, index) => {
                    const config = getEventTypeConfig(event.eventType);
                    return (
                      <tr key={`${event.createdAt}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(event.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                            {config.icon}
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">
                            {truncateIdentifier(event.identifier)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {event.identifierType === 'api_key' ? 'API Key' : 'IP'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {event.details && Object.keys(event.details).length > 0 ? (
                            <span className="font-mono text-xs">
                              {Object.entries(event.details).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                About Rate Limits
              </h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li><strong>Rate Limit:</strong> 20 requests per minute per IP/key</li>
                <li><strong>Token Budget:</strong> 50,000 tokens per day per IP/key</li>
                <li><strong>Conversation:</strong> Maximum 30 messages per conversation</li>
                <li><strong>Abuse Detection:</strong> 10 requests in 10 seconds triggers 1-minute cooldown</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
