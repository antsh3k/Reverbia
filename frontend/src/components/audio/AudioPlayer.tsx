/**
 * Audio Player Component
 * Provides playback controls for recorded or uploaded audio files
 */

import React, { useEffect } from 'react';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';

interface AudioPlayerProps {
  audioSource?: string | Blob | null;
  autoLoad?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioSource,
  autoLoad = true,
  className = '',
  onPlay,
  onPause,
  onStop,
  onTimeUpdate,
  onError,
}) => {
  const {
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
  } = useAudioPlayer();

  // Auto-load audio when source changes
  useEffect(() => {
    if (audioSource && autoLoad) {
      loadAudio(audioSource);
    }
  }, [audioSource, autoLoad, loadAudio]);

  // Handle callback events
  useEffect(() => {
    if (state.isPlaying) {
      onPlay?.();
    } else {
      onPause?.();
    }
  }, [state.isPlaying, onPlay, onPause]);

  useEffect(() => {
    onTimeUpdate?.(state.currentTime, state.duration);
  }, [state.currentTime, state.duration, onTimeUpdate]);

  useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  };

  // Handle progress bar click
  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * state.duration;
    seek(newTime);
  };

  // Calculate progress percentage
  const progressPercentage = state.duration > 0 
    ? (state.currentTime / state.duration) * 100 
    : 0;

  if (!audioSource) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <p className="text-gray-500 text-center">No audio to play</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Main Controls */}
      <div className="flex items-center space-x-4 p-4">
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={state.isLoading}
          className="
            flex items-center justify-center w-12 h-12 rounded-full
            bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400
            text-white transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-blue-300
          "
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : state.isPlaying ? (
            // Pause icon
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            // Play icon
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={stop}
          disabled={state.isLoading || (!state.isPlaying && state.currentTime === 0)}
          className="
            flex items-center justify-center w-10 h-10 rounded-full
            bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300
            text-white transition-colors duration-200
            focus:outline-none focus:ring-4 focus:ring-gray-300
          "
          aria-label="Stop"
        >
          <div className="w-4 h-4 bg-white rounded-sm" />
        </button>

        {/* Time Display */}
        <div className="flex items-center space-x-2 text-sm font-mono">
          <span>{formatTime(state.currentTime)}</span>
          <span className="text-gray-400">/</span>
          <span>{formatTime(state.duration)}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Playback Rate */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Speed:</span>
          <select
            value={state.playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
            className="
              text-sm border border-gray-300 rounded px-2 py-1
              focus:ring-blue-500 focus:border-blue-500
            "
          >
            <option value={0.5}>0.5x</option>
            <option value={0.75}>0.75x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className="p-1 text-gray-600 hover:text-gray-800"
            aria-label={state.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.isMuted || state.volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.333 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.333l4.05-3.776zm4.95 4.05a1 1 0 011.414 0l1.414 1.414a1 1 0 010 1.414L15.747 11l1.414 1.414a1 1 0 11-1.414 1.414L14.333 12.414l-1.414 1.414a1 1 0 01-1.414-1.414L12.919 11l-1.414-1.414a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.776L4.333 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.333l4.05-3.776zm7.895 2.838a1 1 0 01.164 1.403A7.965 7.965 0 0116 10c0 1.194.26 2.323.738 3.343a1 1 0 11-1.476.954A9.965 9.965 0 0114 10c0-1.636.372-3.18 1.034-4.555a1 1 0 011.403-.164zM14.657 6.343a1 1 0 01.707 1.414A3.982 3.982 0 0015 10a3.982 3.982 0 00-.636 2.243 1 1 0 11-1.414.707A5.982 5.982 0 0113 10c0-.896.197-1.745.55-2.507a1 1 0 011.107-.15z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.isMuted ? 0 : state.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pb-4">
        <div
          className="w-full h-2 bg-gray-200 rounded-full cursor-pointer"
          onClick={handleProgressClick}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        </div>
      )}
    </div>
  );
};