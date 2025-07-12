/**
 * Recording Session Component
 * Complete interface for managing recording sessions with all controls
 */

import React, { useState } from 'react';
import { useRecordingSession, RecordingSession as SessionType } from '../../hooks/useRecordingSession';
import { AudioRecorder } from '../audio/AudioRecorder';
import { FileUploadManager } from '../upload/FileUploadManager';

interface RecordingSessionProps {
  onSessionComplete?: (session: SessionType) => void;
  onSessionError?: (error: string) => void;
  className?: string;
}

interface NewSessionForm {
  title: string;
  description: string;
  meetingType: string;
  participants: string[];
}

export const RecordingSession: React.FC<RecordingSessionProps> = ({
  onSessionComplete,
  onSessionError,
  className = '',
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState<NewSessionForm>({
    title: '',
    description: '',
    meetingType: 'general',
    participants: [],
  });
  const [participantInput, setParticipantInput] = useState('');

  const {
    state,
    createSession,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    endSession,
    clearSession,
    updateSession,
  } = useRecordingSession();

  // Handle session creation
  const handleCreateSession = async () => {
    if (!newSessionForm.title.trim()) {
      onSessionError?.('Meeting title is required');
      return;
    }

    try {
      const session = await createSession({
        title: newSessionForm.title,
        description: newSessionForm.description,
        meetingType: newSessionForm.meetingType,
        participants: newSessionForm.participants,
      });
      
      setShowCreateForm(false);
      setNewSessionForm({
        title: '',
        description: '',
        meetingType: 'general',
        participants: [],
      });
    } catch (error) {
      onSessionError?.(error instanceof Error ? error.message : 'Failed to create session');
    }
  };

  // Handle participant addition
  const addParticipant = () => {
    const email = participantInput.trim();
    if (email && !newSessionForm.participants.includes(email)) {
      setNewSessionForm(prev => ({
        ...prev,
        participants: [...prev.participants, email],
      }));
      setParticipantInput('');
    }
  };

  // Remove participant
  const removeParticipant = (email: string) => {
    setNewSessionForm(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p !== email),
    }));
  };

  // Handle recording completion
  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Recording is handled automatically by the session hook
    console.log('Recording completed, audio blob available');
  };

  // Handle session completion
  const handleEndSession = async () => {
    try {
      await endSession();
      if (state.currentSession) {
        onSessionComplete?.(state.currentSession);
      }
    } catch (error) {
      onSessionError?.(error instanceof Error ? error.message : 'Failed to end session');
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recording':
        return 'text-red-600 bg-red-50';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Recording Session
        </h1>
        <p className="text-gray-600">
          Create and manage your meeting recordings
        </p>
      </div>

      {/* Current Session Info */}
      {state.currentSession && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {state.currentSession.title}
              </h2>
              {state.currentSession.description && (
                <p className="text-gray-600 mt-1">
                  {state.currentSession.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(state.currentSession.status)}`}>
                {state.currentSession.status.charAt(0).toUpperCase() + state.currentSession.status.slice(1)}
              </span>
              {state.recordingDuration > 0 && (
                <span className="text-lg font-mono font-bold text-gray-900">
                  {formatDuration(state.recordingDuration)}
                </span>
              )}
            </div>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <span className="ml-2 font-medium">{state.currentSession.meetingType}</span>
            </div>
            {state.currentSession.participants.length > 0 && (
              <div>
                <span className="text-gray-500">Participants:</span>
                <span className="ml-2 font-medium">{state.currentSession.participants.length}</span>
              </div>
            )}
            {state.currentSession.startTime && (
              <div>
                <span className="text-gray-500">Started:</span>
                <span className="ml-2 font-medium">
                  {state.currentSession.startTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Participants List */}
          {state.currentSession.participants.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Participants:</h4>
              <div className="flex flex-wrap gap-2">
                {state.currentSession.participants.map((participant, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Session Actions */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex space-x-3">
              {state.currentSession.status === 'completed' && (
                <button
                  onClick={clearSession}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Start New Session
                </button>
              )}
            </div>

            {state.currentSession.status === 'recording' && (
              <button
                onClick={handleEndSession}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                End Session
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create New Session */}
      {!state.currentSession && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          {!showCreateForm ? (
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start a New Recording Session
              </h3>
              <p className="text-gray-600 mb-6">
                Create a new meeting session to begin recording
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Create New Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                New Recording Session
              </h3>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={newSessionForm.title}
                  onChange={(e) => setNewSessionForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter meeting title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newSessionForm.description}
                  onChange={(e) => setNewSessionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Type
                </label>
                <select
                  value={newSessionForm.meetingType}
                  onChange={(e) => setNewSessionForm(prev => ({ ...prev, meetingType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General Meeting</option>
                  <option value="interview">Interview</option>
                  <option value="standup">Standup</option>
                  <option value="presentation">Presentation</option>
                  <option value="workshop">Workshop</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Participants */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participants
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="email"
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter participant email"
                  />
                  <button
                    onClick={addParticipant}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>
                
                {newSessionForm.participants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newSessionForm.participants.map((participant, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {participant}
                        <button
                          onClick={() => removeParticipant(participant)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionForm.title.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Create Session
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Recording Interface */}
      {state.currentSession && state.currentSession.status !== 'completed' && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Audio Recording
          </h3>
          
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            onRecordingStart={startRecording}
            onRecordingStop={stopRecording}
            onError={(error) => onSessionError?.(error)}
            showDeviceSelector={true}
            showAudioLevelMeter={true}
          />
        </div>
      )}

      {/* File Upload for External Recordings */}
      {state.currentSession && state.currentSession.status === 'scheduled' && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Upload Existing Recording
          </h3>
          <p className="text-gray-600 mb-4">
            You can also upload an existing audio file instead of recording live
          </p>
          
          <FileUploadManager
            onUploadComplete={(fileId, fileName) => {
              console.log('File uploaded:', fileId, fileName);
              // Handle uploaded file
            }}
            onUploadError={(error) => onSessionError?.(error)}
            maxConcurrentUploads={1}
            showUploadZone={true}
            showProgressList={true}
          />
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-700">{state.error}</p>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {state.isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
            <p className="text-blue-700">Uploading recording...</p>
          </div>
        </div>
      )}
    </div>
  );
};