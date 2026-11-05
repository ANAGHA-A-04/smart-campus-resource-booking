import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, Modal, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { adminManagementService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Shield, Plus, Trash2, Mail, User, Lock, Building2, Search, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../services/api.js';

export default function ManageAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'DEPARTMENT_ADMIN',
    departmentId: '',
  });

  // Fetch all departments
  useEffect(() => {
    api.get('/departments')
      .then((res) => {
        const depts = res.data?.departments || [];
        setDepartments(depts);
      })
      .catch((err) => console.error('Failed to load departments', err));
  }, []);

  // Fetch all admins across all departments
  const fetchAdmins = useCallback(() => {
    setLoading(true);
    adminManagementService.getAdmins()
      .then((res) => setAdmins(res.data?.admins || []))
      .catch((err) => showToast(err.response?.data?.message || 'Failed to load administrators', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      showToast('Name, email, and password are required', 'error');
      return;
    }
    if (form.role === 'DEPARTMENT_ADMIN' && !form.departmentId) {
      showToast('Please select a department for the administrator', 'error');
      return;
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminManagementService.createAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        departmentId: form.role === 'DEPARTMENT_ADMIN' ? form.departmentId : null,
      });
      showToast(res.data?.message || 'Administrator added successfully', 'success');
      setShowAddModal(false);
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'DEPARTMENT_ADMIN',
        departmentId: '',
      });
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add administrator', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await adminManagementService.deleteAdmin(deleteTarget._id);
      showToast(res.data?.message || 'Administrator removed', 'success');
      setDeleteTarget(null);
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete administrator', 'error');
    }
  };

  // Filtered list based on search and selected department
  const filteredAdmins = admins.filter((adm) => {
    const matchesSearch =
      adm.name.toLowerCase().includes(search.toLowerCase()) ||
      adm.email.toLowerCase().includes(search.toLowerCase()) ||
      (adm.departmentId?.name && adm.departmentId.name.toLowerCase().includes(search.toLowerCase())) ||
      (adm.departmentId?.code && adm.departmentId.code.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedDeptFilter === 'ALL') return true;
    if (selectedDeptFilter === 'SPORTS') return adm.role === 'SPORTS_ADMIN';
    return adm.departmentId?._id === selectedDeptFilter || adm.departmentId === selectedDeptFilter;
  });

  return (
    <AppLayout
      title="Administrators"
      breadcrumbs={['Admin', 'All Administrators']}
    >
      {ToastComponent}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1e3a5f]">Campus Administrators</h2>
          <p className="text-sm text-gray-500">
            View, add, and manage administrators across all branches and sports facilities.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary btn gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Administrator
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="form-input pl-9 w-full"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="form-input w-full"
          >
            <option value="ALL">All Departments & Facilities</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name} ({dept.code})
              </option>
            ))}
            <option value="SPORTS">Sports Directorate</option>
          </select>
        </div>
      </div>

      {/* Admins Table */}
      {loading ? (
        <LoadingState message="Loading administrators across all departments..." />
      ) : filteredAdmins.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No administrators found"
          description={
            search || selectedDeptFilter !== 'ALL'
              ? 'Try adjusting your search query or department filter.'
              : 'Click Add Administrator to add an admin for any branch.'
          }
          action={
            <button onClick={() => setShowAddModal(true)} className="btn-primary btn btn-sm gap-1">
              <Plus className="w-4 h-4" /> Add Administrator
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Email Address</th>
                <th>Department / Branch</th>
                <th>Role</th>
                <th>Added On</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((adm) => {
                const isSelf = adm._id === user?._id;
                const isSports = adm.role === 'SPORTS_ADMIN';
                return (
                  <tr key={adm._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSports ? 'bg-[#276749]' : 'bg-[#1e3a5f]'
                          }`}
                        >
                          {adm.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                            {adm.name}
                            {isSelf && <span className="badge badge-info text-[10px] py-0 px-1.5">You</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="text-gray-600 font-mono text-xs">{adm.email}</td>
                    <td>
                      {isSports ? (
                        <span className="badge bg-green-100 text-green-800 text-xs font-medium">
                          Sports Directorate
                        </span>
                      ) : (
                        <span className="badge bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium">
                          {adm.departmentId?.name || 'Department'}
                          {adm.departmentId?.code ? ` (${adm.departmentId.code})` : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-gray text-xs">
                        {isSports ? 'Sports Admin' : 'Dept Admin'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {adm.createdAt ? format(parseISO(adm.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">Logged In</span>
                      ) : (
                        <button
                          onClick={() => setDeleteTarget(adm)}
                          className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 p-1.5"
                          title="Remove administrator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Administrator Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Administrator"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" /> Full Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Dr. Priya Nair"
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" /> Institutional Email Address *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="e.g. priya@ug.cusat.ac.in"
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gray-400" /> Admin Role *
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="form-input w-full"
            >
              <option value="DEPARTMENT_ADMIN">Department Administrator</option>
              <option value="SPORTS_ADMIN">Sports Administrator</option>
            </select>
          </div>

          {form.role === 'DEPARTMENT_ADMIN' && (
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" /> Assigned Department / Branch *
              </label>
              <select
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                className="form-input w-full"
                required
              >
                <option value="" disabled>Select a department or branch</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="form-label flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-gray-400" /> Initial Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 8 characters"
              className="form-input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              The new administrator can immediately log in with this password.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary btn"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary btn">
              {submitting ? 'Creating...' : 'Create Administrator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Administrator"
        message={
          deleteTarget
            ? `Are you sure you want to remove administrator ${deleteTarget.name} (${deleteTarget.email})? They will lose access to ${
                deleteTarget.role === 'SPORTS_ADMIN'
                  ? 'the Sports Directorate'
                  : deleteTarget.departmentId?.name || 'department administration'
              } immediately.`
            : ''
        }
        confirmLabel="Remove Administrator"
        confirmClass="btn-danger"
      />
    </AppLayout>
  );
}
