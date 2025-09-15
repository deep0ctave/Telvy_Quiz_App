import React, { useEffect, useMemo, useState } from 'react';
import { listAttempts, getAttemptAdmin } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Search, Filter, Eye, RefreshCw } from 'lucide-react';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const Results = () => {
  const { user } = useAuth();
  const actualUser = user?.user || user;
  const isAllowed = actualUser && ['admin','teacher'].includes(actualUser.role);

  const [filters, setFilters] = useState({
    status: '',
    school: '',
    class: '',
    section: '',
    quiz_title: '',
    student_name: '',
    student_username: '',
    from: '',
    to: '',
    sort: 'started_at_desc'
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    if (!isAllowed) return;
    setLoading(true);
    try {
      const res = await listAttempts({ ...filters, page, limit });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      toast.error('Failed to load attempts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit]);

  const applyFilters = () => {
    setPage(1);
    load();
  };

  const clearFilters = () => {
    setFilters({ status: '', school: '', class: '', section: '', quiz_title: '', student_name: '', student_username: '', from: '', to: '', sort: 'started_at_desc' });
    setPage(1);
    load();
  };

  const openDetail = async (attempt) => {
    setSelected(attempt);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getAttemptAdmin(attempt.attempt_id);
      setDetail(d);
    } catch (e) {
      toast.error('Failed to load attempt detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / Math.max(1, limit))), [total, limit]);

  if (!isAllowed) {
    return (
      <div className="p-6">
        <div className="alert alert-error">You need admin/teacher access.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Results</h1>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <input className="input input-bordered" placeholder="Student name" value={filters.student_name} onChange={e=>setFilters(f=>({...f, student_name:e.target.value}))} />
            <input className="input input-bordered" placeholder="Username" value={filters.student_username} onChange={e=>setFilters(f=>({...f, student_username:e.target.value}))} />
            <input className="input input-bordered" placeholder="Quiz title" value={filters.quiz_title} onChange={e=>setFilters(f=>({...f, quiz_title:e.target.value}))} />
            <select className="select select-bordered" value={filters.status} onChange={e=>setFilters(f=>({...f, status:e.target.value}))}>
              <option value="">Any status</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
            <input className="input input-bordered" placeholder="School" value={filters.school} onChange={e=>setFilters(f=>({...f, school:e.target.value}))} />
            <input className="input input-bordered" placeholder="Class" value={filters.class} onChange={e=>setFilters(f=>({...f, class:e.target.value}))} />
            <input className="input input-bordered" placeholder="Section" value={filters.section} onChange={e=>setFilters(f=>({...f, section:e.target.value}))} />
            <input type="date" className="input input-bordered" value={filters.from} onChange={e=>setFilters(f=>({...f, from:e.target.value}))} />
            <input type="date" className="input input-bordered" value={filters.to} onChange={e=>setFilters(f=>({...f, to:e.target.value}))} />
            <select className="select select-bordered" value={filters.sort} onChange={e=>setFilters(f=>({...f, sort:e.target.value}))}>
              <option value="started_at_desc">Newest started</option>
              <option value="started_at_asc">Oldest started</option>
              <option value="finished_at_desc">Newest finished</option>
              <option value="finished_at_asc">Oldest finished</option>
              <option value="score_desc">Score high→low</option>
              <option value="score_asc">Score low→high</option>
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn btn-primary btn-sm" onClick={applyFilters}><Filter className="w-4 h-4 mr-2"/>Apply</button>
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear</button>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-base-content/60">No attempts found</div>
          ) : (
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Quiz</th>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Duration</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.attempt_id}>
                    <td>
                      <div className="text-sm">
                        <div className="font-medium">{row.student_name}</div>
                        <div className="text-base-content/60">@{row.student_username}</div>
                        <div className="text-base-content/60 text-xs">{row.school} {row.class} {row.section}</div>
                      </div>
                    </td>
                    <td>{row.quiz_title}</td>
                    <td>{new Date(row.started_at).toLocaleString()}</td>
                    <td>{row.finished_at ? new Date(row.finished_at).toLocaleString() : '-'}</td>
                    <td>{formatTime(row.duration_sec || 0)}</td>
                    <td>{row.score !== null ? `${row.score}%` : '-'}</td>
                    <td>
                      <span className={`badge ${row.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>
                    </td>
                    <td className="flex gap-2">
                      <button className="btn btn-sm btn-primary" title="View Attempt" onClick={() => openDetail(row)}>
                        <Eye className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card-body border-t flex items-center justify-between">
          <div className="text-sm">Page {page} of {totalPages} • {total} total</div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <button className="btn btn-sm" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
            <select className="select select-bordered select-sm" value={limit} onChange={e=>{setLimit(parseInt(e.target.value)||20); setPage(1)}}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {selected && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-5xl">
            <h3 className="font-bold text-lg mb-2">Attempt Detail</h3>
            <div className="text-sm text-base-content/60 mb-4">
              {selected.student_name} (@{selected.student_username}) • {selected.quiz_title}
            </div>
            {detailLoading ? (
              <div>Loading...</div>
            ) : !detail ? (
              <div className="text-base-content/60">No details</div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><b>Started:</b> {new Date(detail.started_at).toLocaleString()}</div>
                  <div><b>Finished:</b> {detail.finished_at ? new Date(detail.finished_at).toLocaleString() : '-'}</div>
                  <div><b>Status:</b> {detail.status}</div>
                  <div><b>Score:</b> {detail.score !== null ? `${detail.score}%` : '-'}</div>
                </div>
                <div className="divider">Answers</div>
                <div className="space-y-2">
                  {(detail.state?.questions || []).map((q, idx) => {
                    const isCorrect = (() => {
                      const c = q.correct_answers || [];
                      let a = q.answer;
                      if (a === null || a === undefined || a === '') return false;
                      if (!Array.isArray(a)) a = [a];
                      const cs = new Set(c);
                      const as = new Set(a);
                      return cs.size === as.size && [...cs].every(x => as.has(x));
                    })();
                    return (
                      <div key={q.id} className="p-3 rounded bg-base-200">
                        <div className="font-medium">{idx+1}. {q.question_text}</div>
                        <div className="text-xs mt-1">Answer: {Array.isArray(q.answer) ? q.answer.join(', ') : (q.answer ?? '-')}</div>
                        {q.correct_answers && (
                          <div className="text-xs">Correct: {Array.isArray(q.correct_answers) ? q.correct_answers.join(', ') : '-'}</div>
                        )}
                        <div className={`badge mt-2 ${isCorrect ? 'badge-success' : 'badge-error'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="modal-action">
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Results;


