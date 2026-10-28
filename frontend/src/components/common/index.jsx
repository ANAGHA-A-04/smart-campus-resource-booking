import React from 'react';

export function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    gray: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="card p-5 flex items-start gap-4">
      {Icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-[#1e3a5f] mt-0.5">{value ?? '—'}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    CONFIRMED: 'badge-success',
    COMPLETED: 'badge-info',
    CANCELLED: 'badge-danger',
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-gray',
    DEPARTMENT_ONLY: 'badge-info',
    ALL_DEPARTMENTS: 'badge-success',
    RESTRICTED: 'badge-warning',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace(/_/g, ' ')}</span>;
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-10 h-10 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300" />}
      <h3 className="text-gray-700 font-semibold text-lg">{title}</h3>
      {description && <p className="text-gray-400 text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
        <span className="text-red-500 text-xl">!</span>
      </div>
      <h3 className="text-gray-700 font-semibold">Something went wrong</h3>
      <p className="text-gray-400 text-sm max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm btn mt-2">Try Again</button>
      )}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizeMap[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-[#1e3a5f] text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <span className="text-gray-400 text-xl leading-none">×</span>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmClass = 'btn-danger' }) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary btn">Cancel</button>
        <button onClick={onConfirm} className={`btn ${confirmClass}`}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

export function Toast({ message, type = 'success', onClose }) {
  const colors = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  };
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm fade-in ${colors[type]}`}>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100">×</button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };
  const ToastComponent = toast ? (
    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
  ) : null;
  return { showToast, ToastComponent };
}
