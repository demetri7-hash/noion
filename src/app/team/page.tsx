'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import {
  Users,
  UserPlus,
  Search,
  Download,
  RefreshCw,
  Crown,
  Shield,
  User,
  Star,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TeamMember {
  id: string;
  userId: string;
  toastEmployeeId?: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  points: number;
  level: number;
  streak: number;
  badges?: string[];
  hireDate?: string;
  isImported: boolean;
  importedFrom: string | null;
  toastData?: any;
}

interface POSConnection {
  isConnected: boolean;
  posType?: string;
  locationId?: string;
  hasRequiredCredentials?: boolean;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [posConnection, setPosConnection] = useState<POSConnection>({ isConnected: false });
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    checkPOSConnection();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teamMembers, searchQuery, roleFilter, showInactive]);

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/v2/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPOSConnection = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/pos/toast/connect', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPosConnection({
            isConnected: data.data.isConnected,
            posType: data.data.posType,
            locationId: data.data.locationId,
            hasRequiredCredentials: data.data.hasRequiredCredentials
          });
        }
      }
    } catch (error) {
      console.error('Error checking POS connection:', error);
    }
  };

  const importStaffFromToast = async () => {
    try {
      setImporting(true);
      setImportResult(null);

      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/pos/toast/import-staff', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult(result);
        // Refresh team members list
        await fetchTeamMembers();
      } else {
        setImportResult({
          success: false,
          error: result.error || 'Failed to import staff'
        });
      }
    } catch (error) {
      console.error('Error importing staff:', error);
      setImportResult({
        success: false,
        error: 'Failed to import staff'
      });
    } finally {
      setImporting(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      setUpdatingRoleFor(memberId);

      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`/api/v2/users/${memberId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        // Refresh team members list
        await fetchTeamMembers();
      } else {
        const error = await response.json();
        console.error('Failed to update role:', error);
        alert(`Failed to update role: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    } finally {
      setUpdatingRoleFor(null);
    }
  };

  const applyFilters = () => {
    let filtered = [...teamMembers];

    // Active/Inactive filter - exclude inactive by default
    if (!showInactive) {
      filtered = filtered.filter(member => member.isActive !== false);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }

    setFilteredMembers(filtered);
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-5 w-5 text-purple-500" />;
      case 'manager':
        return <Star className="h-5 w-5 text-blue-500" />;
      default:
        return <User className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">
              {teamMembers.length} team {teamMembers.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          {posConnection.isConnected && posConnection.posType === 'toast' && (
            posConnection.hasRequiredCredentials ? (
              <button
                onClick={importStaffFromToast}
                disabled={importing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {importing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Import from Toast
                  </>
                )}
              </button>
            ) : (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
                ⚠️ Toast credentials incomplete. Please reconnect on the POS page.
              </div>
            )
          )}
        </div>

        {/* Import Result */}
        {importResult && (
          <div className={`p-4 rounded-lg ${
            importResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            {importResult.success ? (
              <>
                <p className="text-green-800 font-medium mb-2">
                  ✅ Successfully imported {importResult.data?.totalImported} employees!
                </p>
                {importResult.data?.skipped && importResult.data.skipped.length > 0 && (
                  <p className="text-sm text-yellow-700">
                    Skipped {importResult.data.skipped.length} employees (already imported)
                  </p>
                )}
              </>
            ) : (
              <p className="text-red-800">
                ❌ {importResult.error}
              </p>
            )}
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show Archived</span>
            </label>
          </div>
        </div>

        {/* Team Members List */}
        {filteredMembers.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No team members found</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your filters'
                : posConnection.isConnected
                  ? 'Import your team from Toast POS to get started'
                  : 'Connect to Toast POS to import your team members'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className={`bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow ${
                  !member.isActive ? 'opacity-60 border-2 border-gray-200' : ''
                }`}
              >
                {/* Member Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 rounded-full p-3">
                      {getRoleIcon(member.role)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{member.email || 'No email'}</p>
                    </div>
                  </div>
                  {member.isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500" title="Active" />
                  ) : (
                    <div className="flex items-center gap-1">
                      <XCircle className="h-5 w-5 text-gray-400" title="Archived" />
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">Archived</span>
                    </div>
                  )}
                </div>

                {/* Role Selector/Badge */}
                <div className="mb-4">
                  {member.role !== 'owner' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.id, e.target.value)}
                        disabled={updatingRoleFor === member.id}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 ${getRoleBadgeColor(member.role)} ${
                          updatingRoleFor === member.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                      {updatingRoleFor === member.id && (
                        <RefreshCw className="h-3 w-3 animate-spin text-blue-600" />
                      )}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  )}
                  {member.isImported && member.toastData?.jobTitle && (
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">
                        Toast Role: {member.toastData.jobTitle}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Level
                    </span>
                    <span className="font-medium text-gray-900">{member.level}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Star className="h-4 w-4 mr-1" />
                      Points
                    </span>
                    <span className="font-medium text-gray-900">{member.points.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Award className="h-4 w-4 mr-1" />
                      Streak
                    </span>
                    <span className="font-medium text-gray-900">{member.streak} days</span>
                  </div>
                </div>

                {/* Toast Employee ID (if imported) */}
                {member.toastEmployeeId && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Toast ID: {member.toastEmployeeId.substring(0, 8)}...
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        {!posConnection.isConnected && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">
              💡 Connect to Toast POS to automatically import your team members and link them to sales data
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
