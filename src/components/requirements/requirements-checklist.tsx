'use client';

import { useState, useEffect } from 'react';
import { RequirementWithProgress } from '@/lib/services/requirements';
import { RequirementStatus } from '@/lib/validations/application';
import { CheckCircle, Clock, AlertCircle, Circle, Calendar, FileText, Plus, Edit, MessageSquare } from 'lucide-react';

interface RequirementsChecklistProps {
  applicationId: string;
  onRequirementUpdate?: () => void;
}

export function RequirementsChecklist({ applicationId, onRequirementUpdate }: RequirementsChecklistProps) {
  const [requirements, setRequirements] = useState<RequirementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRequirement, setUpdatingRequirement] = useState<string | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    fetchRequirements();
  }, [applicationId]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${applicationId}/requirements`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch requirements');
      }
      
      const data = await response.json();
      setRequirements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateRequirementStatus = async (requirementId: string, status: RequirementStatus, notes?: string) => {
    try {
      setUpdatingRequirement(requirementId);
      
      const response = await fetch(`/api/applications/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        throw new Error('Failed to update requirement status');
      }

      // Refresh requirements list
      await fetchRequirements();
      onRequirementUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update requirement');
    } finally {
      setUpdatingRequirement(null);
    }
  };

  const updateRequirementDeadline = async (requirementId: string, deadline: string | null) => {
    try {
      const response = await fetch(`/api/applications/requirements/${requirementId}/deadline`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deadline }),
      });

      if (!response.ok) {
        throw new Error('Failed to update requirement deadline');
      }

      // Refresh requirements list
      await fetchRequirements();
      onRequirementUpdate?.();
      setEditingDeadline(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deadline');
    }
  };

  const addRequirementNote = async (requirementId: string, note: string) => {
    try {
      const response = await fetch(`/api/applications/requirements/${requirementId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      // Refresh requirements list
      await fetchRequirements();
      onRequirementUpdate?.();
      setAddingNote(null);
      setNewNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  const getStatusIcon = (status: RequirementStatus, isOverdue: boolean) => {
    if (status === 'completed') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status === 'in_progress') {
      return <Clock className="h-5 w-5 text-blue-500" />;
    } else if (isOverdue) {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    } else {
      return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: RequirementStatus, isOverdue: boolean) => {
    if (status === 'completed') {
      return 'bg-green-50 border-green-200';
    } else if (status === 'in_progress') {
      return 'bg-blue-50 border-blue-200';
    } else if (isOverdue) {
      return 'bg-red-50 border-red-200';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  const getDeadlineText = (requirement: RequirementWithProgress) => {
    if (!requirement.deadline) return null;
    
    if (requirement.isOverdue) {
      return (
        <span className="text-red-600 font-medium">
          Overdue by {Math.abs(requirement.daysUntilDeadline || 0)} days
        </span>
      );
    } else if (requirement.daysUntilDeadline !== null) {
      if (requirement.daysUntilDeadline === 0) {
        return <span className="text-orange-600 font-medium">Due today</span>;
      } else if (requirement.daysUntilDeadline === 1) {
        return <span className="text-orange-600 font-medium">Due tomorrow</span>;
      } else if (requirement.daysUntilDeadline <= 7) {
        return <span className="text-orange-600">Due in {requirement.daysUntilDeadline} days</span>;
      } else {
        return <span className="text-gray-600">Due in {requirement.daysUntilDeadline} days</span>;
      }
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
              <div className="h-5 w-5 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
        <button
          onClick={fetchRequirements}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Application Requirements</h3>
        <button className="flex items-center text-blue-600 hover:text-blue-800">
          <Plus className="h-4 w-4 mr-1" />
          Add Custom Requirement
        </button>
      </div>

      {requirements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No requirements found for this application.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requirements.map((requirement) => (
            <div
              key={requirement.id}
              className={`p-4 rounded-lg border transition-colors ${getStatusColor(
                requirement.status,
                requirement.isOverdue
              )}`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => {
                    const nextStatus: RequirementStatus = 
                      requirement.status === 'not_started' ? 'in_progress' :
                      requirement.status === 'in_progress' ? 'completed' :
                      'not_started';
                    updateRequirementStatus(requirement.id, nextStatus);
                  }}
                  disabled={updatingRequirement === requirement.id}
                  className="mt-0.5 hover:scale-110 transition-transform"
                >
                  {getStatusIcon(requirement.status, requirement.isOverdue)}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 truncate">
                      {requirement.title}
                    </h4>
                    <div className="flex items-center space-x-2 ml-4">
                      {requirement.deadline && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          {requirement.deadline.toLocaleDateString()}
                        </div>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        requirement.status === 'completed' ? 'bg-green-100 text-green-800' :
                        requirement.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {requirement.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {requirement.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {requirement.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-4">
                      {getDeadlineText(requirement)}
                      <span className="text-xs text-gray-500 capitalize">
                        {requirement.requirementType.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingDeadline(requirement.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Edit deadline"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAddingNote(requirement.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                        title="Add note"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Deadline Editor */}
                  {editingDeadline === requirement.id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded border">
                      <div className="flex items-center space-x-2">
                        <input
                          type="datetime-local"
                          defaultValue={requirement.deadline ? 
                            new Date(requirement.deadline.getTime() - requirement.deadline.getTimezoneOffset() * 60000)
                              .toISOString().slice(0, 16) : ''
                          }
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              updateRequirementDeadline(requirement.id, new Date(e.target.value).toISOString());
                            }
                          }}
                        />
                        <button
                          onClick={() => updateRequirementDeadline(requirement.id, null)}
                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setEditingDeadline(null)}
                          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Note Editor */}
                  {addingNote === requirement.id && (
                    <div className="mt-2 p-3 bg-gray-50 rounded border">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note about this requirement..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
                        rows={3}
                      />
                      <div className="flex items-center justify-end space-x-2 mt-2">
                        <button
                          onClick={() => {
                            setAddingNote(null);
                            setNewNote('');
                          }}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => addRequirementNote(requirement.id, newNote)}
                          disabled={!newNote.trim()}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add Note
                        </button>
                      </div>
                    </div>
                  )}

                  {requirement.notes && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <div className="text-xs text-gray-500 mb-1">Notes:</div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap">{requirement.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}