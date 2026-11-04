import React, { useEffect, useState, useCallback, useRef } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { resourceService, adminService } from '../../services/index.js';
import { Calendar, Plus, Trash2, ChevronDown, Upload, Download, Clock, BookOpen, User, GraduationCap, Users, FileSpreadsheet } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_UPPER = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

const SEMESTERS = [
  'S1 (1st Year)',
  'S2 (1st Year)',
  'S3 (2nd Year)',
  'S4 (2nd Year)',
  'S5 (3rd Year)',
  'S6 (3rd Year)',
  'S7 (4th Year)',
  'S8 (4th Year)',
];

const BATCHES = [
  'Batch A',
  'Batch B',
  'Batch C',
  'All (Full Class)',
];

const TIMES = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00'
];

export default function TimetablePage() {
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState('');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);
  const { showToast, ToastComponent } = useToast();

  const [form, setForm] = useState({
    daysOfWeek: ['MONDAY'],
    startTime: '09:30',
    endTime: '12:30',
    title: '',
    semester: 'S3 (2nd Year)',
    batch: 'Batch A',
    facultyName: '',
  });

  // Load department resources
  useEffect(() => {
    resourceService.getAll({ limit: 100 })
      .then(r => {
        const res = r.data?.resources || [];
        setResources(res);
        if (res.length > 0) setSelectedResource(res[0]._id);
      }).catch(console.error);
  }, []);

  // Fetch timetable for currently selected resource
  const fetchTimetable = useCallback(() => {
    if (!selectedResource) return;
    setLoading(true);
    resourceService.getTimetable(selectedResource)
      .then(r => {
        const entries = r.data?.entries || r.data?.timetable || [];
        setTimetable(entries);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedResource]);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Please enter a course / subject title', 'error');
      return;
    }
    try {
      await resourceService.createTimetableEntry(selectedResource, {
        ...form,
        subject: form.title,
      });
      showToast('Class timetable slot added successfully', 'success');
      setShowForm(false);
      setForm(prev => ({ ...prev, title: '', facultyName: '' }));
      fetchTimetable();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add timetable entry', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminService.deleteTimetableEntry(deleteTarget._id);
      showToast('Timetable entry deleted', 'success');
      fetchTimetable();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete entry', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await adminService.downloadTimetableTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'timetable_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('CSV template downloaded', 'success');
    } catch {
      showToast('Failed to download template', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploadLoading(true);
    try {
      const res = await adminService.uploadTimetableCsv(formData);
      showToast(res.data?.message || 'Timetable imported successfully', 'success');
      fetchTimetable();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to import CSV', 'error');
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Group timetable entries by day of week
  const byDay = DAYS.reduce((acc, _, i) => {
    const dayUpper = DAYS_UPPER[i];
    acc[i] = timetable.filter(t => {
      if (Array.isArray(t.daysOfWeek)) {
        return t.daysOfWeek.map(d => String(d).toUpperCase()).includes(dayUpper);
      }
      return t.dayOfWeek === i;
    });
    return acc;
  }, {});

  const currentResource = resources.find(r => r._id === selectedResource);

  return (
    <AppLayout title="Academic Timetable" breadcrumbs={['Admin', 'Timetable']}>
      {ToastComponent}

      {/* Top Banner & Actions */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-[#1e3a5f] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Academic Class Schedule
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Scheduled classes take booking precedence and protect lab/classroom hours from collision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Hidden CSV file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              className="hidden"
            />

            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary btn-sm gap-1.5 text-xs font-semibold"
              title="Download Excel/CSV Template"
            >
              <Download className="w-3.5 h-3.5" /> Template
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="btn btn-secondary btn-sm gap-1.5 text-xs font-semibold"
              title="Bulk import timetable from CSV"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadLoading ? 'Importing...' : 'Bulk Upload CSV'}
            </button>

            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary btn btn-sm gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> {showForm ? 'Close Form' : 'Add Class Slot'}
            </button>
          </div>
        </div>

        {/* Resource Selector Dropdown */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
            Select Room / Facility:
          </label>
          <div className="relative flex-1 max-w-md w-full">
            <select
              value={selectedResource}
              onChange={e => setSelectedResource(e.target.value)}
              className="form-input appearance-none pr-9 text-sm font-semibold text-[#1e3a5f] bg-white border-gray-300 w-full"
            >
              {resources.map(r => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          {currentResource && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border">
              📍 {currentResource.location || 'Campus'}
            </span>
          )}
        </div>
      </div>

      {/* Add Class Form */}
      {showForm && (
        <div className="card p-6 mb-6 border-2 border-blue-400 shadow-lg fade-in">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div>
              <h3 className="font-bold text-[#1e3a5f] text-base">Schedule New Class / Lab Session</h3>
              <p className="text-xs text-gray-500">
                Adding to: <strong>{currentResource?.name}</strong>
              </p>
            </div>
            <span className="badge-info badge text-xs">College Timings: 09:30 AM – 04:30 PM</span>
          </div>

          <form onSubmit={handleAdd}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              {/* Semester Selector */}
              <div>
                <label className="form-label text-xs font-semibold">Semester</label>
                <select
                  value={form.semester}
                  onChange={e => setForm(p => ({ ...p, semester: e.target.value }))}
                  className="form-input text-sm"
                >
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Batch Selector */}
              <div>
                <label className="form-label text-xs font-semibold">Division / Batch</label>
                <select
                  value={form.batch}
                  onChange={e => setForm(p => ({ ...p, batch: e.target.value }))}
                  className="form-input text-sm font-medium"
                >
                  {BATCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="form-label text-xs font-semibold">Day of Week</label>
                <select
                  value={form.daysOfWeek[0]}
                  onChange={e => setForm(p => ({ ...p, daysOfWeek: [e.target.value] }))}
                  className="form-input text-sm"
                >
                  {DAYS.filter(d => d !== 'Sunday').map(d => (
                    <option key={d} value={d.toUpperCase()}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Subject / Course Title */}
              <div>
                <label className="form-label text-xs font-semibold">Course / Subject Name *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. CS204 Data Structures Lab"
                  className="form-input text-sm"
                  required
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="form-label text-xs font-semibold">Start Time</label>
                <select
                  value={form.startTime}
                  onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                  className="form-input text-sm font-mono"
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* End Time */}
              <div>
                <label className="form-label text-xs font-semibold">End Time</label>
                <select
                  value={form.endTime}
                  onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                  className="form-input text-sm font-mono"
                >
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Faculty Name */}
              <div className="sm:col-span-2">
                <label className="form-label text-xs font-semibold">Faculty / Instructor In-Charge</label>
                <input
                  value={form.facultyName}
                  onChange={e => setForm(p => ({ ...p, facultyName: e.target.value }))}
                  placeholder="e.g. Dr. Ramesh / Prof. Priya"
                  className="form-input text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary btn btn-sm px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary btn btn-sm px-6 font-semibold shadow-sm"
              >
                Save Schedule Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Timetable Listing */}
      {loading ? (
        <LoadingState />
      ) : timetable.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No classes scheduled for this facility"
          description="Use the button above to add weekly lecture/lab batches, or upload a timetable CSV file."
        />
      ) : (
        <div className="space-y-4">
          {DAYS.map((day, i) => {
            const dayEntries = byDay[i] || [];
            if (dayEntries.length === 0) return null;

            return (
              <div key={day} className="card overflow-hidden shadow-sm border border-gray-200">
                <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <h3 className="font-bold text-[#1e3a5f] text-sm uppercase tracking-wider">{day}</h3>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2.5 py-1 rounded-md border">
                    {dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {dayEntries.map(entry => (
                    <div
                      key={entry._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Time Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100/70 text-blue-900 rounded-lg text-xs font-mono font-bold shrink-0">
                          <Clock className="w-3.5 h-3.5 text-blue-700" />
                          <span>{entry.startTime} – {entry.endTime}</span>
                        </div>

                        {/* Title and details */}
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {entry.title || entry.subject}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {entry.semester && (
                              <span className="badge-info badge text-[11px] font-semibold py-0.5">
                                <GraduationCap className="w-3 h-3 mr-1 inline" /> {entry.semester}
                              </span>
                            )}
                            {entry.batch && (
                              <span className="badge-warning badge text-[11px] font-semibold py-0.5">
                                <Users className="w-3 h-3 mr-1 inline" /> {entry.batch}
                              </span>
                            )}
                            {entry.facultyName && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <User className="w-3 h-3 text-gray-400" /> {entry.facultyName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="btn btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg self-end sm:self-center"
                        title="Delete slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Timetable Entry"
        message={`Are you sure you want to remove "${deleteTarget?.title || deleteTarget?.subject}" (${deleteTarget?.startTime} – ${deleteTarget?.endTime})? This slot will immediately become open for student booking.`}
        confirmLabel="Delete Slot"
        confirmClass="btn-danger"
      />
    </AppLayout>
  );
}
