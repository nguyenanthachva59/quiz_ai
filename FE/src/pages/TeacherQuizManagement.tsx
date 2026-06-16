import React from 'react';
import {
  Plus, FileText, Sparkles, AlertCircle, X, Play, Eye,
  Pencil, Trash2, CheckCircle2, Clock, ChevronDown, ChevronUp,
  BookOpen, GraduationCap,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

interface Document { id: string; file_name: string; status: string; }

interface TeacherQuiz {
  id: string;
  title: string;
  document_id: string;
  num_questions: number;
  difficulty: string;
  time_limit_minutes: number;
  created_at: string;
  questions?: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  content: string;
  options: { key: string; text: string }[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  topic: string;
}

const diffLabel: Record<string, string> = {
  easy: 'Dễ', medium: 'Trung bình', hard: 'Khó', mixed: 'Hỗn hợp',
};
const diffColor: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-600',
  medium: 'bg-amber-50 text-amber-600',
  hard: 'bg-red-50 text-red-500',
  mixed: 'bg-primary/10 text-primary',
};

export default function TeacherQuizManagement() {
  const { token } = useAuth();
  const authH = { Authorization: `Bearer ${token}` };

  const [quizzes, setQuizzes] = React.useState<TeacherQuiz[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal tạo quiz
  const [showCreate, setShowCreate] = React.useState(false);
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [selectedDocId, setSelectedDocId] = React.useState('');
  const [quizTitle, setQuizTitle] = React.useState('');
  const [numQuestions, setNumQuestions] = React.useState(10);
  const [difficulty, setDifficulty] = React.useState('mixed');
  const [timeLimit, setTimeLimit] = React.useState(30);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState('');
  const [uploadError, setUploadError] = React.useState('');

  // Preview
  const [previewQuiz, setPreviewQuiz] = React.useState<TeacherQuiz | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [expandedQ, setExpandedQ] = React.useState<string | null>(null);

  // Edit tên
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editTime, setEditTime] = React.useState(30);
  const [saving, setSaving] = React.useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/quiz/teacher/my`, { headers: authH }),
        fetch(`${API_BASE}/documents/`, { headers: authH }),
      ]);
      if (qRes.ok) setQuizzes(await qRes.json());
      if (dRes.ok) {
        const docs = await dRes.json();
        setDocuments(docs.filter((d: Document) => d.status === 'done'));
      }
    } finally { setLoading(false); }
  };

  const pollDocStatus = async (docId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await fetch(`${API_BASE}/documents/${docId}`, { headers: authH });
        if (res.ok) {
          const doc = await res.json();
          setDocuments(prev => {
            const exists = prev.find(d => d.id === docId);
            if (exists) return prev.map(d => d.id === docId ? doc : d);
            return doc.status === 'done' ? [doc, ...prev] : prev;
          });
          if (doc.status === 'done') { setSelectedDocId(doc.id); break; }
        }
      } catch { break; }
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true); setUploadError('');
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST', headers: authH, body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Upload thất bại.');
      const doc = await res.json();
      setUploadFile(null);
      await pollDocStatus(doc.id);
    } catch (e: any) { setUploadError(e.message); }
    finally { setUploading(false); }
  };

  const handleCreate = async () => {
    if (!quizTitle.trim()) { setCreateError('Vui lòng nhập tên quiz.'); return; }
    if (!selectedDocId) { setCreateError('Vui lòng chọn tài liệu.'); return; }
    setCreating(true); setCreateError('');
    try {
      const res = await fetch(`${API_BASE}/quiz/teacher/create`, {
        method: 'POST',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedDocId,
          title: quizTitle,
          num_questions: numQuestions,
          difficulty,
          time_limit_minutes: timeLimit,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Tạo quiz thất bại.');
      const quiz = await res.json();
      setQuizzes(prev => [quiz, ...prev]);
      setShowCreate(false);
      setQuizTitle(''); setSelectedDocId(''); setUploadFile(null);
      // Tự mở preview ngay sau khi tạo
      await openPreview(quiz.id);
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreating(false); }
  };

  const openPreview = async (quizId: string) => {
    setLoadingPreview(true); setExpandedQ(null);
    try {
      const res = await fetch(`${API_BASE}/quiz/teacher/${quizId}/preview`, { headers: authH });
      if (!res.ok) throw new Error('Không lấy được quiz.');
      const data = await res.json();
      setPreviewQuiz(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingPreview(false); }
  };

  const handleSaveEdit = async (quizId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/quiz/teacher/${quizId}`, {
        method: 'PATCH',
        headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, time_limit_minutes: editTime }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Lưu thất bại.');
      const updated = await res.json();
      setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, ...updated } : q));
      setEditingId(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (quizId: string) => {
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/quiz/teacher/${quizId}`, { method: 'DELETE', headers: authH });
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      setConfirmDeleteId(null);
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">Quản lý Quiz</h1>
          <p className="text-on-surface-variant mt-1">
            Tạo quiz từ tài liệu, xem trước và giao vào lớp học.
          </p>
        </div>
        <button
          onClick={() => { setQuizTitle(''); setSelectedDocId(''); setCreateError(''); setUploadError(''); setUploadFile(null); setShowCreate(true); }}
          className="hero-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />Tạo quiz mới
        </button>
      </div>

      {/* Banner */}
      <div className="hero-gradient rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">AI Powered</span>
          </div>
          <h3 className="text-xl font-headline font-bold mb-1">Quy trình tạo quiz</h3>
          <div className="flex flex-wrap gap-4 text-sm text-white/80 mt-2">
            {['1. Upload tài liệu', '2. Đặt tên & cấu hình', '3. AI tạo câu hỏi', '4. Xem preview & kiểm tra', '5. Giao vào lớp'].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-white/60" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10"><BookOpen size={160} /></div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={16} /></button>
        </div>
      )}

      {/* Danh sách quiz */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span>Đang tải...</span>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant">
          <FileText size={48} className="opacity-20" />
          <p>Chưa có quiz nào. Tạo quiz đầu tiên!</p>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 hero-gradient text-white rounded-xl text-sm font-bold">
            Tạo quiz ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
              {editingId === quiz.id ? (
                // Edit mode
                <div className="p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl border border-outline-variant/30 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Tên quiz"
                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit(quiz.id)}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={5} max={180} value={editTime}
                      onChange={e => setEditTime(+e.target.value)}
                      className="w-24 px-3 py-2 rounded-xl border border-outline-variant/30 text-sm outline-none focus:border-primary"
                    />
                    <span className="text-xs text-on-surface-variant whitespace-nowrap">phút</span>
                    <button onClick={() => handleSaveEdit(quiz.id)} disabled={saving}
                      className="px-4 py-2 hero-gradient text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-1.5">
                      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={15} />}
                      Lưu
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-2 border border-outline-variant/20 rounded-xl text-sm font-bold hover:bg-surface-container transition-all">
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center shrink-0">
                      <Play size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-on-surface text-base truncate">{quiz.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', diffColor[quiz.difficulty] || 'bg-surface-container text-on-surface-variant')}>
                          {diffLabel[quiz.difficulty] || quiz.difficulty}
                        </span>
                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          <BookOpen size={12} />{quiz.num_questions} câu
                        </span>
                        <span className="text-xs text-on-surface-variant flex items-center gap-1">
                          <Clock size={12} />{quiz.time_limit_minutes} phút
                        </span>
                        {quiz.created_at && (
                          <span className="text-xs text-on-surface-variant">
                            {new Date(quiz.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openPreview(quiz.id)}
                      className="flex items-center gap-1.5 px-4 py-2 border-2 border-primary/20 text-primary rounded-xl text-sm font-bold hover:bg-primary/5 transition-all"
                    >
                      <Eye size={15} />Xem preview
                    </button>
                    <button
                      onClick={() => { setEditingId(quiz.id); setEditTitle(quiz.title); setEditTime(quiz.time_limit_minutes); }}
                      className="p-2.5 rounded-xl hover:bg-surface-container text-on-surface-variant transition-all"
                      title="Đổi tên"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(quiz.id)}
                      className="p-2.5 rounded-xl hover:bg-red-50 text-red-400 transition-all"
                      title="Xóa quiz"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modal tạo quiz ──────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 hero-gradient text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Sparkles size={22} />
                <div>
                  <h3 className="text-xl font-headline font-bold">Tạo quiz mới</h3>
                  <p className="text-xs text-white/80">AI sẽ tạo câu hỏi từ tài liệu của bạn</p>
                </div>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {createError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} />{createError}
                </div>
              )}

              {/* Tên quiz */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-on-surface">Tên quiz *</label>
                <input
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  placeholder="VD: Kiểm tra chương 2 - Mạng máy tính"
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Upload tài liệu mới */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">Upload tài liệu mới</label>
                <label className="flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-outline-variant/40 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <input type="file" accept=".pdf,.docx,.txt" className="hidden"
                    onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadError(''); }} />
                  <FileText size={24} className="text-primary" />
                  {uploadFile ? (
                    <p className="text-sm font-bold text-primary">{uploadFile.name}</p>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Click để chọn PDF, DOCX hoặc TXT</p>
                  )}
                </label>
                {uploadError && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{uploadError}</p>
                )}
                {uploadFile && (
                  <button onClick={handleUpload} disabled={uploading}
                    className="w-full py-2.5 bg-secondary text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                    {uploading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang upload...</>
                      : <><FileText size={16} />Upload tài liệu</>}
                  </button>
                )}
              </div>

              {/* Chọn tài liệu */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface">Chọn tài liệu *</label>
                {documents.length === 0 ? (
                  <div className="p-3 bg-amber-50 rounded-xl text-amber-700 text-sm flex items-center gap-2">
                    <AlertCircle size={15} />Chưa có tài liệu. Upload tài liệu ở trên.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {documents.map(doc => (
                      <button key={doc.id} onClick={() => setSelectedDocId(doc.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                          selectedDocId === doc.id ? 'border-primary bg-primary/5 text-primary' : 'border-outline-variant/20 hover:border-primary/40'
                        )}>
                        <FileText size={16} className="shrink-0" />
                        <span className="text-sm truncate">{doc.file_name}</span>
                        {selectedDocId === doc.id && <CheckCircle2 size={15} className="ml-auto shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Config */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-on-surface">Số câu</label>
                  <input type="number" min={1} max={50} value={numQuestions}
                    onChange={e => setNumQuestions(+e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm outline-none focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-on-surface">Thời gian</label>
                  <input type="number" min={5} max={180} value={timeLimit}
                    onChange={e => setTimeLimit(+e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm outline-none focus:border-primary" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-on-surface">Độ khó</label>
                  <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm outline-none focus:border-primary">
                    <option value="mixed">Hỗn hợp</option>
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
              </div>

              <button onClick={handleCreate} disabled={creating || !selectedDocId || !quizTitle.trim()}
                className="w-full py-4 hero-gradient text-white font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all">
                {creating
                  ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI đang tạo câu hỏi...</>
                  : <><Sparkles size={18} />Tạo quiz với AI</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Preview quiz ──────────────────────────── */}
      {previewQuiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setPreviewQuiz(null)} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-headline font-bold text-on-surface">{previewQuiz.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-on-surface-variant">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', diffColor[previewQuiz.difficulty])}>
                    {diffLabel[previewQuiz.difficulty]}
                  </span>
                  <span className="flex items-center gap-1"><BookOpen size={13} />{previewQuiz.num_questions} câu</span>
                  <span className="flex items-center gap-1"><Clock size={13} />{previewQuiz.time_limit_minutes} phút</span>
                </div>
              </div>
              <button onClick={() => setPreviewQuiz(null)} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant">
                <X size={20} />
              </button>
            </div>

            {/* Lưu ý */}
            <div className="px-6 pt-4 shrink-0">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Đây là bản xem trước dành cho giáo viên — bao gồm đáp án đúng và giải thích. Học sinh sẽ không thấy phần này.</span>
              </div>
            </div>

            {/* Questions */}
            <div className="overflow-y-auto p-6 space-y-3">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-10 gap-3 text-on-surface-variant">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span>Đang tải...</span>
                </div>
              ) : previewQuiz.questions?.map((q, idx) => (
                <div key={q.id} className="border border-outline-variant/10 rounded-2xl overflow-hidden">
                  {/* Question header */}
                  <button
                    onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-surface-container/50 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="flex-1 text-sm font-medium text-on-surface">{q.content}</p>
                    {expandedQ === q.id ? <ChevronUp size={18} className="text-on-surface-variant shrink-0" /> : <ChevronDown size={18} className="text-on-surface-variant shrink-0" />}
                  </button>

                  {/* Expanded: options + answer */}
                  {expandedQ === q.id && (
                    <div className="px-4 pb-4 space-y-2 border-t border-outline-variant/10">
                      <div className="space-y-1.5 mt-3">
                        {q.options.map(opt => (
                          <div key={opt.key}
                            className={cn(
                              'flex items-start gap-2.5 p-2.5 rounded-xl text-sm',
                              opt.key === q.correct_answer
                                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold'
                                : 'bg-surface-container/50 text-on-surface'
                            )}>
                            <span className={cn(
                              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                              opt.key === q.correct_answer ? 'bg-emerald-500 text-white' : 'bg-outline-variant/20 text-on-surface-variant'
                            )}>{opt.key}</span>
                            <span>{opt.text}</span>
                            {opt.key === q.correct_answer && <CheckCircle2 size={16} className="ml-auto shrink-0 text-emerald-500" />}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                          <span className="font-bold">Giải thích: </span>{q.explanation}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', diffColor[q.difficulty] || 'bg-surface-container')}>{diffLabel[q.difficulty] || q.difficulty}</span>
                        {q.topic && <span className="text-xs text-on-surface-variant">{q.topic}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/10 shrink-0">
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl text-sm text-primary">
                <GraduationCap size={16} />
                <span>Để giao quiz này cho lớp, vào <b>Quản lý lớp</b> → chọn lớp → tab <b>Quiz đã giao</b> → <b>Giao quiz</b>.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm delete ──────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-headline font-bold">Xóa quiz?</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Quiz sẽ bị xóa vĩnh viễn. Các lớp đã giao quiz này sẽ không còn nội dung.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold hover:bg-surface-container transition-all">
                Hủy
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center">
                {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}