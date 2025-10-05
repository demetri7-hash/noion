'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Camera, FileSignature, FileText, GripVertical } from 'lucide-react';

interface Task {
  title: string;
  description?: string;
  order: number;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  requiresNotes: boolean;
  photoInstructions?: string;
  notesPlaceholder?: string;
  estimatedMinutes?: number;
  points: number;
}

interface WorkflowTemplate {
  _id?: string;
  name: string;
  description?: string;
  tasks: Task[];
  recurring: {
    enabled: boolean;
    frequency?: string;
    daysOfWeek?: string[];
    timeOfDay?: string;
  };
  assignmentType: string;
  assignedUsers?: string[];
  assignedRole?: string;
  category?: string;
  color?: string;
}

interface CreateTemplateModalProps {
  template?: WorkflowTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTemplateModal({ template, onClose, onSuccess }: CreateTemplateModalProps) {
  const [formData, setFormData] = useState<WorkflowTemplate>({
    name: '',
    description: '',
    tasks: [],
    recurring: { enabled: false },
    assignmentType: 'specific_users',
    category: '',
    color: '#9333ea'
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData(template);
    }
    loadEmployees();
  }, [template]);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v2/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const addTask = () => {
    setFormData({
      ...formData,
      tasks: [
        ...formData.tasks,
        {
          title: '',
          order: formData.tasks.length,
          requiresPhoto: false,
          requiresSignature: false,
          requiresNotes: false,
          points: 10
        }
      ]
    });
  };

  const updateTask = (index: number, field: string, value: any) => {
    const updatedTasks = [...formData.tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setFormData({ ...formData, tasks: updatedTasks });
  };

  const removeTask = (index: number) => {
    const updatedTasks = formData.tasks.filter((_, i) => i !== index);
    // Reorder remaining tasks
    updatedTasks.forEach((task, i) => task.order = i);
    setFormData({ ...formData, tasks: updatedTasks });
  };

  const moveTask = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formData.tasks.length - 1) return;

    const updatedTasks = [...formData.tasks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    [updatedTasks[index], updatedTasks[newIndex]] = [updatedTasks[newIndex], updatedTasks[index]];
    updatedTasks.forEach((task, i) => task.order = i);

    setFormData({ ...formData, tasks: updatedTasks });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.tasks.length === 0) {
      alert('Please provide a name and at least one task');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const method = template?._id ? 'PUT' : 'POST';
      const url = template?._id
        ? `/api/v2/workflows/templates/${template._id}`
        : '/api/v2/workflows/templates';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {template?._id ? 'Edit' : 'Create'} Workflow Template
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Opening Checklist, Closing Procedures"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                placeholder="Brief description of this workflow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Opening, Closing, Safety"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Tasks *
              </label>
              <button
                type="button"
                onClick={addTask}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>
            </div>

            {formData.tasks.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-3">No tasks added yet</p>
                <button
                  type="button"
                  onClick={addTask}
                  className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Add First Task
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.tasks.map((task, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {/* Drag Handle & Order */}
                      <div className="flex flex-col items-center gap-1 pt-2">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <span className="text-xs text-gray-500">{index + 1}</span>
                      </div>

                      {/* Task Details */}
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(index, 'title', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Task title *"
                            required
                          />
                          <input
                            type="number"
                            value={task.points}
                            onChange={(e) => updateTask(index, 'points', parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Points"
                            min="0"
                          />
                        </div>

                        <textarea
                          value={task.description}
                          onChange={(e) => updateTask(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          rows={2}
                          placeholder="Task description (optional)"
                        />

                        {/* Requirements */}
                        <div className="flex flex-wrap gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={task.requiresPhoto}
                              onChange={(e) => updateTask(index, 'requiresPhoto', e.target.checked)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <Camera className="h-4 w-4 text-gray-600" />
                            Photo Required
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={task.requiresSignature}
                              onChange={(e) => updateTask(index, 'requiresSignature', e.target.checked)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <FileSignature className="h-4 w-4 text-gray-600" />
                            Signature Required
                          </label>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={task.requiresNotes}
                              onChange={(e) => updateTask(index, 'requiresNotes', e.target.checked)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <FileText className="h-4 w-4 text-gray-600" />
                            Notes Required
                          </label>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveTask(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTask(index, 'down')}
                          disabled={index === formData.tasks.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTask(index)}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Type
            </label>
            <select
              value={formData.assignmentType}
              onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="specific_users">Specific Users</option>
              <option value="role">By Role</option>
              <option value="any_available">Any Available</option>
            </select>

            {formData.assignmentType === 'specific_users' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {employees.map(emp => (
                    <label key={emp._id} className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.assignedUsers?.includes(emp._id)}
                        onChange={(e) => {
                          const users = formData.assignedUsers || [];
                          setFormData({
                            ...formData,
                            assignedUsers: e.target.checked
                              ? [...users, emp._id]
                              : users.filter(id => id !== emp._id)
                          });
                        }}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm">{emp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.assignmentType === 'role' && (
              <div className="mt-3">
                <select
                  value={formData.assignedRole}
                  onChange={(e) => setFormData({ ...formData, assignedRole: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Role</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>

          {/* Recurring */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <input
                type="checkbox"
                checked={formData.recurring.enabled}
                onChange={(e) => setFormData({
                  ...formData,
                  recurring: { ...formData.recurring, enabled: e.target.checked }
                })}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              Recurring Workflow
            </label>

            {formData.recurring.enabled && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <select
                  value={formData.recurring.frequency}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurring: { ...formData.recurring, frequency: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <input
                  type="time"
                  value={formData.recurring.timeOfDay}
                  onChange={(e) => setFormData({
                    ...formData,
                    recurring: { ...formData.recurring, timeOfDay: e.target.value }
                  })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : template?._id ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
