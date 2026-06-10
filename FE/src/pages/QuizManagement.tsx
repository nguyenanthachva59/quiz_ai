import React from 'react';
import {
  Plus, Search, Clock, FileText, Sparkles, CheckCircle2,
  AlertCircle, X, Play, BarChart3, BookOpen, ChevronRight,
  Trash2, User, Shield,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';
import { useNavigate } from 'react-router-dom';

// ── Shared types ────────────────────────────────────────────
interface Document { id: string; file_name: string; status: string; }

interface QuizResult {
  id: string; score: number | null; correct_count: number | null;
  total_questions: number; time_limit_minutes: number;
  time_taken_seconds: number | null; status: string;
  created_at: string; completed_at: string | null;
  document_id?: string;
}

// Quiz result dành cho admin (có thêm user_id, user_name)
interface AdminQuizResult extends QuizResult {
  user_id?: string;
  user_name?: string;
  user_email?: string;
}

// ── Root component: phân nhánh theo role ────────────────────
export default function QuizManagement() {
  const { profile } = useAuth();

  if (profile?.role === 'admin') {
    return <AdminQuizManagement />;
  }

  return <StudentQuizManagement />;
}

// ════════════════════════════════════════════════════════════
// ADMIN VIEW: xem tất cả quiz của mọi user, có thể xóa
// ════════════════════════════════════════════════════════════
function AdminQuizManagement() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = React.useState<AdminQuizResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  React.useEffect(() => {
    if (!token) return;
    fetchAllQuizzes();
  }, [token]);

  const fetchAllQuizzes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/quiz-results`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Không tải được danh sách quiz.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    setDeletingId(quizId);
    try {
      const res = await fetch(`${API_BASE}/admin/quiz-results/${quizId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Xóa thất bại.');
      }
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-on-surface-variant';
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6.5) return 'text-amber-600';
    return 'text-red-500';
  };

  const filtered = quizzes.filter(q => {
    const s = search.toLowerCase();
    return (
      !s ||
      (q.user_name?.toLowerCase().includes(s)) ||
      (q.user_email?.toLowerCase().includes(s)) ||
      (q.user_id?.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
            Quản lý bài Quiz
          </h1>
          <p className="text-on-surface-variant mt-1">
            Xem và quản lý tất cả bài quiz do người dùng tạo trong hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold">
          <Shield size={16} />
          Chế độ quản trị
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Tổng bài quiz',
            value: quizzes.length,
            icon: BookOpen,
            color: 'bg-primary/10 text-primary',
          },
          {
            label: 'Đã hoàn thành',
            value: quizzes.filter(q => q.status === 'completed').length,
            icon: CheckCircle2,
            color: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Điểm trung bình',
            value: (() => {
              const scores = quizzes
                .filter(q => q.score !== null)
                .map(q => q.score as number);
              return scores.length > 0
                ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) + '/10'
                : '—';
            })(),
            icon: BarChart3,
            color: 'bg-orange-50 text-orange-500',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-outline-variant/10 p-5 flex items-center gap-4"
          >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', stat.color)}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">{stat.label}</p>
              <p className="text-2xl font-headline font-extrabold">{loading ? '...' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm theo tên / email người dùng..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <BookOpen size={40} className="opacity-30" />
            <p className="text-sm">
              {search ? 'Không tìm thấy quiz nào phù hợp.' : 'Chưa có bài quiz nào trong hệ thống.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Bài Quiz</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Người dùng</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Điểm số</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Số câu đúng</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Thời gian</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Ngày làm</th>
                <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-surface-container/30 transition-colors">
                  {/* Quiz info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">Quiz {q.total_questions} câu</p>
                        <p className="text-xs text-on-surface-variant">{q.time_limit_minutes} phút</p>
                      </div>
                    </div>
                  </td>

                  {/* User info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                        <User size={13} className="text-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-on-surface">
                          {q.user_name || q.user_id || 'Ẩn danh'}
                        </p>
                        {q.user_email && (
                          <p className="text-xs text-on-surface-variant">{q.user_email}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Score */}
                  <td className="px-6 py-4">
                    <span className={cn('text-xl font-headline font-bold', scoreColor(q.score))}>
                      {q.score !== null ? q.score.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-on-surface-variant">/10</span>
                  </td>

                  {/* Correct count */}
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {q.correct_count !== null ? `${q.correct_count}/${q.total_questions}` : '—'}
                  </td>

                  {/* Time taken */}
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {formatTime(q.time_taken_seconds)}
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4 text-sm text-on-surface-variant">
                    {q.completed_at ? new Date(q.completed_at).toLocaleDateString('vi-VN') : '—'}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate('/quiz/result', { state: { resultId: q.id } })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                      >
                        Xem <ChevronRight size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(q.id)}
                        disabled={deletingId === q.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        {deletingId === q.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-headline font-bold text-on-surface">Xóa bài quiz?</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Hành động này không thể hoàn tác. Kết quả và dữ liệu của bài quiz sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteQuiz(confirmDeleteId)}
                disabled={!!deletingId}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletingId ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STUDENT VIEW: giữ nguyên logic gốc
// ════════════════════════════════════════════════════════════
function StudentQuizManagement() {
  const { token, profile } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [history, setHistory] = React.useState<QuizResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  const [selectedDocId, setSelectedDocId] = React.useState('');
  const [numQuestions, setNumQuestions] = React.useState(() =>
    Number(localStorage.getItem('defaultQuestions') || 10)
  );
  const [difficulty, setDifficulty] = React.useState(() =>
    localStorage.getItem('defaultDifficulty') || 'mixed'
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = React.useState(() =>
    Number(localStorage.getItem('defaultTime') || 50)
  );
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');

  const authHeaders = { Authorization: `Bearer ${token}` };

  React.useEffect(() => {
    if (!token) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [docsRes, histRes] = await Promise.all([
          fetch(`${API_BASE}/documents/`, { headers: authHeaders }),
          fetch(`${API_BASE}/quiz/history/me`, { headers: authHeaders }),
        ]);
        if (docsRes.ok) setDocuments(await docsRes.json());
        if (histRes.ok) setHistory(await histRes.json());
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [token]);

  const pollDocumentStatus = async (docId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await fetch(`${API_BASE}/documents/${docId}`, { headers: authHeaders });
        if (res.ok) {
          const doc = await res.json();
          setDocuments(prev => prev.map(d => d.id === docId ? doc : d));
          if (doc.status === 'done') {
            setSelectedDocId(doc.id);
            break;
          }
        }
      } catch { break; }
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: form,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Upload thất bại.');
      }
      const doc = await res.json();
      setDocuments(prev => [doc, ...prev]);
      setSelectedDocId(doc.id);
      setUploadFile(null);
      await pollDocumentStatus(doc.id);
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!selectedDocId) { setCreateError('Vui lòng chọn tài liệu.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedDocId,
          num_questions: numQuestions,
          difficulty,
          time_limit_minutes: timeLimitMinutes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Tạo quiz thất bại.');
      }
      const quiz = await res.json();
      setShowCreateModal(false);
      navigate('/quiz/taking', {
        state: {
          quiz,
          quizConfig: {
            document_id: selectedDocId,
            num_questions: numQuestions,
            difficulty,
            time_limit_minutes: timeLimitMinutes,
          },
        },
      });
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const availableDocs = documents.filter(d => d.status === 'done');

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-on-surface-variant';
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6.5) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Quản lý bài Quiz</h1>
          <p className="text-on-surface-variant mt-1">Tạo bài kiểm tra từ tài liệu và theo dõi kết quả.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="hero-gradient text-white px-6 py-3 rounded-xl font-headline font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Tạo Quiz mới
        </button>
      </div>

      {/* Banner */}
      <div className="bg-gradient-to-r from-secondary to-secondary-container rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} />
            <span className="font-headline font-bold uppercase tracking-widest text-xs">AI powered</span>
          </div>
          <h3 className="text-xl font-headline font-bold mb-1">Tạo bài Quiz từ tài liệu của bạn</h3>
          <p className="text-white/80 text-sm max-w-md">Upload tài liệu → Sinh câu hỏi AI → Tạo quiz → Làm bài ngay!</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="relative z-10 bg-white text-secondary px-6 py-3 rounded-xl font-bold hover:bg-opacity-90 transition-all whitespace-nowrap"
        >
          Tạo ngay
        </button>
        <div className="absolute right-[-20px] top-[-20px] w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* History */}
      <div>
        <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Lịch sử làm bài</h2>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <BookOpen size={40} className="opacity-30" />
            <p className="text-sm">Chưa có bài quiz nào. Tạo quiz đầu tiên ngay!</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-5 py-2.5 hero-gradient text-white rounded-xl text-sm font-bold"
            >
              Tạo Quiz
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Bài quiz</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Điểm số</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Số câu đúng</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Thời gian làm</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Ngày làm</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">Quiz {r.total_questions} câu</p>
                          <p className="text-xs text-on-surface-variant">{r.time_limit_minutes} phút</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('text-xl font-headline font-bold', scoreColor(r.score))}>
                        {r.score !== null ? r.score.toFixed(1) : '—'}
                      </span>
                      <span className="text-xs text-on-surface-variant">/10</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {r.correct_count !== null ? `${r.correct_count}/${r.total_questions}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {formatTime(r.time_taken_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {r.completed_at ? new Date(r.completed_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate('/quiz/result', { state: { resultId: r.id } })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
                      >
                        Xem lại <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Quiz Modal ─────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 hero-gradient text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Play size={24} />
                <div>
                  <h3 className="text-xl font-headline font-bold">Tạo bài Quiz mới</h3>
                  <p className="text-xs text-white/80">Chọn tài liệu và cấu hình bài kiểm tra</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Upload tài liệu */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">Upload tài liệu mới</label>
                <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-outline-variant/40 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                    onChange={e => {
                      setUploadFile(e.target.files?.[0] ?? null);
                      setUploadError('');
                    }}
                  />
                  <FileText size={28} className="text-primary" />
                  {uploadFile ? (
                    <>
                      <p className="text-sm font-bold text-primary">{uploadFile.name}</p>
                      <p className="text-xs text-on-surface-variant">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-on-surface-variant">Click để chọn file PDF, DOCX hoặc TXT</p>
                      <p className="text-xs text-on-surface-variant/60">Sau khi upload xong, tài liệu sẽ được chọn tự động</p>
                    </>
                  )}
                </label>
                {uploadError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                    <AlertCircle size={16} />
                    {uploadError}
                  </div>
                )}
                {uploadFile && (
                  <button
                    onClick={handleUploadDocument}
                    disabled={uploading}
                    className="w-full py-3 bg-secondary text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Đang upload...
                      </>
                    ) : (
                      <><FileText size={18} />Upload tài liệu</>
                    )}
                  </button>
                )}
              </div>

              {/* Chọn tài liệu */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">Chọn tài liệu</label>
                {availableDocs.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl text-amber-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    Chưa có tài liệu nào. Hãy upload tài liệu ở phía trên.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {availableDocs.map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocId(doc.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                          selectedDocId === doc.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-outline-variant/20 hover:border-primary/40'
                        )}
                      >
                        <FileText size={18} className="shrink-0" />
                        <span className="text-sm font-medium truncate">{doc.file_name}</span>
                        {selectedDocId === doc.id && <CheckCircle2 size={16} className="ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Config */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface">Số câu hỏi</label>
                  <input
                    type="number" min={1} max={50}
                    value={numQuestions}
                    onChange={e => setNumQuestions(Number(e.target.value))}
                    className="w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface">Thời gian (phút)</label>
                  <input
                    type="number" min={5} max={180}
                    value={timeLimitMinutes}
                    onChange={e => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-bold text-on-surface">Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="mixed">Hỗn hợp</option>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} />
                  {createError}
                </div>
              )}

              <button
                onClick={handleCreateQuiz}
                disabled={creating || !selectedDocId}
                className="w-full py-4 hero-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all"
              >
                {creating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Play size={18} />Bắt đầu làm bài</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}