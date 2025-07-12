/**
 * Custom hook for audio playback functionality
 * Handles audio playback controls, progress tracking, and metadata
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  error: string | null;
}

export interface AudioPlayerHook {
  state: AudioPlayerState;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  loadAudio: (audioUrl: string | Blob) => Promise<void>;
  formatTime: (seconds: number) => string;
}

export const useAudioPlayer = (): AudioPlayerHook => {
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    playbackRate: 1,
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Update current time during playback
  const updateCurrentTime = useCallback(() => {
    if (audioRef.current && state.isPlaying) {
      setState(prev => ({
        ...prev,
        currentTime: audioRef.current?.currentTime || 0,
      }));
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime);
    }
  }, [state.isPlaying]);

  // Load audio from URL or Blob
  const loadAudio = useCallback(async (audioSource: string | Blob): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Create audio element if it doesn't exist
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      const audio = audioRef.current;

      // Convert Blob to URL if necessary
      const audioUrl = audioSource instanceof Blob 
        ? URL.createObjectURL(audioSource) 
        : audioSource;

      // Set up event listeners
      const handleLoadedMetadata = () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration || 0,
          isLoading: false,
        }));
      };

      const handleCanPlay = () => {
        setState(prev => ({ ...prev, isLoading: false }));
      };

      const handleError = () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load audio file',
        }));
      };

      const handleEnded = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
        }));
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      // Remove existing listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);

      // Add new listeners
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);
      audio.addEventListener('ended', handleEnded);

      // Load the audio
      audio.src = audioUrl;
      audio.load();

      // Clean up blob URL if we created it
      if (audioSource instanceof Blob) {
        audio.addEventListener('loadstart', () => {
          URL.revokeObjectURL(audioUrl);
        }, { once: true });
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load audio',
      }));
    }
  }, []);

  // Play audio
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) {
      setState(prev => ({ ...prev, error: 'No audio loaded' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      await audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
      updateCurrentTime();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to play audio',
        isPlaying: false,
      }));
    }
  }, [updateCurrentTime]);

  // Pause audio
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, []);

  // Stop audio (pause and reset to beginning)
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
      }));
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, []);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      const clampedTime = Math.max(0, Math.min(time, state.duration));
      audioRef.current.currentTime = clampedTime;
      setState(prev => ({ ...prev, currentTime: clampedTime }));
    }
  }, [state.duration]);

  // Set volume (0-1)
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    
    setState(prev => ({
      ...prev,
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMutedState = !state.isMuted;
      audioRef.current.muted = newMutedState;
      setState(prev => ({ ...prev, isMuted: newMutedState }));
    }
  }, [state.isMuted]);

  // Set playback rate
  const setPlaybackRate = useCallback((rate: number) => {
    const clampedRate = Math.max(0.25, Math.min(4, rate));
    
    if (audioRef.current) {
      audioRef.current.playbackRate = clampedRate;
    }
    
    setState(prev => ({ ...prev, playbackRate: clampedRate }));
  }, []);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds)) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // Initialize audio element and apply initial settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      audioRef.current.playbackRate = state.playbackRate;
      audioRef.current.muted = state.isMuted;
    }
  }, [state.volume, state.playbackRate, state.isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  return {
    state,
    play,
    pause,
    stop,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    loadAudio,
    formatTime,
  };
};