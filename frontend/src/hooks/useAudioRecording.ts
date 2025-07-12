/**
 * Custom hook for audio recording using MediaRecorder API
 * Handles microphone permissions, recording states, and audio processing
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  duration: number;
  audioLevel: number;
  hasPermission: boolean;
  error: string | null;
}

export interface AudioRecordingHook {
  state: RecordingState;
  audioDevices: AudioDevice[];
  selectedDevice: string | null;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  selectDevice: (deviceId: string) => void;
  requestPermission: () => Promise<boolean>;
  clearRecording: () => void;
}

interface UseAudioRecordingOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export const useAudioRecording = (options: UseAudioRecordingOptions = {}): AudioRecordingHook => {
  const {
    mimeType = 'audio/webm;codecs=opus',
    audioBitsPerSecond = 128000,
    sampleRate = 44100,
    echoCancellation = true,
    noiseSuppression = true,
    autoGainControl = true,
  } = options;

  // State management
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isProcessing: false,
    duration: 0,
    audioLevel: 0,
    hasPermission: false,
    error: null,
  });

  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Refs for audio processing
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Check if MediaRecorder is supported
  const isSupported = useCallback(() => {
    return typeof MediaRecorder !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  }, []);

  // Get available audio devices
  const getAudioDevices = useCallback(async (): Promise<AudioDevice[]> => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
        }));
      return audioInputs;
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) {
      setState(prev => ({ ...prev, error: 'Audio recording not supported in this browser' }));
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          sampleRate,
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
        },
      });

      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());

      setState(prev => ({ ...prev, hasPermission: true, error: null }));
      
      // Get available devices after permission granted
      const devices = await getAudioDevices();
      setAudioDevices(devices);
      
      // Set default device if none selected
      if (!selectedDevice && devices.length > 0) {
        setSelectedDevice(devices[0].deviceId);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Permission denied';
      setState(prev => ({ ...prev, hasPermission: false, error: errorMessage }));
      return false;
    }
  }, [isSupported, selectedDevice, echoCancellation, noiseSuppression, autoGainControl, sampleRate, getAudioDevices]);

  // Setup audio analysis for real-time audio level monitoring
  const setupAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      const monitorAudioLevel = () => {
        if (!analyserRef.current || state.isProcessing) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1
        
        setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
        
        if (state.isRecording && !state.isPaused) {
          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
        }
      };

      monitorAudioLevel();
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }
  }, [state.isRecording, state.isPaused, state.isProcessing]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!state.hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          sampleRate,
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
        },
      });

      mediaStreamRef.current = stream;

      // Setup audio analysis
      setupAudioAnalysis(stream);

      // Check if the specified MIME type is supported
      const supportedMimeType = MediaRecorder.isTypeSupported(mimeType) 
        ? mimeType 
        : MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : '';

      if (!supportedMimeType) {
        throw new Error('No supported audio format found');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: supportedMimeType });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        
        // Cleanup
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      startTimeRef.current = Date.now();
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 100);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        isProcessing: false,
        duration: 0,
        error: null,
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setState(prev => ({
        ...prev,
        isRecording: false,
        isProcessing: false,
        error: errorMessage,
      }));
    }
  }, [
    state.hasPermission,
    requestPermission,
    echoCancellation,
    noiseSuppression,
    autoGainControl,
    sampleRate,
    selectedDevice,
    setupAudioAnalysis,
    mimeType,
    audioBitsPerSecond,
  ]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      audioLevel: 0,
    }));
  }, [state.isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      setState(prev => ({ ...prev, isPaused: true, audioLevel: 0 }));
    }
  }, [state.isRecording, state.isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      
      // Resume duration timer
      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 100);

      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  // Select audio device
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
  }, []);

  // Clear current recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setState(prev => ({ ...prev, duration: 0 }));
  }, [audioUrl]);

  // Initialize devices on mount
  useEffect(() => {
    if (state.hasPermission) {
      getAudioDevices().then(setAudioDevices);
    }
  }, [state.hasPermission, getAudioDevices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        stopRecording();
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [stopRecording, state.isRecording, audioUrl]);

  return {
    state,
    audioDevices,
    selectedDevice,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    selectDevice,
    requestPermission,
    clearRecording,
  };
};