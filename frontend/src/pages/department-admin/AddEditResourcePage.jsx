import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { resourceService } from '../../services/index.js';
import { useToast } from '../../components/common/index.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../services/api.js';

const TYPES = ['CLASSROOM', 'LABORATORY', 'EQUIPMENT', 'SPORTS_FACILITY', 'SEMINAR_HALL'];
const ACCESS_POLICIES = ['DEPARTMENT_ONLY', 'ALL_DEPARTMENTS', 'RESTRICTED'];
const FEATURE_OPTIONS = ['Projector', 'Air Conditioned', 'High-end PCs', 'Whiteboard', 'WiFi', 'Gigabit LAN', 'Printer', 'Scanner', 'Video Conferencing', 'Floodlights', 'Changing Rooms'];

const DEFAULTS = {
  name: '', type: 'CLASSROOM', location: '', capacity: '', description: '',
  accessPolicy: 'DEPARTMENT_ONLY', features: [], bookingLeadTimeDays: 7, maxBookingDurationHours: 3,
};

export default function AddEditResourcePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  const { showToast, ToastComponent } = useToast();

  const [form, setForm] = useState(DEFAULTS);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});

  // Load departments & existing resource
  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data?.departments || [])).catch(() => {});
    if (isEdit) {
      resourceService.getById(id)
        .then(r => {
          const res = r.data?.resource;
          if (res) {
            setForm({
              name: res.name || '',
              type: res.type || 'CLASSROOM',
              location: res.location || '',
              capacity: res.capacity || '',
              description: res.description || '',
              accessPolicy: res.accessPolicy || 'DEPARTMENT_ONLY',
              features: res.features || [],
              bookingLeadTimeDays: res.bookingLeadTimeDays || 7,
              maxBookingDurationHours: res.maxBookingDurationHours || 3,
              departmentId: res.departmentId?._id || res.departmentId || '',
            });
          }
        })
        .catch(err => showToast('Failed to load resource', 'error'))
        .finally(() => setFetchLoading(false));
    }
  }, [id]);

  const toggleFeature = (feat) => {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(feat)
        ? prev.features.filter(f => f !== feat)
        : [...prev.features, feat],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    if (!form.capacity || form.capacity < 1) e.capacity = 'Valid capacity is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setLoading(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        capacity: parseInt(form.capacity),
        bookingLeadTimeDays: parseInt(form.bookingLeadTimeDays),
        maxBookingDurationHours: parseInt(form.maxBookingDurationHours),
        departmentId: form.departmentId || user?.departmentId?._id,
      };
      if (isEdit) {
        await resourceService.update(id, payload);
        showToast('Resource updated successfully', 'success');
      } else {
        await resourceService.create(payload);
        showToast('Resource created successfully', 'success');
      }
      setTimeout(() => navigate('/admin/resources'), 800);
    } catch (err) {
      showToast(err.response?.data?.message || 'Operation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return (
    <AppLayout title={isEdit ? 'Edit Resource' : 'Add Resource'}>
      <div className="py-16 flex justify-center"><div className="w-8 h-8 border-4 border-[#1e3a5f] border-t-transparent rounded-full animate-spin" /></div>
    </AppLayout>
  );

  return (
    <AppLayout title={isEdit ? 'Edit Resource' : 'Add New Resource'} breadcrumbs={['Admin', 'Resources', isEdit ? 'Edit' : 'New']}>
      {ToastComponent}

      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm mb-4 gap-1.5 -ml-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="card p-6">
            <h3 className="font-semibold text-[#1e3a5f] mb-4">Basic Information</h3>
            <div className="space-y-4">
              <div>
                <label className="form-label">Resource Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Software Engineering Lab 1" className={`form-input ${errors.name ? 'form-input-error' : ''}`} />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Resource Type *</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="form-input">
                    {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Capacity *</label>
                  <input type="number" min={1} value={form.capacity}
                    onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="e.g. 60" className={`form-input ${errors.capacity ? 'form-input-error' : ''}`} />
                  {errors.capacity && <p className="form-error">{errors.capacity}</p>}
                </div>
              </div>

              <div>
                <label className="form-label">Location *</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. CSE Block, 2nd Floor, Room 204" className={`form-input ${errors.location ? 'form-input-error' : ''}`} />
                {errors.location && <p className="form-error">{errors.location}</p>}
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the resource..." rows={3} className="form-input resize-none" />
              </div>
            </div>
          </div>

          {/* Booking Settings */}
          <div className="card p-6">
            <h3 className="font-semibold text-[#1e3a5f] mb-4">Booking Settings</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Access Policy</label>
                <select value={form.accessPolicy} onChange={e => setForm(p => ({ ...p, accessPolicy: e.target.value }))} className="form-input">
                  {ACCESS_POLICIES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Lead Time (days)</label>
                <input type="number" min={1} max={30} value={form.bookingLeadTimeDays}
                  onChange={e => setForm(p => ({ ...p, bookingLeadTimeDays: e.target.value }))} className="form-input" />
                <p className="form-hint">Max days ahead to book</p>
              </div>
              <div>
                <label className="form-label">Max Duration (hours)</label>
                <input type="number" min={1} max={12} value={form.maxBookingDurationHours}
                  onChange={e => setForm(p => ({ ...p, maxBookingDurationHours: e.target.value }))} className="form-input" />
                <p className="form-hint">Per single booking</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="card p-6">
            <h3 className="font-semibold text-[#1e3a5f] mb-4">Features & Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map(feat => (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${form.features.includes(feat)
                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f]'}`}
                >
                  {feat}
                </button>
              ))}
            </div>
            {form.features.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">Selected: {form.features.join(', ')}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary btn flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary btn flex-1 btn-lg gap-2">
              {loading ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isEdit ? 'Saving...' : 'Creating...'}</span>
              ) : (
                <><Save className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Create Resource'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
