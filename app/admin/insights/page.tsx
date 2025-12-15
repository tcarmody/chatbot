'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { SkeletonCard } from '@/app/components/Skeleton';
import {
  RefreshCw,
  LogOut,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface FaqGap {
  id: number;
  user_message: string;
  detected_categories: string[];
  gap_type: 'no_match' | 'partial_match' | 'out_of_scope';
  suggested_topic: string | null;
  created_at: string;
}

interface Feedback {
  id: number;
  message_id: string;
  user_message: string;
  assistant_response: string;
  feedback: 'positive' | 'negative';
  created_at: string;
}

interface GapsData {
  gaps: FaqGap[];
  total: number;
  typeCounts: Record<string, number>;
}

interface FeedbackData {
  feedback: Feedback[];
  total: number;
  typeCounts: Record<string, number>;
}

type TabType = 'gaps' | 'feedback';
type GapFilter = 'all' | 'no_match' | 'partial_match' | 'out_of_scope';
type FeedbackFilter = 'all' | 'positive' | 'negative';

export default function InsightsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('gaps');
  const [gapsData, setGapsData] = useState<GapsData | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [gapFilter, setGapFilter] = useState<GapFilter>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, activeTab, gapFilter, feedbackFilter]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setUser(data.user);
    } catch {
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'gaps') {
        const typeParam = gapFilter !== 'all' ? `&type=${gapFilter}` : '';
        const response = await fetch(`/api/admin/gaps?limit=50${typeParam}`);
        if (!response.ok) throw new Error('Failed to fetch gaps');
        const data = await response.json();
        setGapsData(data);
      } else {
        const typeParam = feedbackFilter !== 'all' ? `&type=${feedbackFilter}` : '';
        const response = await fetch(`/api/admin/feedback?limit=50${typeParam}`);
        if (!response.ok) throw new Error('Failed to fetch feedback');
        const data = await response.json();
        setFeedbackData(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGapTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      no_match: 'bg-red-100 text-red-800',
      partial_match: 'bg-yellow-100 text-yellow-800',
      out_of_scope: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      no_match: 'No Match',
      partial_match: 'Partial',
      out_of_scope: 'Out of Scope',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type] || 'bg-gray-100'}`}>
        {labels[type] || type}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
            <div className="h-4 w-72 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="admin" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality Insights</h1>
            <p className="text-gray-600 mt-1">Review knowledge gaps and user feedback</p>
          </div>
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
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('gaps')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gaps'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Knowledge Gaps
                {gapsData && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {gapsData.total}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'feedback'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4" />
                User Feedback
                {feedbackData && (
                  <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-0.5 rounded-full">
                    {feedbackData.total}
                  </span>
                )}
              </span>
            </button>
          </nav>
        </div>

        {/* Summary Stats */}
        {activeTab === 'gaps' && gapsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Gaps</div>
              <div className="text-2xl font-bold text-gray-900">{gapsData.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">No Match</div>
              <div className="text-2xl font-bold text-red-600">{gapsData.typeCounts.no_match || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Partial Match</div>
              <div className="text-2xl font-bold text-yellow-600">{gapsData.typeCounts.partial_match || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Out of Scope</div>
              <div className="text-2xl font-bold text-gray-600">{gapsData.typeCounts.out_of_scope || 0}</div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && feedbackData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Feedback</div>
              <div className="text-2xl font-bold text-gray-900">{feedbackData.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <ThumbsUp className="w-4 h-4 text-green-500" /> Positive
              </div>
              <div className="text-2xl font-bold text-green-600">{feedbackData.typeCounts.positive || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 flex items-center gap-1">
                <ThumbsDown className="w-4 h-4 text-red-500" /> Negative
              </div>
              <div className="text-2xl font-bold text-red-600">{feedbackData.typeCounts.negative || 0}</div>
            </div>
          </div>
        )}

        {/* Filters and Refresh */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {activeTab === 'gaps' ? (
              <select
                value={gapFilter}
                onChange={e => setGapFilter(e.target.value as GapFilter)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="no_match">No Match</option>
                <option value="partial_match">Partial Match</option>
                <option value="out_of_scope">Out of Scope</option>
              </select>
            ) : (
              <select
                value={feedbackFilter}
                onChange={e => setFeedbackFilter(e.target.value as FeedbackFilter)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Feedback</option>
                <option value="positive">Positive Only</option>
                <option value="negative">Negative Only</option>
              </select>
            )}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        ) : activeTab === 'gaps' && gapsData ? (
          <div className="space-y-3">
            {gapsData.gaps.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No knowledge gaps found
              </div>
            ) : (
              gapsData.gaps.map(gap => (
                <div key={gap.id} className="bg-white rounded-lg shadow">
                  <button
                    onClick={() => toggleExpand(`gap-${gap.id}`)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getGapTypeBadge(gap.gap_type)}
                          <span className="text-xs text-gray-400">{formatDate(gap.created_at)}</span>
                        </div>
                        <p className="text-gray-900 font-medium truncate">{gap.user_message}</p>
                      </div>
                      {expandedItems.has(`gap-${gap.id}`) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  {expandedItems.has(`gap-${gap.id}`) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-3 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">User Question</div>
                          <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{gap.user_message}</p>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Detected Categories</div>
                          <div className="flex flex-wrap gap-1">
                            {gap.detected_categories.map((cat, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                        {gap.suggested_topic && (
                          <div>
                            <div className="text-xs font-medium text-gray-500 uppercase mb-1">Suggested Topic</div>
                            <p className="text-gray-800">{gap.suggested_topic}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'feedback' && feedbackData ? (
          <div className="space-y-3">
            {feedbackData.feedback.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                No feedback found
              </div>
            ) : (
              feedbackData.feedback.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow">
                  <button
                    onClick={() => toggleExpand(`fb-${item.id}`)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.feedback === 'positive' ? (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                              <ThumbsUp className="w-3 h-3" /> Helpful
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                              <ThumbsDown className="w-3 h-3" /> Not Helpful
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                        </div>
                        <p className="text-gray-900 font-medium truncate">{item.user_message}</p>
                      </div>
                      {expandedItems.has(`fb-${item.id}`) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                  {expandedItems.has(`fb-${item.id}`) && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-3 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">User Question</div>
                          <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{item.user_message}</p>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">Assistant Response</div>
                          <p className="text-gray-800 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                            {item.assistant_response}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
