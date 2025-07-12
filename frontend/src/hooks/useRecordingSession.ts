/**
 * Custom hook for managing recording sessions
 * Handles meeting creation, recording state, and session lifecycle
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioRecording } from './useAudioRecording';
import { useFileUpload } from './useFileUpload';

export interface RecordingSession {
  id: string;
  title: string;
  description?: string;
  meetingType: string;
  participants: string[];
  status: 'scheduled' | 'recording' | 'processing' | 'completed' | 'error';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  recordingFileId?: string;
  transcriptId?: string;
}

export interface SessionState {
  currentSession: RecordingSession | null;
  isRecording: boolean;
  isUploading: boolean;
  error: string | null;
  recordingDuration: number;
}

export interface UseRecordingSessionHook {
  state: SessionState;
  createSession: (sessionData: Omit<RecordingSession, 'id' | 'status'>) => Promise<RecordingSession>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  endSession: () => Promise<void>;
  clearSession: () => void;
  updateSession: (updates: Partial<RecordingSession>) => Promise<void>;
}

export const useRecordingSession = (apiBaseUrl: string = '/api'): UseRecordingSessionHook => {
  const [state, setState] = useState<SessionState>({
    currentSession: null,
    isRecording: false,
    isUploading: false,
    error: null,
    recordingDuration: 0,
  });

  const audioRecording = useAudioRecording();
  const fileUpload = useFileUpload(`${apiBaseUrl}/upload`);
  const sessionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get auth token (implement based on your auth system)
  const getAuthToken = (): string | null => {
    return localStorage.getItem('access_token');
  };

  // Make authenticated API calls
  const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${error}`);
    }

    return response.json();
  };

  // Create a new recording session
  const createSession = useCallback(async (
    sessionData: Omit<RecordingSession, 'id' | 'status'>
  ): Promise<RecordingSession> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const response = await apiCall('/meetings', {
        method: 'POST',
        body: JSON.stringify({
          title: sessionData.title,
          description: sessionData.description,
          meeting_type: sessionData.meetingType,
          participants: sessionData.participants,
        }),
      });

      const newSession: RecordingSession = {
        id: response.id,
        title: response.title,
        description: response.description,
        meetingType: response.meeting_type,
        participants: response.participants,
        status: response.status,
      };

      setState(prev => ({
        ...prev,
        currentSession: newSession,
      }));

      return newSession;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [apiBaseUrl]);

  // Start recording
  const startRecording = useCallback(async (): Promise<void> => {
    if (!state.currentSession) {
      throw new Error('No active session');
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Start recording with audio hook
      await audioRecording.startRecording();

      // Notify backend that recording started
      await apiCall(`/meetings/${state.currentSession.id}/start-recording`, {
        method: 'POST',
        body: JSON.stringify({
          audio_settings: {
            format: 'webm',
            quality: 'high',
          },
        }),
      });

      setState(prev => ({
        ...prev,
        isRecording: true,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          status: 'recording',
          startTime: new Date(),
        } : null,
      }));

      // Start duration tracking
      sessionIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1,
        }));
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.currentSession, audioRecording, apiBaseUrl]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<void> => {
    if (!state.currentSession || !state.isRecording) {
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));

      // Stop audio recording
      audioRecording.stopRecording();

      // Clear duration interval
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isRecording: false,
        isUploading: true,
      }));

      // Wait for audio blob to be available
      const maxWaitTime = 5000; // 5 seconds
      const startWait = Date.now();
      
      while (!audioRecording.audioBlob && (Date.now() - startWait) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!audioRecording.audioBlob) {
        throw new Error('No audio data recorded');
      }

      // Upload the recording
      const fileId = await fileUpload.uploadFile(
        new File([audioRecording.audioBlob], `recording-${state.currentSession.id}.webm`, {
          type: audioRecording.audioBlob.type,
        }),
        {
          onComplete: (uploadedFileId) => {
            console.log('Recording uploaded:', uploadedFileId);
          },
          onError: (uploadError) => {
            console.error('Upload failed:', uploadError);
            setState(prev => ({ ...prev, error: uploadError }));
          },
        }
      );

      // Notify backend that recording stopped
      await apiCall(`/meetings/${state.currentSession.id}/stop-recording`, {
        method: 'POST',
        body: JSON.stringify({
          recording_file_id: fileId,
          actual_duration: state.recordingDuration,
        }),
      });

      setState(prev => ({
        ...prev,
        isUploading: false,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          status: 'processing',
          endTime: new Date(),
          duration: prev.recordingDuration,
          recordingFileId: fileId,
        } : null,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isRecording: false,
        isUploading: false,
      }));
      throw error;
    }
  }, [state.currentSession, state.isRecording, state.recordingDuration, audioRecording, fileUpload, apiBaseUrl]);

  // Pause recording
  const pauseRecording = useCallback((): void => {
    audioRecording.pauseRecording();
    
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
  }, [audioRecording]);

  // Resume recording
  const resumeRecording = useCallback((): void => {
    audioRecording.resumeRecording();
    
    // Resume duration tracking
    sessionIntervalRef.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        recordingDuration: prev.recordingDuration + 1,
      }));
    }, 1000);
  }, [audioRecording]);

  // End session
  const endSession = useCallback(async (): Promise<void> => {
    if (state.isRecording) {
      await stopRecording();
    }

    setState(prev => ({
      ...prev,
      currentSession: prev.currentSession ? {
        ...prev.currentSession,
        status: 'completed',
      } : null,
    }));
  }, [state.isRecording, stopRecording]);

  // Clear session
  const clearSession = useCallback((): void => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }

    audioRecording.clearRecording();

    setState({
      currentSession: null,
      isRecording: false,
      isUploading: false,
      error: null,
      recordingDuration: 0,
    });
  }, [audioRecording]);

  // Update session
  const updateSession = useCallback(async (
    updates: Partial<RecordingSession>
  ): Promise<void> => {
    if (!state.currentSession) {
      throw new Error('No active session');
    }

    try {
      const response = await apiCall(`/meetings/${state.currentSession.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updates.title,
          description: updates.description,
          participants: updates.participants,
        }),
      });

      setState(prev => ({
        ...prev,
        currentSession: prev.currentSession ? {
          ...prev.currentSession,
          ...updates,
        } : null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [state.currentSession, apiBaseUrl]);

  // Sync recording state with audio hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      recordingDuration: audioRecording.state.duration,
    }));
  }, [audioRecording.state.duration]);

  // Handle audio recording errors
  useEffect(() => {
    if (audioRecording.state.error) {
      setState(prev => ({
        ...prev,
        error: audioRecording.state.error,
      }));
    }
  }, [audioRecording.state.error]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
      }
    };
  }, []);

  return {
    state: {
      ...state,
      isRecording: audioRecording.state.isRecording,
    },
    createSession,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    endSession,
    clearSession,
    updateSession,
  };
};