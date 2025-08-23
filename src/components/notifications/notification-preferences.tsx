'use client';

import { useState, useEffect } from 'react';
import { Save, Bell, Mail, Smartphone } from 'lucide-react';

interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  deadlineReminders: boolean;
  statusUpdates: boolean;
  decisionAlerts: boolean;
  reminderDaysBefore: number;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    pushEnabled: true,
    deadlineReminders: true,
    statusUpdates: true,
    decisionAlerts: true,
    reminderDaysBefore: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferences saved successfully' });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | number) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage how and when you receive notifications about your applications
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Delivery Channels */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Delivery Channels</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={(e) => updatePreference('emailEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Email notifications</span>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={(e) => updatePreference('pushEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3 flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Push notifications</span>
              </div>
            </label>
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Notification Types</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.deadlineReminders}
                onChange={(e) => updatePreference('deadlineReminders', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm text-gray-700">Deadline reminders</span>
                <p className="text-xs text-gray-500">Get notified about upcoming application deadlines</p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.statusUpdates}
                onChange={(e) => updatePreference('statusUpdates', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm text-gray-700">Status updates</span>
                <p className="text-xs text-gray-500">Get notified when application status changes</p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.decisionAlerts}
                onChange={(e) => updatePreference('decisionAlerts', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm text-gray-700">Decision alerts</span>
                <p className="text-xs text-gray-500">Get notified when admission decisions are received</p>
              </div>
            </label>
          </div>
        </div>

        {/* Reminder Timing */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Reminder Timing</h4>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Send deadline reminders</label>
            <select
              value={preferences.reminderDaysBefore}
              onChange={(e) => updatePreference('reminderDaysBefore', parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <span className="text-sm text-gray-700">before deadline</span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-md ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}