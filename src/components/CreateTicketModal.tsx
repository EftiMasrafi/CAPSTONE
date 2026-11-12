import React, { useState } from 'react';
import { Category, TicketPriority } from '../types';
import { apiRequest } from '../lib/api';
import { X, Upload, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface CreateTicketModalProps {
  categories: Category[];
  onClose: () => void;
  onTicketCreated: (newTicketId: number) => void;
}

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  categories,
  onClose,
  onTicketCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.category_id || '');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [location, setLocation] = useState('');
  const [photoData, setPhotoData] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo must be smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData({
        name: file.name,
        type: file.type || 'image/jpeg',
        size: file.size,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !categoryId || !location.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await apiRequest<{ ticket_id: number; message: string }>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          priority,
          location: location.trim(),
          photo: photoData
            ? {
                file_name: photoData.name,
                file_type: photoData.type,
                file_size: photoData.size,
                file_data: photoData.base64,
              }
            : null,
        }),
      });

      onTicketCreated(res.ticket_id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickLocations = [
    'Science Complex - Lab 402',
    'Turing Computing Center - Server Bay 3',
    'Engineering Hall - Lab 115',
    'Biomedical Annex - Cryo Storage',
    'Franklin Lecture Hall 101',
    'North Quadrangle Utility Plant',
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Report Maintenance Issue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Submit a campus work order for facilities, laboratory equipment, or IT assets.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Issue Title / Equipment Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Centrifuge 4B Vibration Alarm, Fume Hood Low Flow Warning..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Asset Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Priority *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="Low">Low - Cosmetic or non-urgent</option>
                <option value="Medium">Medium - Standard operational impact</option>
                <option value="High">High - Halts experiment or lecture</option>
                <option value="Critical">Critical - Safety risk / power failure</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Building & Room Location *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Science Complex - Molecular Biology Lab 402"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
            {/* Quick Location Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-slate-400 mr-1">Quick fill:</span>
              {quickLocations.map((loc) => (
                <button
                  type="button"
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Problem Description *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe symptoms, error codes displayed, unusual sounds, and what happened prior to failure..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Photo Upload Attachment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Optional Equipment Photo / Error Screenshot (Max 5MB)
            </label>
            {photoData ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {photoData.name} ({(photoData.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoData(null)}
                  className="text-rose-500 hover:underline cursor-pointer text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-center">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Click to select photo or evidence document
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WEBP, or PDF up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Footer Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              {isSubmitting ? 'Submitting & Dispatching...' : 'Submit Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
