import React, { useEffect, useState, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { resourceService, adminService } from '../../services/index.js';
import { Calendar, Plus, Trash2, ChevronDown } from 'lucide-react';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TIMES = Array.from({length: 29}, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2,'0')}:${m}`;
});

export default function TimetablePage() {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const [form, setForm] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '10:00', subject: '', facultyName: '', semester: '' });

  useEffect(() => {
    resourceService.getAll({ limit: 100 })
      .then(r => {
        const res = r.data?.resources || [];
        setResources(res);
        if (res.length > 0) setSelectedResource(res[0]._id);
      }).catch(console.error);
  }, []);

  const fetchTimetable = useCallback(() => {
    if (!selectedResource) return;
    setLoading(true);
    resourceService.getTimetable(selectedResource)
      .then(r => setTimetable(r.data?.timetable || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedResource]);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await resourceService.createTimetableEntry(selectedResource, form);
      showToast('Timetable entry added', 'success');
      setShowForm(false);
      fetchTimetable();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add entry', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteTimetableEntry(deleteTarget._id);
      showToast('Entry deleted', 'success');
      fetchTimetable();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Group by day of week
  const byDay = DAYS.reduce((acc, _, i) => {
    acc[i] = timetable.filter(t => t.dayOfWeek === i);
    return acc;
  }, {});

  return (
    <AppLayout title="Timetable Management" breadcrumbs={['Admin', 'Timetable']}>
      {ToastComponent}

      {/* Resource selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <select value={selectedResource} onChange={e => setSelectedResource(e.target.value)}
            className="form-input appearance-none pr-8">
            {resources.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn gap-2">
          <Plus className="w-4 h-4" /> Add Entry
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card p-5 mb-5 fade-in">
          <h3 className="font-semibold text-[#1e3a5f] mb-4">New Timetable Entry</h3>
          <form onSubmit={handleAdd}>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="form-label">Day of Week</label>
                <select value={form.dayOfWeek} onChange={e => setForm(p => ({...p, dayOfWeek: parseInt(e.target.value)}))} className="form-input">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Start Time</label>
                <select value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className="form-input">
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">End Time</label>
                <select value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} className="form-input">
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Subject</label>
                <input value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))}
                  placeholder="e.g. CS301 Data Structures" className="form-input" required />
              </div>
              <div>
                <label className="form-label">Faculty Name</label>
                <input value={form.facultyName} onChange={e => setForm(p => ({...p, facultyName: e.target.value}))}
                  placeholder="e.g. Dr. Ramesh" className="form-input" />
              </div>
              <div>
                <label className="form-label">Semester</label>
                <input value={form.semester} onChange={e => setForm(p => ({...p, semester: e.target.value}))}
                  placeholder="e.g. S5 CSE" className="form-input" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary btn btn-sm">Cancel</button>
              <button type="submit" className="btn-primary btn btn-sm">Add Entry</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <LoadingState /> : timetable.length === 0 ? (
        <EmptyState icon={Calendar} title="No timetable entries" description="Add class schedules to prevent booking conflicts" />
      ) : (
        <div className="space-y-4">
          {DAYS.map((day, i) => byDay[i].length > 0 && (
            <div key={i} className="card">
              <div className="card-header">
                <h3 className="font-semibold text-[#1e3a5f]">{day}</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {byDay[i].map(entry => (
                  <div key={entry._id} className="flex items-center gap-4 px-6 py-3">
                    <div className="w-24 text-sm font-mono text-gray-600 flex-shrink-0">
                      {entry.startTime} – {entry.endTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">{entry.subject}</p>
                      <p className="text-xs text-gray-400">{entry.facultyName}{entry.semester ? ` · ${entry.semester}` : ''}</p>
                    </div>
                    <button onClick={() => setDeleteTarget(entry)} className="btn btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Entry" message={`Delete timetable entry for "${deleteTarget?.subject}"?`}
        confirmLabel="Delete" confirmClass="btn-danger" />
    </AppLayout>
  );
}
