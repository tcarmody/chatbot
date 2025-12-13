'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  BarChart3,
  Settings,
  Menu,
  X,
  Home,
  Users,
  LogOut,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
}

const publicNavItems: NavItem[] = [
  { label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> },
  { label: 'Support', href: '/', icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'Create Ticket', href: 'https://share.hsforms.com/1EsdrWJXnR5WYr8BdPryuVg3hul4', icon: <ExternalLink className="w-4 h-4" />, external: true },
];

const adminNavItems: NavItem[] = [
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { label: 'Sessions', href: '/admin/sessions', icon: <Users className="w-4 h-4" /> },
];

interface NavigationProps {
  variant?: 'public' | 'admin';
  showAdminLink?: boolean;
}

export default function Navigation({ variant = 'public', showAdminLink = true }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = variant === 'admin' ? adminNavItems : publicNavItems;

  const isActive = (href: string) => {
    if (href === '/' || href.startsWith('http')) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900">AI Education Co.</span>
              {variant === 'admin' && (
                <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  Admin
                </span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )
            ))}

            {/* Admin Link for public nav */}
            {variant === 'public' && showAdminLink && (
              <Link
                href="/admin/sessions"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Admin</span>
              </Link>
            )}

            {/* Back to site for admin nav */}
            {variant === 'admin' && (
              <Link
                href="/"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Admin</span>
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                item.external ? (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              ))}

              {variant === 'public' && showAdminLink && (
                <Link
                  href="/admin/sessions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}

              {variant === 'admin' && (
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Exit Admin</span>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
