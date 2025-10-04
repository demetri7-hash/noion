'use client';

/**
 * Main Application Layout
 * Full UI with role-based navigation, chat, notifications, and auth
 */

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronDown,
  Home,
  MessageSquare,
  CheckSquare,
  TrendingUp,
  Award,
  UserCircle,
  Briefcase,
  Link as LinkIcon
} from 'lucide-react';
import { UserRole } from '@/models/Restaurant';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  restaurantId: string;
  restaurantName?: string;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // Set mounted state (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load user data (only after component is mounted on client)
  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch full user profile from API
    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const result = await response.json();
        if (result.success && result.data) {
          setUser({
            id: result.data.id,
            email: result.data.email,
            role: result.data.role,
            restaurantId: result.data.restaurantId,
            name: result.data.name,
            restaurantName: result.data.restaurantName
          });

          // Store restaurantId for dashboard
          if (result.data.restaurantId) {
            localStorage.setItem('restaurantId', result.data.restaurantId);
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        router.push('/login');
      }
    };

    fetchUserProfile();
  }, [router, mounted]);

  // Role-based navigation
  const getNavigation = (): NavItem[] => {
    const role = user?.role;

    const baseNav: NavItem[] = [
      {
        name: 'Home',
        href: '/dashboard',
        icon: Home,
      }
    ];

    // Analytics - role-specific
    if (role === 'owner' || role === 'restaurant_owner' || role === 'admin') {
      baseNav.push({
        name: 'Business Analytics',
        href: '/dashboard/owner',
        icon: TrendingUp,
        roles: ['owner', 'admin']
      });
    }

    if (role === 'manager' || role === 'admin' || role === 'owner' || role === 'restaurant_owner') {
      baseNav.push({
        name: 'Team Analytics',
        href: '/dashboard/manager',
        icon: BarChart3,
        roles: ['manager', 'admin', 'owner']
      });
    }

    if (role === 'employee' || role === 'manager' || role === 'admin' || role === 'owner' || role === 'restaurant_owner') {
      baseNav.push({
        name: 'My Performance',
        href: '/dashboard/employee',
        icon: UserCircle,
      });
    }

    // User Management
    if (role === 'owner' || role === 'restaurant_owner' || role === 'admin' || role === 'manager') {
      baseNav.push({
        name: 'Team',
        href: '/team',
        icon: Users,
        roles: ['owner', 'admin', 'manager']
      });
    }

    // POS Integration
    if (role === 'owner' || role === 'restaurant_owner' || role === 'admin') {
      baseNav.push({
        name: 'POS Connect',
        href: '/pos',
        icon: LinkIcon,
        roles: ['owner', 'admin']
      });
    }

    // Tasks
    baseNav.push({
      name: 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
    });

    // Chat
    baseNav.push({
      name: 'Chat',
      href: '/chat',
      icon: MessageSquare,
    });

    // Gamification
    baseNav.push({
      name: 'Leaderboard',
      href: '/leaderboard',
      icon: Award,
    });

    // Settings (everyone)
    baseNav.push({
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    });

    return baseNav;
  };

  const navigation = user ? getNavigation() : [];

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    router.push('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
      case 'restaurant_owner':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'manager':
        return 'bg-green-100 text-green-700';
      case 'employee':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'restaurant_owner':
        return 'Owner';
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'employee':
        return 'Employee';
      default:
        return role;
    }
  };

  // Show loading state during SSR and initial client load
  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-900">NOION</h1>
            <p className="text-xs text-gray-500">Analytics</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Restaurant & Role info */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-900">{user.restaurantName}</div>
          <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
            {getRoleLabel(user.role)}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {navigation.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                pathname === item.href
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </button>
          ))}
        </nav>

        {/* Help section */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-200 bg-white">
          <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <HelpCircle className="mr-3 h-5 w-5" />
            Help & Support
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="relative flex justify-between h-16">
              {/* Mobile menu button */}
              <div className="flex items-center lg:hidden">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>

              {/* Page title (optional - can be set by child components) */}
              <div className="flex-1 flex items-center justify-center lg:justify-start">
                <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
                  {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
                </h2>
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative">
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative text-gray-400 hover:text-gray-600"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-200">
                      <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        <button className="text-xs text-blue-600 hover:text-blue-700">Mark all read</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            No new notifications
                          </div>
                        ) : (
                          notifications.map((notif, idx) => (
                            <div key={idx} className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                              <div className="text-sm text-gray-900">{notif.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{notif.message}</div>
                              <div className="text-xs text-gray-400 mt-1">{notif.time}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <div className="flex items-center">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3 hidden md:block text-left">
                        <div className="text-sm font-medium text-gray-700">{user.name}</div>
                        <div className="text-xs text-gray-500">{getRoleLabel(user.role)}</div>
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
                    </div>
                  </button>

                  {/* User menu dropdown */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserMenuOpen(false);
                          router.push('/profile');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <UserCircle className="inline h-4 w-4 mr-2" />
                        Your Profile
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserMenuOpen(false);
                          router.push('/settings');
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="inline h-4 w-4 mr-2" />
                        Settings
                      </button>
                      <div className="border-t border-gray-200 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLogout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="inline h-4 w-4 mr-2" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Click outside handlers */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setUserMenuOpen(false)}
        />
      )}
      {notificationsOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setNotificationsOpen(false)}
        />
      )}
    </div>
  );
}
