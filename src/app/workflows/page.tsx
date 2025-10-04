'use client';

import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { Plus, Edit, Trash2, Copy, ChevronRight } from 'lucide-react';

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  tasks: Array<{
    title: string;
    description?: string;
    requiresPhoto: boolean;
    requiresSignature: boolean;
    requiresNotes: boolean;
    order: number;
  }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    days?: number[];
    time?: string;
  };
  assignmentType: 'all' | 'role' | 'specific';
  assignedRoles?: string[];
  isActive: boolean;
}

export default function WorkflowsPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('/api/v2/workflows/templates', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
            <p className="text-gray-600 mt-1">Create and manage reusable workflow templates</p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Template
          </button>
        </div>

        {/* Templates List */}
        {templates.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h2>
            <p className="text-gray-600 mb-4">
              Create your first workflow template to automate recurring tasks
            </p>
            <button
              onClick={() => setShowBuilder(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <div key={template._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}

                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span>{template.tasks.length} tasks</span>
                      {template.recurrence && (
                        <span className="flex items-center">
                          <ChevronRight className="h-4 w-4 mr-1" />
                          {template.recurrence.frequency}
                        </span>
                      )}
                      <span>Assigned to: {template.assignmentType}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      <Copy className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      <Edit className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Task Preview */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tasks:</h4>
                  <div className="space-y-1">
                    {template.tasks.slice(0, 3).map((task, idx) => (
                      <div key={idx} className="text-sm text-gray-600 flex items-center">
                        <span className="w-6 text-gray-400">{task.order}.</span>
                        <span>{task.title}</span>
                        {task.requiresPhoto && <span className="ml-2 text-xs text-blue-600">📷</span>}
                        {task.requiresSignature && <span className="ml-1 text-xs text-purple-600">✍️</span>}
                        {task.requiresNotes && <span className="ml-1 text-xs text-green-600">📝</span>}
                      </div>
                    ))}
                    {template.tasks.length > 3 && (
                      <p className="text-sm text-gray-400">+ {template.tasks.length - 3} more tasks</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workflow Builder Modal - Placeholder */}
        {showBuilder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-2xl font-bold mb-4">Workflow Builder</h2>
              <p className="text-gray-600 mb-4">
                Full workflow builder with drag-and-drop task ordering, requirement toggles,
                and scheduling configuration coming soon!
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowBuilder(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
