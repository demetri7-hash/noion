'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, FileSignature, FileText, Upload, Check } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  description?: string;
  requiresPhoto: boolean;
  requiresSignature: boolean;
  requiresNotes: boolean;
  photoUrl?: string;
  signatureUrl?: string;
  notes?: string;
}

interface TaskCompletionModalProps {
  task: Task;
  onClose: () => void;
  onComplete: () => void;
}

export default function TaskCompletionModal({ task, onClose, onComplete }: TaskCompletionModalProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [signature, setSignature] = useState<string>('');
  const [notes, setNotes] = useState<string>(task.notes || '');
  const [isDrawing, setIsDrawing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Set up canvas for signature
    if (canvasRef.current && task.requiresSignature) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
      }
    }
  }, [task.requiresSignature]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignature(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignature('');
    }
  };

  const validateCompletion = () => {
    if (task.requiresPhoto && !photoFile && !task.photoUrl) {
      setError('Photo is required');
      return false;
    }
    if (task.requiresSignature && !signature && !task.signatureUrl) {
      setError('Signature is required');
      return false;
    }
    if (task.requiresNotes && !notes.trim()) {
      setError('Notes are required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');

    if (!validateCompletion()) {
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const formData = new FormData();
      formData.append('status', 'completed');

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      if (signature && task.requiresSignature) {
        // Convert base64 to blob
        const response = await fetch(signature);
        const blob = await response.blob();
        formData.append('signature', blob, 'signature.png');
      }

      if (notes) {
        formData.append('notes', notes);
      }

      const response = await fetch(`/api/v2/tasks/${task._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete task');
      }

      onComplete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Photo Capture */}
          {task.requiresPhoto && (
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <Camera className="h-4 w-4 mr-2" />
                Photo *
              </label>
              {photoPreview || task.photoUrl ? (
                <div className="relative">
                  <img
                    src={photoPreview || task.photoUrl}
                    alt="Task photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {!task.photoUrl && (
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreview('');
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Camera className="h-12 w-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Take Photo or Upload</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Signature Capture */}
          {task.requiresSignature && (
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <FileSignature className="h-4 w-4 mr-2" />
                Signature *
              </label>
              {task.signatureUrl && !signature ? (
                <img
                  src={task.signatureUrl}
                  alt="Signature"
                  className="border border-gray-300 rounded-lg p-2"
                />
              ) : (
                <div className="space-y-2">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    className="border-2 border-gray-300 rounded-lg w-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <button
                    onClick={clearSignature}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear Signature
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {task.requiresNotes && (
            <div className="space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4 mr-2" />
                Notes *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add your notes here..."
                disabled={!!task.notes}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete Task
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
