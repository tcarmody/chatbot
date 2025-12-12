'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/app/components/Navigation';
import { AlertCircle, CheckCircle, Send, ArrowLeft } from 'lucide-react';

interface FormErrors {
  user_email?: string;
  subject?: string;
  description?: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    user_name: '',
    user_email: '',
    subject: '',
    description: '',
    priority: 'medium',
    category: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'user_email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        break;
      case 'subject':
        if (!value) return 'Subject is required';
        if (value.length < 5) return 'Subject must be at least 5 characters';
        if (value.length > 100) return 'Subject must be less than 100 characters';
        break;
      case 'description':
        if (!value) return 'Description is required';
        if (value.length < 20) return 'Please provide more details (at least 20 characters)';
        if (value.length > 2000) return 'Description must be less than 2000 characters';
        break;
    }
    return undefined;
  };

  // Validate all fields on change
  useEffect(() => {
    const errors: FormErrors = {};
    if (touched.user_email) {
      const emailError = validateField('user_email', formData.user_email);
      if (emailError) errors.user_email = emailError;
    }
    if (touched.subject) {
      const subjectError = validateField('subject', formData.subject);
      if (subjectError) errors.subject = subjectError;
    }
    if (touched.description) {
      const descError = validateField('description', formData.description);
      if (descError) errors.description = descError;
    }
    setFieldErrors(errors);
  }, [formData, touched]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const isFormValid = () => {
    return (
      formData.user_email &&
      formData.subject &&
      formData.description &&
      !validateField('user_email', formData.user_email) &&
      !validateField('subject', formData.subject) &&
      !validateField('description', formData.description)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all required fields as touched
    setTouched({ user_email: true, subject: true, description: true });

    // Validate all fields
    const errors: FormErrors = {};
    const emailError = validateField('user_email', formData.user_email);
    const subjectError = validateField('subject', formData.subject);
    const descError = validateField('description', formData.description);

    if (emailError) errors.user_email = emailError;
    if (subjectError) errors.subject = subjectError;
    if (descError) errors.description = descError;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create ticket');
      }

      // Redirect to ticket view page
      router.push(`/tickets/${data.ticket_number}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Helper for input styling
  const getInputClassName = (fieldName: keyof FormErrors, hasError: boolean) => {
    const base = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-gray-900 transition-colors';
    if (hasError) {
      return `${base} border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50`;
    }
    if (touched[fieldName] && !fieldErrors[fieldName] && formData[fieldName]) {
      return `${base} border-green-300 focus:ring-green-500 focus:border-green-500`;
    }
    return `${base} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation variant="public" />

      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create Support Ticket</h1>
          <p className="text-gray-600 mt-2">
            Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="user_name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="user_name"
                name="user_name"
                value={formData.user_name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="user_email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="user_email"
                  name="user_email"
                  value={formData.user_email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="john@example.com"
                  className={getInputClassName('user_email', !!fieldErrors.user_email)}
                />
                {touched.user_email && !fieldErrors.user_email && formData.user_email && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {fieldErrors.user_email && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
              </div>
              {fieldErrors.user_email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  {fieldErrors.user_email}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Select a category</option>
                <option value="Certificates & Course Completion">Certificates & Course Completion</option>
                <option value="Account & Profile Management">Account & Profile Management</option>
                <option value="Technical Issues & Course Access">Technical Issues & Course Access</option>
                <option value="Membership Support">Membership Support</option>
                <option value="Billing & Payments">Billing & Payments</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="low">Low - General question</option>
                <option value="medium">Medium - Need help soon</option>
                <option value="high">High - Urgent issue</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  Subject <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs ${formData.subject.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                  {formData.subject.length}/100
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Brief description of your issue"
                  className={getInputClassName('subject', !!fieldErrors.subject)}
                />
                {touched.subject && !fieldErrors.subject && formData.subject && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {fieldErrors.subject && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
              </div>
              {fieldErrors.subject && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  {fieldErrors.subject}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <span className={`text-xs ${formData.description.length > 2000 ? 'text-red-500' : formData.description.length > 1800 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {formData.description.length}/2000
                </span>
              </div>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                rows={6}
                placeholder="Please provide as much detail as possible about your issue..."
                className={`${getInputClassName('description', !!fieldErrors.description)} resize-y`}
              />
              {fieldErrors.description ? (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {fieldErrors.description}
                </p>
              ) : touched.description && formData.description.length >= 20 && (
                <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Great! Your description is detailed enough.
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Required fields
              </p>
              <div className="flex space-x-4">
                <Link
                  href="/"
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Ticket
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need immediate help? Try our{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-700">
              AI chatbot
            </Link>{' '}
            for instant answers.
          </p>
        </div>
      </div>
    </div>
  );
}
