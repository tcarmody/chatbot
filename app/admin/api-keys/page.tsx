'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/app/components/Navigation';
import { SkeletonTable } from '@/app/components/Skeleton';
import {
  RefreshCw,
  LogOut,
  Info,
  Plus,
  Trash2,
  X,
  Check,
  Key,
  Copy,
  Ban,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ApiKey {
  id: number;
  keyId: string;
  name: string;
  createdBy: number | null;
  createdByEmail?: string;
  isActive: boolean;
  requestsToday: number;
  tokensToday: number;
  lastUsedAt: string | null;
  createdAt: string;
}

interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'support';
}

export default function ApiKeysPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<{ keyId: string; fullKey: string } | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [keyName, setKeyName] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/auth/me');
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setCurrentUser(data.user);

      // Only admins can access this page
      if (data.user.role !== 'admin') {
        router.push('/admin/sessions');
        return;
      }

      fetchApiKeys();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    }
  };

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/admin/sessions');
          return;
        }
        throw new Error('Failed to fetch API keys');
      }

      const data = await response.json();
      setApiKeys(data.keys);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setActionLoading(true);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key');
      }

      // Show the new key to the user
      setNewKey({ keyId: data.keyId, fullKey: data.fullKey });
      setShowCreateModal(false);
      setShowKeyModal(true);
      setKeyName('');
      fetchApiKeys();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Are you sure you want to revoke "${keyName}"? This cannot be undone.`)) {
      return;
    }

    setError(null);
    setActionLoading(true);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke API key');
      }

      setSuccess('API key revoked successfully');
      fetchApiKeys();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke API key');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Permanently delete "${keyName}"? This will remove all history.`)) {
      return;
    }

    setError(null);
    setActionLoading(true);

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete API key');
      }

      setSuccess('API key deleted successfully');
      fetchApiKeys();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete API key');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error && !showCreateModal) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, showCreateModal]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation variant="admin" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <SkeletonTable rows={4} cols={6} />
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
            <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
            <p className="text-gray-600 mt-1">Manage API keys for widget embedding and external access</p>
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

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <Check className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && !showCreateModal && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <X className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* API Keys Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                API Keys ({apiKeys.filter(k => k.isActive).length} active)
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchApiKeys}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setKeyName('');
                    setError(null);
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Key
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <Key className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p>No API keys created yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first API key to enable external widget access</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Today
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className={`hover:bg-gray-50 ${!key.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <Key className="w-4 h-4 text-gray-400" />
                            {key.name}
                          </div>
                          <div className="text-sm text-gray-500 font-mono">
                            {key.keyId}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          key.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{formatNumber(key.requestsToday)} requests</div>
                        <div className="text-xs text-gray-400">{formatNumber(key.tokensToday)} tokens</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(key.lastUsedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{formatDate(key.createdAt)}</div>
                        {key.createdByEmail && (
                          <div className="text-xs text-gray-400">by {key.createdByEmail}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {key.isActive && (
                            <button
                              onClick={() => handleRevokeKey(key.keyId, key.name)}
                              disabled={actionLoading}
                              className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                              title="Revoke key"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(key.keyId, key.name)}
                            disabled={actionLoading}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Delete key permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                About API Keys
              </h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li>API keys are used to authenticate external widget integrations</li>
                <li>Pass the key in the <code className="bg-blue-100 px-1 rounded">X-API-Key</code> header</li>
                <li>Each key has its own rate limits and usage tracking</li>
                <li>Revoked keys immediately stop working</li>
                <li>The full key is only shown once when created - save it securely</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create API Key</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateKey}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    maxLength={100}
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Production Widget, Development"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A friendly name to identify this key
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Show New Key Modal */}
      {showKeyModal && newKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">API Key Created</h3>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setNewKey(null);
                  setKeyVisible(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium">
                  Save this key now - it will not be shown again!
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your API Key
                </label>
                <div className="relative">
                  <input
                    type={keyVisible ? 'text' : 'password'}
                    readOnly
                    value={newKey.fullKey}
                    className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setKeyVisible(!keyVisible)}
                      className="p-1.5 text-gray-500 hover:text-gray-700"
                      title={keyVisible ? 'Hide' : 'Show'}
                    >
                      {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newKey.fullKey)}
                      className="p-1.5 text-gray-500 hover:text-gray-700"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Usage:</p>
                <code className="block bg-gray-100 p-2 rounded text-xs">
                  curl -H &quot;X-API-Key: {newKey.keyId}...&quot; \<br />
                  &nbsp;&nbsp;-H &quot;Content-Type: application/json&quot; \<br />
                  &nbsp;&nbsp;-d &#39;&#123;&quot;message&quot;: &quot;Hello&quot;&#125;&#39; \<br />
                  &nbsp;&nbsp;https://your-domain.com/api/chat
                </code>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setNewKey(null);
                  setKeyVisible(false);
                  setSuccess('API key created successfully');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
