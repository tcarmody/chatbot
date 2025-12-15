'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { SkeletonStats, SkeletonCard } from '@/app/components/Skeleton';
import { RefreshCw, LogOut, MessageSquare, Clock, Coins, Zap, ChevronDown, ChevronUp } from 'lucide-react';

interface AnalyticsSummary {
  totalQueries: number;
  categoryUsage: { category: string; count: number }[];
  queryClusters: { cluster: string; count: number }[];
  avgResponseTime: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens?: number;
  totalCacheReadTokens?: number;
  estimatedCost: {
    input: number;
    cacheCreation?: number;
    cacheRead?: number;
    output: number;
    total: number;
    savings?: number;
  };
}

interface ClusterQuestion {
  message: string;
  timestamp: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [clusterQuestions, setClusterQuestions] = useState<ClusterQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me');

      if (!response.ok) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleClusterClick = async (clusterName: string) => {
    if (expandedCluster === clusterName) {
      setExpandedCluster(null);
      setClusterQuestions([]);
      return;
    }

    setExpandedCluster(clusterName);
    setLoadingQuestions(true);

    try {
      const response = await fetch(`/api/analytics/cluster?cluster=${encodeURIComponent(clusterName)}`);
      if (response.ok) {
        const data = await response.json();
        setClusterQuestions(data.questions);
      }
    } catch (err) {
      console.error('Failed to fetch cluster questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-gray-200 rounded animate-pulse" />
          </div>
          <SkeletonStats count={4} />
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">Error: {error || 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="admin" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with user info and logout */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Chatbot Analytics</h1>
            <p className="text-gray-600 mt-1">Usage insights and performance metrics</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-sm text-right">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-gray-500">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <MessageSquare className="w-4 h-4" />
              Total Queries
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalQueries}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              Avg Response Time
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.avgResponseTime}ms</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Zap className="w-4 h-4" />
              Total Tokens
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {(analytics.totalInputTokens + analytics.totalOutputTokens).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {analytics.totalInputTokens.toLocaleString()} in / {analytics.totalOutputTokens.toLocaleString()} out
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
              <Coins className="w-4 h-4" />
              Estimated Cost
            </div>
            <div className="text-3xl font-bold text-gray-900">
              ${analytics.estimatedCost.total.toFixed(3)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${analytics.estimatedCost.input.toFixed(3)} in / ${analytics.estimatedCost.output.toFixed(3)} out
            </div>
            {analytics.estimatedCost.savings != null && analytics.estimatedCost.savings > 0 && (
              <div className="text-xs text-green-600 mt-1">
                ${analytics.estimatedCost.savings.toFixed(3)} saved from cache
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Category Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Usage</h2>
            <div className="space-y-3">
              {analytics.categoryUsage.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{item.category}</span>
                    <span className="text-sm font-medium text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(item.count / analytics.totalQueries) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Query Clusters */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Question Topics</h2>
            <p className="text-sm text-gray-500 mb-4">Click a topic to view individual questions</p>
            <div className="space-y-3">
              {analytics.queryClusters.map((item, index) => (
                <div key={index}>
                  <button
                    onClick={() => handleClusterClick(item.cluster)}
                    className="w-full text-left"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        {expandedCluster === item.cluster ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                        {item.cluster}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: `${(item.count / analytics.totalQueries) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </button>

                  {/* Expanded questions list */}
                  {expandedCluster === item.cluster && (
                    <div className="mt-2 ml-5 border-l-2 border-indigo-200 pl-3">
                      {loadingQuestions ? (
                        <div className="py-2 text-sm text-gray-500">Loading questions...</div>
                      ) : clusterQuestions.length > 0 ? (
                        <ul className="space-y-2 py-2">
                          {clusterQuestions.map((q, qIndex) => (
                            <li key={qIndex} className="text-sm">
                              <span className="text-gray-700">&quot;{q.message}&quot;</span>
                              <span className="text-gray-400 text-xs ml-2">
                                {formatDate(q.timestamp)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="py-2 text-sm text-gray-500">No questions found</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
