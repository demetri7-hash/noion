'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '../../components/layout/MainLayout';
import { CheckSquare, Calendar, Camera, FileSignature, FileText, Clock, AlertCircle, ChevronRight, Settings } from 'lucide-react';
import TaskCompletionModal from '../../components/tasks/TaskCompletionModal';

interface Task {
  _id: string;
  workflowId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'missed';
  requiresPhoto: boolean;
  requiresSignature: boolean;
  requiresNotes: boolean;
  photoUrl?: string;
  signatureUrl?: string;
  notes?: string;
  completedAt?: string;
  order: number;
}

interface Workflow {
  _id: string;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
  dueDate?: string;
  tasks: Task[];
}

export default function TasksPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Get user role from localStorage
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setUserRole(userData.role || '');
    }
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/v2/workflows', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const allTasks = workflows.flatMap(w => w.tasks);
    const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = allTasks.filter(t =>
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt) >= today
    ).length;

    const completionRate = allTasks.length > 0
      ? Math.round((allTasks.filter(t => t.status === 'completed').length / allTasks.length) * 100)
      : 0;

    return { pendingTasks, completedToday, completionRate };
  };

  const stats = calculateStats();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'missed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    const now = new Date();
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return <span className="text-red-600">Overdue</span>;
    if (diffHours < 2) return <span className="text-orange-600">Due soon</span>;
    return <span className="text-gray-600">Due {date.toLocaleDateString()}</span>;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Tasks & Workflows</h1>
            <p className="text-gray-600 mt-1">Complete your assigned tasks and workflows</p>
          </div>
          {(userRole === 'owner' || userRole === 'admin' || userRole === 'manager') && (
            <button
              onClick={() => router.push('/tasks/manage')}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Settings className="h-5 w-5" />
              Manage Workflows
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingTasks}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completedToday}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completionRate}%</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Workflows */}
        {workflows.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <CheckSquare className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Assigned</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              You don't have any workflows or tasks assigned yet. Check back later or contact your manager.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow._id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Workflow Header */}
                <div
                  className="p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedWorkflow(selectedWorkflow === workflow._id ? null : workflow._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.status)}`}>
                          {workflow.status}
                        </span>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">
                          {workflow.tasks.filter(t => t.status === 'completed').length}/{workflow.tasks.length} tasks completed
                        </span>
                        {workflow.dueDate && (
                          <span className="text-sm flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDueDate(workflow.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${selectedWorkflow === workflow._id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Task List */}
                {selectedWorkflow === workflow._id && (
                  <div className="divide-y divide-gray-200">
                    {workflow.tasks.sort((a, b) => a.order - b.order).map((task) => (
                      <div
                        key={task._id}
                        className={`p-4 ${task.status !== 'completed' ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                        onClick={() => {
                          if (task.status !== 'completed') {
                            setSelectedTask(task);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                disabled={task.status === 'completed'}
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                readOnly
                              />
                              <h4 className={`font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {task.title}
                              </h4>
                            </div>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1 ml-7">{task.description}</p>
                            )}

                            {/* Requirements */}
                            <div className="flex items-center space-x-3 mt-2 ml-7">
                              {task.requiresPhoto && (
                                <div className={`flex items-center text-xs ${task.photoUrl ? 'text-green-600' : 'text-gray-500'}`}>
                                  <Camera className="h-4 w-4 mr-1" />
                                  Photo {task.photoUrl ? '✓' : 'required'}
                                </div>
                              )}
                              {task.requiresSignature && (
                                <div className={`flex items-center text-xs ${task.signatureUrl ? 'text-green-600' : 'text-gray-500'}`}>
                                  <FileSignature className="h-4 w-4 mr-1" />
                                  Signature {task.signatureUrl ? '✓' : 'required'}
                                </div>
                              )}
                              {task.requiresNotes && (
                                <div className={`flex items-center text-xs ${task.notes ? 'text-green-600' : 'text-gray-500'}`}>
                                  <FileText className="h-4 w-4 mr-1" />
                                  Notes {task.notes ? '✓' : 'required'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Completion Modal */}
      {selectedTask && (
        <TaskCompletionModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={() => {
            setSelectedTask(null);
            loadWorkflows();
          }}
        />
      )}
    </MainLayout>
  );
}
