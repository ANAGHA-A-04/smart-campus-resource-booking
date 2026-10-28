import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { resourceService, adminService } from '../../services/index.js';
import { Clock, Plus, Trash2, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const BLOCK_TYPES = ['EXAM', 'MAINTENANCE', 'EVENT', 'HOLIDAY', 'OTHER'];
const BLOCK_COLORS = {
  EXAM: 'badge-danger', MAINTENANCE: 'badge-warning', EVENT: 'badge-purple',
  HOLIDAY: 'badge-info', OTHER: 'badge-gray',
};

export default function BlocksPage() {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const [form, setForm] = useState({
    startTime: '', endTime: '', reason: '', blockType: 'EXAM',
  });

  useEffect(() => {
    resourceService.getAll({ limit: 100 })
      .then(r => {
        const res = r.data?.resources || [];
        setResources(res);
        if (res.length > 0) setSelectedResource(res[0]._id);
      }).catch(console.error);
  }, []);

  const fetchBlocks = useCallback(() => {
    if (!selectedResource) return;
    setLoading(true);
    resourceService.getBlocks(selectedResource)
      .then(r => setBlocks(r.data?.blocks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedResource]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime || !form.reason.trim()) {
      showToast('All fields required', 'error'); return;
    }
    try {
      await resourceService.createBlock(selectedResource, {
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        reason: form.reason,
        blockType: form.blockType,
      });
      showToast('Block added successfully', 'success');
      setShowForm(false);
      setForm({ startTime: '', endTime: '', reason: '', blockType: 'EXAM' });
      fetchBlocks();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add block', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteBlock(deleteTarget._id);
      showToast('Block deleted', 'success');
      fetchBlocks();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AppLayout title="Availability Blocks" breadcrumbs={['Admin', 'Blocks']}>
      {ToastComponent}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <select value={selectedResource} onChange={e => setSelectedResource(e.target.value)} className="form-input appearance-none pr-8">
            {resources.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn gap-2">
          <Plus className="w-4 h-4" /> Add Block
        </button>
      </div>

      {/* Add Block Form */}
      {showForm && (
        <div className="card p-5 mb-5 fade-in">
          <h3 className="font-semibold text-[#1e3a5f] mb-4">Add Availability Block</h3>
          <form onSubmit={handleAdd}>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label">Start Date & Time</label>
                <input type="datetime-local" value={form.startTime}
                  onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className="form-input" required />
              </div>
              <div>
                <label className="form-label">End Date & Time</label>
                <input type="datetime-local" value={form.endTime}
                  onChange={e => setForm(p => ({...p, endTime: e.target.value}))} className="form-input" required />
              </div>
              <div>
                <label className="form-label">Block Type</label>
                <select value={form.blockType} onChange={e => setForm(p => ({...p, blockType: e.target.value}))} className="form-input">
                  {BLOCK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Reason</label>
                <input value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))}
                  placeholder="e.g. Semester Practical Examination" className="form-input" required />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn btn-sm">Cancel</button>
              <button type="submit" className="btn-primary btn btn-sm">Add Block</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingState /> : blocks.length === 0 ? (
        <EmptyState icon={Clock} title="No blocks set" description="Add exam, maintenance, or event blocks to prevent bookings during those periods" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Reason</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map(b => (
                <tr key={b._id}>
                  <td><span className={`badge ${BLOCK_COLORS[b.blockType] || 'badge-gray'}`}>{b.blockType}</span></td>
                  <td className="text-gray-700">{b.reason}</td>
                  <td className="text-gray-600 text-xs">{b.startTime ? format(parseISO(b.startTime), 'MMM d, yyyy h:mm a') : ''}</td>
                  <td className="text-gray-600 text-xs">{b.endTime ? format(parseISO(b.endTime), 'MMM d, yyyy h:mm a') : ''}</td>
                  <td>
                    <button onClick={() => setDeleteTarget(b)} className="btn btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Block" message={`Delete the block "${deleteTarget?.reason}"?`}
        confirmLabel="Delete" confirmClass="btn-danger" />
    </AppLayout>
  );
}
