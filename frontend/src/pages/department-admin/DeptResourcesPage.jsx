import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ErrorState, ConfirmDialog, useToast } from '../../components/common/index.jsx';
import { resourceService } from '../../services/index.js';
import { Plus, Pencil, Power, Building2, Search } from 'lucide-react';

const TYPE_ICONS = { CLASSROOM: '🏫', LABORATORY: '🔬', EQUIPMENT: '🖥️', SPORTS_FACILITY: '⚽', SEMINAR_HALL: '🎤' };
const TYPE_LABELS = { CLASSROOM: 'Classroom', LABORATORY: 'Laboratory', EQUIPMENT: 'Equipment', SPORTS_FACILITY: 'Sports Facility', SEMINAR_HALL: 'Seminar Hall' };

export default function DeptResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState(null);
  const { showToast, ToastComponent } = useToast();

  const fetchResources = useCallback(() => {
    setLoading(true);
    resourceService.getAll({ limit: 100 })
      .then(r => setResources(r.data?.resources || []))
      .catch(err => setError(err.response?.data?.message || 'Failed to load resources'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleToggle = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await resourceService.updateStatus(toggleTarget._id, newStatus);
      showToast(`Resource ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
      fetchResources();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status', 'error');
    } finally {
      setToggleTarget(null);
    }
  };

  const filtered = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Manage Resources" breadcrumbs={['Admin', 'Resources']}>
      {ToastComponent}

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            className="form-input pl-9 w-full" />
        </div>
        <Link to="/admin/resources/new" className="btn-primary btn gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Add Resource
        </Link>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchResources} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No resources found" description="Add your first resource to get started"
          action={<Link to="/admin/resources/new" className="btn-primary btn btn-sm gap-1"><Plus className="w-3.5 h-3.5" />Add Resource</Link>} />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_ICONS[r.type]}</span>
                      <div>
                        <p className="font-medium text-gray-800">{r.name}</p>
                        <p className="text-xs text-gray-400">{r.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-600">{TYPE_LABELS[r.type]}</td>
                  <td className="text-gray-600">{r.capacity}</td>
                  <td>
                    <span className={`badge ${r.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <span className="badge-info badge">{r.accessPolicy?.replace(/_/g, ' ')}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/resources/${r._id}/edit`}
                        className="btn btn-ghost btn-sm p-1.5" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => setToggleTarget(r)}
                        className={`btn btn-sm p-1.5 ${r.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}`}
                        title={r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={handleToggle}
        title={toggleTarget?.status === 'ACTIVE' ? 'Deactivate Resource' : 'Activate Resource'}
        message={`Are you sure you want to ${toggleTarget?.status === 'ACTIVE' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        confirmClass={toggleTarget?.status === 'ACTIVE' ? 'btn-danger' : 'btn-success'}
      />
    </AppLayout>
  );
}
