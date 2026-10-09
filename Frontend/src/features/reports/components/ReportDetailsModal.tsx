import React from 'react';
import { X } from 'lucide-react';

interface ReportDetailsModalProps {
  title: string;
  data: Record<string, any> | null;
  columns?: any[];
  onClose: () => void;
}

export const ReportDetailsModal: React.FC<ReportDetailsModalProps> = ({ title, data, columns, onClose }) => {
  if (!data) return null;

  let displayFields: { key: string; label: string; value: React.ReactNode }[] = [];

  if (columns) {
    displayFields = columns
      .filter((col) => col.key !== 'actions')
      .map((col) => ({
        key: col.key,
        label: col.header || col.key,
        value: col.render ? col.render(data) : data[col.key],
      }))
      .filter((item) => item.value !== undefined && item.value !== null);
  } else {
    displayFields = Object.entries(data)
      .filter(([key, value]) => !key.toLowerCase().endsWith('id') && value !== undefined && value !== null)
      .map(([key, value]) => ({
        key,
        label: key.replace(/([A-Z])/g, ' $1').trim(),
        value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? JSON.stringify(value) : String(value),
      }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            {displayFields.map(({ key, label, value }) => (
              <div key={key}>
                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
