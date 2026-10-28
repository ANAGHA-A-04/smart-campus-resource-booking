import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import { studentRosterService } from '../../services/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Users,
  Upload,
  Plus,
  Download,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  Filter,
  RefreshCw,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export default function StudentRosterPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadYear, setUploadYear] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Single Add state
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    name: '',
    institutionalEmail: '',
    academicYear: '',
  });
  const [adding, setAdding] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedYear) params.academicYear = selectedYear;
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery) params.search = searchQuery;

      const res = await studentRosterService.getStudents(params);
      if (res.data.success) {
        setStudents(res.data.students);
        setTotal(res.data.total);
        if (res.data.academicYears) {
          setAcademicYears(res.data.academicYears);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedYear, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await studentRosterService.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_roster_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to download template CSV');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a CSV file');
      return;
    }
    if (!uploadYear) {
      setError('Please specify the academic year / batch');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('academicYear', uploadYear);

      const res = await studentRosterService.uploadCsv(formData);
      if (res.data.success) {
        setUploadResult(res.data);
        setSuccessMsg(res.data.message);
        fetchStudents();
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setUploadResult(null);
        }, 2500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process CSV file');
    } finally {
      setUploading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setAdding(true);
      setError('');
      const res = await studentRosterService.addStudent(newStudent);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setShowAddModal(false);
        setNewStudent({ studentId: '', name: '', institutionalEmail: '', academicYear: '' });
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student');
    } finally {
      setAdding(false);
    }
  };

  const handleStatusToggle = async (studentId, currentStatus) => {
    const newStatus = currentStatus === 'ELIGIBLE' ? 'INELIGIBLE' : 'ELIGIBLE';
    try {
      const res = await studentRosterService.updateStatus(studentId, newStatus);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update student status');
    }
  };

  const handleDelete = async (studentId, roll) => {
    if (!window.confirm(`Are you sure you want to remove student ${roll} from the verified roster?`)) return;
    try {
      const res = await studentRosterService.deleteStudent(studentId);
      if (res.data.success) {
        setSuccessMsg(res.data.message);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete student');
    }
  };

  const eligibleCount = students.filter((s) => s.eligibilityStatus === 'ELIGIBLE').length;
  const registeredCount = students.filter((s) => s.registeredUser?.emailVerified).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#1e3a5f]" />
              <h1 className="text-2xl font-bold text-[#1e3a5f]">
                {user?.departmentId?.name || 'Department'} – Student Eligibility Roster
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Authorized dataset of enrolled students. Only students in this roster can register accounts and access department-restricted resources.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-outline text-xs flex items-center gap-1.5 border-gray-300 hover:bg-gray-50"
              title="Download CSV format template"
            >
              <Download className="h-4 w-4 text-gray-600" />
              Template CSV
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Upload Batch CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn text-xs flex items-center gap-1.5 bg-[#2d5282] text-white hover:bg-[#1e3a5f]"
            >
              <Plus className="h-4 w-4" />
              Add Student
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Enrolled in Roster</p>
              <p className="text-2xl font-bold text-[#1e3a5f] mt-1">{total}</p>
            </div>
            <div className="p-3 bg-blue-50 text-[#1e3a5f] rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Eligible Students</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{eligibleCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Registered Accounts</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{registeredCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative w-full">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Roll No, Name, Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              />
            </div>
            <button type="submit" className="btn btn-outline py-2 px-3 text-sm">
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Batch:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">All Academic Batches</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
              >
                <option value="">All Statuses</option>
                <option value="ELIGIBLE">Eligible</option>
                <option value="INELIGIBLE">Ineligible / Suspended</option>
                <option value="GRADUATED">Graduated</option>
              </select>
            </div>

            <button
              onClick={fetchStudents}
              className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#1e3a5f]" />
              <p>Loading student dataset...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-700">No students found</p>
              <p className="text-xs text-gray-400 mt-1">Upload a CSV or add students manually to populate your department roster.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f7f8fc] border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student ID / Roll</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Institutional Email</th>
                    <th className="py-3 px-4">Academic Batch</th>
                    <th className="py-3 px-4">Platform Account</th>
                    <th className="py-3 px-4">Eligibility Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1e3a5f]">
                        {student.studentId}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {student.institutionalEmail}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                          {student.academicYear}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {student.registeredUser ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Registered
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Not Registered
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {student.eligibilityStatus === 'ELIGIBLE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            ELIGIBLE
                          </span>
                        )}
                        {student.eligibilityStatus === 'INELIGIBLE' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            INELIGIBLE
                          </span>
                        )}
                        {student.eligibilityStatus === 'GRADUATED' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            GRADUATED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatusToggle(student._id, student.eligibilityStatus)}
                            className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
                              student.eligibilityStatus === 'ELIGIBLE'
                                ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={student.eligibilityStatus === 'ELIGIBLE' ? 'Suspend Student' : 'Activate Student'}
                          >
                            {student.eligibilityStatus === 'ELIGIBLE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(student._id, student.studentId)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors"
                            title="Remove from roster"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload CSV Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-lg text-[#1e3a5f] flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Batch Student Dataset (CSV)
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Academic Year / Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 2024-2028 or 2025"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                  <p className="text-xs text-gray-400 mt-1">Students will be organized under this batch year.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select CSV File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    required
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1e3a5f] file:text-white hover:file:bg-[#2d5282]"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 space-y-1">
                  <p className="font-semibold">Required CSV Columns:</p>
                  <p className="font-mono">studentId, name, institutionalEmail</p>
                  <p className="text-gray-500">Emails must end in @ug.cusat.ac.in or @pg.cusat.ac.in.</p>
                </div>

                {uploadResult && (
                  <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-800">
                    <p className="font-bold">Upload Result:</p>
                    <p>Added: {uploadResult.addedCount} | Updated: {uploadResult.updatedCount} | Skipped: {uploadResult.skippedCount}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="btn btn-outline text-xs"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                    disabled={uploading}
                  >
                    {uploading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {uploading ? 'Processing CSV...' : 'Upload & Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Manual Add Student Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-lg text-[#1e3a5f] flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Student to Eligibility Roster
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Student ID / Roll Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024CS015"
                    value={newStudent.studentId}
                    onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value.toUpperCase() })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Institutional Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rahul@ug.cusat.ac.in"
                    value={newStudent.institutionalEmail}
                    onChange={(e) => setNewStudent({ ...newStudent, institutionalEmail: e.target.value.toLowerCase() })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Academic Year / Batch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-2028"
                    value={newStudent.academicYear}
                    onChange={(e) => setNewStudent({ ...newStudent, academicYear: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-outline text-xs"
                    disabled={adding}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs flex items-center gap-1.5"
                    disabled={adding}
                  >
                    {adding && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                    {adding ? 'Saving...' : 'Add to Roster'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
