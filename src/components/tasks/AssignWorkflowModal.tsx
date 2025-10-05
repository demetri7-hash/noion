'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Users, AlertCircle } from 'lucide-react';

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  tasks: any[];
  assignmentType: string;
  assignedUsers?: string[];
  assignedRole?: string;
}

interface AssignWorkflowModalProps {
  template: WorkflowTemplate;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignWorkflowModal({ template, onClose, onSuccess }: AssignWorkflowModalProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmployees();

    // Set default dates
    const today = new Date();
    setScheduledDate(today.toISOString().split('T')[0]);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);

    // Pre-select employees if template has specific users
    if (template.assignmentType === 'specific_users' && template.assignedUsers) {
      setSelectedEmployees(template.assignedUsers);
    }
  }, [template]);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/v2/employees?status=active', {
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

  const handleAssign = async () => {
    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    if (!scheduledDate || !dueDate) {
      alert('Please select scheduled and due dates');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      // Create a workflow instance for each selected employee
      const promises = selectedEmployees.map(employeeId =>
        fetch('/api/v2/workflows', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            templateId: template._id,
            assignedTo: employeeId,
            scheduledDate,
            dueDate
          })
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        alert(`Successfully assigned workflow to ${selectedEmployees.length} employee(s)`);
        onSuccess();
      } else {
        alert('Some assignments failed. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning workflow:', error);
      alert('Failed to assign workflow');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAll = () => {
    setSelectedEmployees(employees.map(e => e._id));
  };

  const clearAll = () => {
    setSelectedEmployees([]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Assign Workflow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              {template.tasks.length} task{template.tasks.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Scheduled Date *
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Employee Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                <Users className="h-4 w-4 inline mr-1" />
                Assign To *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-purple-600 hover:text-purple-700"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-gray-600 hover:text-gray-700"
                >
                  Clear All
                </button>
              </div>
            </div>

            {employees.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">No active employees found</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Make sure you have active employees in your team.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg">
                {employees.map(emp => (
                  <label
                    key={emp._id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                      selectedEmployees.includes(emp._id) ? 'bg-purple-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp._id)}
                      onChange={() => toggleEmployee(emp._id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      {emp.email && (
                        <p className="text-sm text-gray-500">{emp.email}</p>
                      )}
                    </div>
                    {emp.role && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {emp.role}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {selectedEmployees.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedEmployees.length} employee(s) selected
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> A separate workflow instance will be created for each selected employee.
              They will be able to complete their tasks independently.
            </p>
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
              onClick={handleAssign}
              disabled={loading || selectedEmployees.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : `Assign to ${selectedEmployees.length} Employee(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
