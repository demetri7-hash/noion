'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Plus, ListChecks, Users, Calendar, Edit, Trash2, PlayCircle } from 'lucide-react';
import CreateTemplateModal from '@/components/tasks/CreateTemplateModal';
import AssignWorkflowModal from '@/components/tasks/AssignWorkflowModal';

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  tasks: any[];
  recurring: {
    enabled: boolean;
    frequency?: string;
  };
  assignmentType: string;
  assignedUsers?: string[];
  assignedRole?: string;
  category?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
}

export default function ManageTasksPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

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

  const handleAssignWorkflow = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setShowAssignModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v2/workflows/templates/${templateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        loadTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Manage Workflows</h1>
            <p className="text-gray-600 mt-1">Create and manage workflow templates</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Template
          </button>
        </div>

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 text-center">
            <ListChecks className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Templates Yet</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-4">
              Create your first workflow template to start assigning tasks to your team.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template._id}
                className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Template Header */}
                <div
                  className="p-4 border-b border-gray-200"
                  style={{
                    backgroundColor: template.color ? `${template.color}15` : undefined,
                    borderLeftWidth: '4px',
                    borderLeftColor: template.color || '#9333ea'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      {template.category && (
                        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {template.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <ListChecks className="h-4 w-4 mr-2" />
                    {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}
                  </div>

                  {template.recurring.enabled && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Recurring: {template.recurring.frequency}
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {template.assignmentType === 'specific_users'
                      ? `${template.assignedUsers?.length || 0} user(s)`
                      : template.assignmentType === 'role'
                      ? `Role: ${template.assignedRole}`
                      : 'Any available'}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleAssignWorkflow(template)}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded text-sm hover:bg-purple-700 transition-colors"
                  >
                    <PlayCircle className="h-4 w-4" />
                    Assign
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template._id)}
                    className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded text-sm hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTemplateModal
          template={selectedTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedTemplate(null);
            loadTemplates();
          }}
        />
      )}

      {showAssignModal && selectedTemplate && (
        <AssignWorkflowModal
          template={selectedTemplate}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </MainLayout>
  );
}
