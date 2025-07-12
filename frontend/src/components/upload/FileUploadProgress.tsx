/**
 * File Upload Progress Component
 * Displays upload progress with controls for pause, resume, cancel, and retry
 */

import React from 'react';
import { UploadProgress } from '../../hooks/useFileUpload';

interface FileUploadProgressProps {
  upload: UploadProgress;
  onPause: (uploadId: string) => void;
  onResume: (uploadId: string) => void;
  onCancel: (uploadId: string) => void;
  onRetry: (uploadId: string) => void;
  className?: string;
}

export const FileUploadProgress: React.FC<FileUploadProgressProps> = ({
  upload,
  onPause,
  onResume,
  onCancel,
  onRetry,
  className = '',
}) => {
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get status color
  const getStatusColor = () => {
    switch (upload.status) {
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'paused':
        return 'text-yellow-600';
      case 'uploading':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get progress bar color
  const getProgressColor = () => {
    switch (upload.status) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'uploading':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (upload.status) {
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      case 'paused':
        return 'Paused';
      case 'uploading':
        return 'Uploading';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-4 shadow-sm ${className}`}>
      {/* File info header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {/* File icon */}
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          
          {/* File details */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {upload.fileName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(upload.bytesUploaded)} / {formatFileSize(upload.fileSize)}
            </p>
          </div>
        </div>

        {/* Status and controls */}
        <div className="flex items-center space-x-2">
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          
          {/* Control buttons */}
          <div className="flex space-x-1">
            {upload.status === 'uploading' && (
              <button
                onClick={() => onPause(upload.uploadId)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Pause upload"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            
            {upload.status === 'paused' && (
              <button
                onClick={() => onResume(upload.uploadId)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Resume upload"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            
            {upload.status === 'error' && (
              <button
                onClick={() => onRetry(upload.uploadId)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Retry upload"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            
            {(upload.status === 'uploading' || upload.status === 'paused' || upload.status === 'pending') && (
              <button
                onClick={() => onCancel(upload.uploadId)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="Cancel upload"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{upload.percentage}%</span>
          {upload.status === 'uploading' && (
            <span>Uploading...</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${upload.percentage}%` }}
          />
        </div>
      </div>

      {/* Error message */}
      {upload.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {upload.error}
        </div>
      )}

      {/* Success message */}
      {upload.status === 'completed' && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          Upload completed successfully!
        </div>
      )}
    </div>
  );
};