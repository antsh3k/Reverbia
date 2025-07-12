/**
 * File Upload Manager Component
 * Complete file upload interface with drag-and-drop, progress tracking, and queue management
 */

import React, { useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { FileUploadZone } from './FileUploadZone';
import { FileUploadProgress } from './FileUploadProgress';

interface FileUploadManagerProps {
  onUploadComplete?: (fileId: string, fileName: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  maxConcurrentUploads?: number;
  showUploadZone?: boolean;
  showProgressList?: boolean;
}

export const FileUploadManager: React.FC<FileUploadManagerProps> = ({
  onUploadComplete,
  onUploadError,
  className = '',
  maxConcurrentUploads = 3,
  showUploadZone = true,
  showProgressList = true,
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const {
    uploads,
    isUploading,
    uploadFile,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useFileUpload();

  // Handle file selection from upload zone
  const handleFilesSelected = async (files: File[]) => {
    setValidationErrors([]);

    // Limit concurrent uploads
    const currentUploads = uploads.filter(u => 
      u.status === 'uploading' || u.status === 'pending'
    ).length;
    
    const availableSlots = Math.max(0, maxConcurrentUploads - currentUploads);
    const filesToUpload = files.slice(0, availableSlots);
    
    if (filesToUpload.length < files.length) {
      setValidationErrors([
        `Only uploading ${filesToUpload.length} of ${files.length} files due to concurrent upload limit (${maxConcurrentUploads})`
      ]);
    }

    // Start uploads
    for (const file of filesToUpload) {
      try {
        await uploadFile(file, {
          onComplete: (fileId) => {
            onUploadComplete?.(fileId, file.name);
          },
          onError: (error) => {
            onUploadError?.(error);
          },
        });
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  // Handle validation errors
  const handleValidationError = (error: string) => {
    setValidationErrors(prev => [...prev, error]);
    onUploadError?.(error);
  };

  // Clear validation errors
  const clearValidationErrors = () => {
    setValidationErrors([]);
  };

  // Get upload statistics
  const getUploadStats = () => {
    const completed = uploads.filter(u => u.status === 'completed').length;
    const failed = uploads.filter(u => u.status === 'error').length;
    const active = uploads.filter(u => 
      u.status === 'uploading' || u.status === 'pending'
    ).length;
    
    return { completed, failed, active, total: uploads.length };
  };

  const stats = getUploadStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Zone */}
      {showUploadZone && (
        <FileUploadZone
          onFilesSelected={handleFilesSelected}
          onValidationError={handleValidationError}
          disabled={stats.active >= maxConcurrentUploads}
        />
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Validation Errors
              </h4>
              <div className="space-y-1">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">
                    {error}
                  </p>
                ))}
              </div>
            </div>
            <button
              onClick={clearValidationErrors}
              className="text-red-400 hover:text-red-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Upload Statistics */}
      {uploads.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-6 text-sm">
              <span className="text-gray-600">
                Total: <span className="font-medium">{stats.total}</span>
              </span>
              {stats.active > 0 && (
                <span className="text-blue-600">
                  Active: <span className="font-medium">{stats.active}</span>
                </span>
              )}
              {stats.completed > 0 && (
                <span className="text-green-600">
                  Completed: <span className="font-medium">{stats.completed}</span>
                </span>
              )}
              {stats.failed > 0 && (
                <span className="text-red-600">
                  Failed: <span className="font-medium">{stats.failed}</span>
                </span>
              )}
            </div>
            
            {(stats.completed > 0 || stats.failed > 0) && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Clear Completed
              </button>
            )}
          </div>

          {/* Overall progress bar */}
          {stats.active > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{stats.completed}/{stats.total} files</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="h-1 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress List */}
      {showProgressList && uploads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Upload Queue
          </h3>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {uploads.map((upload) => (
              <FileUploadProgress
                key={upload.uploadId}
                upload={upload}
                onPause={pauseUpload}
                onResume={resumeUpload}
                onCancel={cancelUpload}
                onRetry={retryUpload}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {uploads.length === 0 && !isUploading && showProgressList && (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            No uploads yet. Upload some audio files to get started.
          </p>
        </div>
      )}
    </div>
  );
};