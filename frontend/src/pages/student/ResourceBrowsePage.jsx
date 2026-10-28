import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { LoadingState, EmptyState, ErrorState } from '../../components/common/index.jsx';
import { resourceService } from '../../services/index.js';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';

const TYPES = ['CLASSROOM', 'LABORATORY', 'EQUIPMENT', 'SPORTS_FACILITY', 'SEMINAR_HALL'];
const TYPE_ICONS = { CLASSROOM: '🏫', LABORATORY: '🔬', EQUIPMENT: '🖥️', SPORTS_FACILITY: '⚽', SEMINAR_HALL: '🎤' };
const TYPE_LABELS = { CLASSROOM: 'Classroom', LABORATORY: 'Laboratory', EQUIPMENT: 'Equipment', SPORTS_FACILITY: 'Sports Facility', SEMINAR_HALL: 'Seminar Hall' };

export default function ResourceBrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [type, setType] = useState(searchParams.get('type') || '');
  const [dept, setDept] = useState(searchParams.get('departmentId') || '');
  const [minCap, setMinCap] = useState(searchParams.get('capacity') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data?.departments || [])).catch(() => {});
  }, []);

  const fetchResources = useCallback(() => {
    setLoading(true);
    setError('');
    const params = { page, limit: 9 };
    if (search) params.search = search;
    if (type) params.type = type;
    if (dept) params.departmentId = dept;
    if (minCap) params.capacity = minCap;

    resourceService.getAll(params)
      .then(r => {
        setResources(r.data?.resources || []);
        setTotal(r.data?.total || 0);
        setTotalPages(r.data?.totalPages || 1);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load resources'))
      .finally(() => setLoading(false));
  }, [search, type, dept, minCap, page]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResources();
  };

  const clearFilters = () => {
    setSearch(''); setType(''); setDept(''); setMinCap(''); setPage(1);
  };

  const hasActiveFilters = search || type || dept || minCap;

  return (
    <AppLayout title="Browse Resources" breadcrumbs={['Home', 'Resources']}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={applyFilters} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="form-input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn-primary btn px-4">Search</button>
        </form>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn btn-secondary gap-2 ${hasActiveFilters ? 'ring-2 ring-[#1e3a5f]' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && <span className="w-2 h-2 bg-[#1e3a5f] rounded-full" />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card p-4 mb-5 fade-in">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Resource Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="form-input">
                <option value="">All Types</option>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Department</label>
              <select value={dept} onChange={e => setDept(e.target.value)} className="form-input">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Min. Capacity</label>
              <input
                type="number"
                value={minCap}
                onChange={e => setMinCap(e.target.value)}
                placeholder="e.g. 30"
                className="form-input"
                min={1}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-ghost btn-sm gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <button onClick={fetchResources} className="btn-primary btn btn-sm">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Type quick-filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        <button onClick={() => { setType(''); setPage(1); }}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${!type ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f]'}`}>
          All
        </button>
        {TYPES.map(t => (
          <button key={t} onClick={() => { setType(t); setPage(1); }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all
              ${type === t ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#1e3a5f]'}`}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-4">{total} resource{total !== 1 ? 's' : ''} found</p>
      )}

      {/* Resources Grid */}
      {loading ? (
        <LoadingState message="Loading resources..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchResources} />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No resources found"
          description="Try adjusting your search or filters"
          action={hasActiveFilters && (
            <button onClick={clearFilters} className="btn-secondary btn btn-sm">Clear Filters</button>
          )}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {resources.map(r => (
              <Link key={r._id} to={`/resources/${r._id}`} className="card hover:shadow-md transition-shadow group">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
                      {TYPE_ICONS[r.type]}
                    </div>
                    <span className={`badge text-xs ${r.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1e3a5f] mb-1 text-sm leading-snug group-hover:text-[#2d5282] transition-colors">
                    {r.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-1">{r.location}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>👥 {r.capacity}</span>
                    <span className="text-gray-300">·</span>
                    <span>{TYPE_LABELS[r.type]}</span>
                  </div>
                  {r.features?.length > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {r.features.slice(0, 3).map(f => (
                        <span key={f} className="badge-info badge text-xs">{f}</span>
                      ))}
                      {r.features.length > 3 && (
                        <span className="badge-gray badge text-xs">+{r.features.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4">
                  <div className="flex justify-end">
                    <span className="text-xs font-medium text-[#1e3a5f] group-hover:underline">View Details →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-2">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary btn-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
