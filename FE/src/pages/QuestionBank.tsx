import React from 'react';
import {
  Search, Filter, Plus, Edit2, Trash2, Sparkles, BrainCircuit,
  Upload, FileText, CheckCircle2, XCircle, Clock, ChevronDown,
  AlertCircle, X, Eye, RefreshCw,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

// ─── Types ───────────────────────────────────────────────
interface Document { id: string; file_name: string; status: string; created_at: string; file_size: number; }
interface QuestionOption { key: string; text: string; }
interface Question {
  id: string; content: string; options: QuestionOption[];
  correct_answer: string; explanation: string;
  difficulty: string; topic: string; status: string;
  created_at?: string;
}

// ─── Helpers ─────────────────────────────────────────────
function difficultyBadge(d: string) {
  const map: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    hard: 'bg-red-100 text-red-800',
    mixed: 'bg-blue-100 text-blue-800',
  };
  const label: Record<string, string> = { easy: 'Dễ', medium: 'Trung bình', hard: 'Khó', mixed: 'Hỗn hợp' };
  return { cls: map[d] ?? 'bg-gray-100 text-gray-800', label: label[d] ?? d };
}

function statusBadge(s: string) {
  const map: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    pending: { cls: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Chờ duyệt', icon: <Clock size={11} /> },
    approved: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Đã duyệt', icon: <CheckCircle2 size={11} /> },
    rejected: { cls: 'bg-red-50 text-red-700 border border-red-200', label: 'Từ chối', icon: <XCircle size={11} /> },
  };
  return map[s] ?? { cls: 'bg-gray-100 text-gray-700 border border-gray-200', label: s, icon: null };
}

// ─── Main Component ───────────────────────────────────────
export default function QuestionBank() {
  const { token, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  // Lists
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loadingQ, setLoadingQ] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState('');
  const [filterDifficulty, setFilterDifficulty] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  // Modals
  const [showAiModal, setShowAiModal] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState<Question | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');

  // Generate state
  const [selectedDocId, setSelectedDocId] = React.useState('');
  const [numQuestions, setNumQuestions] = React.useState(5);
  const [difficulty, setDifficulty] = React.useState('mixed');
  const [topic, setTopic] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [generateError, setGenerateError] = React.useState('');
  const [generatedQuestions, setGeneratedQuestions] = React.useState<Question[]>([]);
  const [step, setStep] = React.useState<'upload' | 'config' | 'result'>('upload');

  const authHeaders = { Authorization: `Bearer ${token}` };

  // ── Fetch questions ──
  const fetchQuestions = React.useCallback(async () => {
    if (!token) return;
    setLoadingQ(true);
    try {
      const res = await fetch(`${API_BASE}/questions/my`, { headers: authHeaders });
      if (res.ok) setQuestions(await res.json());
    } finally {
      setLoadingQ(false);
    }
  }, [token]);

  // ── Fetch documents ──
  const fetchDocuments = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/documents/`, { headers: authHeaders });
      if (res.ok) setDocuments(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  React.useEffect(() => {
    fetchQuestions();
    fetchDocuments();
  }, [fetchQuestions, fetchDocuments]);

  // ── Upload document ──
  const handleUpload = async () => {
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
      // Poll until status = done
      pollDocumentStatus(doc.id);
      setStep('config');
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const pollDocumentStatus = async (docId: string) => {
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const res = await fetch(`${API_BASE}/documents/${docId}`, { headers: authHeaders });
        if (res.ok) {
          const doc = await res.json();
          setDocuments(prev => prev.map(d => d.id === docId ? doc : d));
          if (doc.status === 'done') break;
        }
      } catch { break; }
    }
  };

  // ── Generate questions ──
  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    setGenerateError('');
    try {
      const res = await fetch(`${API_BASE}/questions/generate`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: selectedDocId,
          num_questions: numQuestions,
          difficulty,
          topic: topic || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Sinh câu hỏi thất bại.');
      }
      const qs: Question[] = await res.json();
      setGeneratedQuestions(qs);
      setQuestions(prev => [...qs, ...prev]);
      setStep('result');
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete question ──
  const handleDelete = async (id: string) => {
    if (!confirm('Xóa câu hỏi này?')) return;
    const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) setQuestions(prev => prev.filter(q => q.id !== id));
  };

  // ── Close modal ──
  const closeModal = () => {
    setShowAiModal(false);
    setStep('upload');
    setUploadFile(null);
    setUploadError('');
    setGenerateError('');
    setGeneratedQuestions([]);
    setSelectedDocId('');
  };

  // ── Filtered questions ──
  const filtered = questions.filter(q => {
    const matchSearch = q.content.toLowerCase().includes(search.toLowerCase()) ||
      q.topic?.toLowerCase().includes(search.toLowerCase());
    const matchDiff = !filterDifficulty || q.difficulty === filterDifficulty;
    const matchStatus = !filterStatus || q.status === filterStatus;
    return matchSearch && matchDiff && matchStatus;
  });

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Ngân hàng câu hỏi</h1>
          <p className="text-on-surface-variant mt-1">Quản lý và tổ chức các câu hỏi trắc nghiệm Tin học.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="ai-sparkle-gradient text-white px-5 py-2.5 rounded-xl font-headline font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-secondary/20"
          >
            <Sparkles size={18} />
            Sinh câu hỏi AI
          </button>
          {isAdmin && (
          <button className="hero-gradient text-white px-5 py-2.5 rounded-xl font-headline font-semibold flex items-center gap-2 hover:opacity-90 transition-all active:scale-95">
            <Plus size={18} />
            Thêm thủ công
          </button>
        )}  
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="bg-surface-container border-none rounded-xl text-sm font-medium px-4 py-2.5 focus:ring-0 outline-none"
          >
            <option value="">Độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-surface-container border-none rounded-xl text-sm font-medium px-4 py-2.5 focus:ring-0 outline-none"
          >
            <option value="">Trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Từ chối</option>
          </select>
          <button
            onClick={fetchQuestions}
            className="p-2.5 bg-surface-container text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant/10">
        {loadingQ ? (
          <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Đang tải câu hỏi...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
            <BrainCircuit size={40} className="opacity-30" />
            <p className="text-sm">Chưa có câu hỏi nào. Hãy dùng AI để sinh câu hỏi!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Nội dung câu hỏi</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Chủ đề</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Độ khó</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(q => {
                  const diff = difficultyBadge(q.difficulty);
                  const stat = statusBadge(q.status);
                  return (
                    <tr key={q.id} className="hover:bg-surface-container/30 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-on-surface line-clamp-1 max-w-sm">{q.content}</p>
                      </td>
                      <td className="px-6 py-5 text-sm text-on-surface-variant">{q.topic || '—'}</td>
                      <td className="px-6 py-5">
                        <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', diff.cls)}>
                          {diff.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold', stat.cls)}>
                          {stat.icon}{stat.label}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setShowPreview(q)}
                            className="p-2 text-on-surface-variant hover:text-secondary hover:bg-secondary/5 rounded-lg transition-all"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="p-2 text-on-surface-variant hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── AI Modal ─────────────────────────────────────── */}
      {showAiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 ai-sparkle-gradient text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <BrainCircuit size={28} />
                <div>
                  <h3 className="text-xl font-headline font-bold">Sinh câu hỏi bằng AI</h3>
                  <p className="text-xs text-white/80">Upload tài liệu → Cấu hình → Gemini AI sinh câu hỏi</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={22} />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex border-b border-outline-variant/10 shrink-0">
              {[
                { key: 'upload', label: '1. Upload tài liệu' },
                { key: 'config', label: '2. Cấu hình' },
                { key: 'result', label: '3. Kết quả' },
              ].map(s => (
                <div
                  key={s.key}
                  className={cn(
                    'flex-1 py-3 text-center text-xs font-bold transition-colors',
                    step === s.key ? 'text-secondary border-b-2 border-secondary' : 'text-on-surface-variant'
                  )}
                >
                  {s.label}
                </div>
              ))}
            </div>

            <div className="overflow-y-auto p-8 space-y-6">
              {/* ── Step 1: Upload ── */}
              {step === 'upload' && (
                <>
                  {/* Upload mới */}
                  <div>
                    <p className="text-sm font-bold text-on-surface mb-3">Upload tài liệu mới</p>
                    <label className={cn(
                      'flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
                      uploadFile ? 'border-secondary bg-secondary/5' : 'border-outline-variant/40 hover:border-secondary/50 hover:bg-secondary/3'
                    )}>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        className="hidden"
                        onChange={e => {
                          setUploadFile(e.target.files?.[0] ?? null);
                          setUploadError('');
                        }}
                      />
                      {uploadFile ? (
                        <>
                          <FileText size={32} className="text-secondary" />
                          <p className="text-sm font-bold text-secondary">{uploadFile.name}</p>
                          <p className="text-xs text-on-surface-variant">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </>
                      ) : (
                        <>
                          <Upload size={32} className="text-on-surface-variant/50" />
                          <p className="text-sm font-medium text-on-surface-variant">Kéo thả hoặc click để chọn file</p>
                          <p className="text-xs text-on-surface-variant/60">PDF, DOCX, TXT — tối đa 10MB</p>
                        </>
                      )}
                    </label>

                    {uploadError && (
                      <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                        <AlertCircle size={16} />
                        {uploadError}
                      </div>
                    )}

                    {uploadFile && (
                      <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="mt-4 w-full py-3 ai-sparkle-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={18} />}
                        {uploading ? 'Đang upload...' : 'Upload tài liệu'}
                      </button>
                    )}
                  </div>

                  {/* Hoặc chọn tài liệu đã có */}
                  {documents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 my-4">
                        <div className="flex-1 h-px bg-outline-variant/20" />
                        <span className="text-xs text-on-surface-variant">hoặc chọn tài liệu đã upload</span>
                        <div className="flex-1 h-px bg-outline-variant/20" />
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {documents.map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => { setSelectedDocId(doc.id); setStep('config'); }}
                            disabled={doc.status !== 'done'}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                              doc.status === 'done'
                                ? 'border-outline-variant/20 hover:border-secondary/50 hover:bg-secondary/3'
                                : 'border-outline-variant/10 opacity-50 cursor-not-allowed'
                            )}
                          >
                            <FileText size={18} className="text-secondary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-on-surface truncate">{doc.file_name}</p>
                              <p className="text-xs text-on-surface-variant">{doc.status === 'done' ? 'Sẵn sàng' : 'Đang xử lý...'}</p>
                            </div>
                            {doc.status === 'done' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                            {doc.status !== 'done' && <Clock size={16} className="text-amber-500 shrink-0 animate-pulse" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Step 2: Config ── */}
              {step === 'config' && (
                <>
                  <div className="p-4 bg-emerald-50 rounded-xl flex items-center gap-3 text-emerald-700 text-sm">
                    <CheckCircle2 size={18} />
                    <span>
                      Tài liệu: <strong>{documents.find(d => d.id === selectedDocId)?.file_name ?? selectedDocId}</strong>
                    </span>
                    <button onClick={() => setStep('upload')} className="ml-auto text-xs underline">Đổi</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant">Số câu hỏi</label>
                      <input
                        type="number"
                        min={1} max={30}
                        value={numQuestions}
                        onChange={e => setNumQuestions(Number(e.target.value))}
                        className="w-full p-3 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-on-surface-variant">Độ khó</label>
                      <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        className="w-full p-3 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      >
                        <option value="mixed">Hỗn hợp</option>
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-on-surface-variant">Chủ đề / Từ khóa <span className="font-normal text-on-surface-variant/60">(tùy chọn)</span></label>
                      <input
                        type="text"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="VD: Python, CSDL, Thuật toán..."
                        className="w-full p-3 bg-surface-container border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                      />
                    </div>
                  </div>

                  {generateError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                      <AlertCircle size={16} />
                      {generateError}
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full py-4 ai-sparkle-gradient text-white font-bold rounded-2xl shadow-lg shadow-secondary/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:scale-100"
                  >
                    {generating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gemini đang sinh câu hỏi...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Bắt đầu sinh {numQuestions} câu hỏi
                      </>
                    )}
                  </button>
                </>
              )}

              {/* ── Step 3: Result ── */}
              {step === 'result' && (
                <>
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl text-emerald-700">
                    <CheckCircle2 size={20} />
                    <div>
                      <p className="font-bold text-sm">Sinh thành công {generatedQuestions.length} câu hỏi!</p>
                      <p className="text-xs">Câu hỏi đang chờ admin duyệt trước khi xuất hiện trong bài quiz.</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {generatedQuestions.map((q, i) => {
                      const diff = difficultyBadge(q.difficulty);
                      return (
                        <div key={q.id} className="p-4 bg-surface rounded-xl border border-outline-variant/10">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <p className="text-sm font-medium text-on-surface">
                              <span className="text-on-surface-variant mr-1">{i + 1}.</span>
                              {q.content}
                            </p>
                            <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', diff.cls)}>
                              {diff.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {q.options.map(opt => (
                              <div
                                key={opt.key}
                                className={cn(
                                  'text-xs p-2 rounded-lg border',
                                  opt.key === q.correct_answer
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                                    : 'border-outline-variant/20 bg-white text-on-surface-variant'
                                )}
                              >
                                {opt.key}. {opt.text}
                              </div>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="mt-2 text-xs text-on-surface-variant italic">💡 {q.explanation}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep('config'); setGeneratedQuestions([]); }}
                      className="flex-1 py-3 bg-surface-container text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors text-sm"
                    >
                      Sinh thêm
                    </button>
                    <button
                      onClick={closeModal}
                      className="flex-1 py-3 hero-gradient text-white font-bold rounded-xl hover:opacity-90 transition-all text-sm"
                    >
                      Xong
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────── */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowPreview(null)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-headline font-bold text-on-surface pr-4">{showPreview.content}</h3>
              <button onClick={() => setShowPreview(null)} className="p-1 hover:bg-surface-container rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-4">
              {showPreview.options.map(opt => (
                <div
                  key={opt.key}
                  className={cn(
                    'p-3 rounded-xl border text-sm',
                    opt.key === showPreview.correct_answer
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                      : 'border-outline-variant/20 text-on-surface-variant'
                  )}
                >
                  {opt.key}. {opt.text}
                </div>
              ))}
            </div>
            {showPreview.explanation && (
              <div className="p-3 bg-secondary/5 rounded-xl text-sm text-on-surface-variant">
                💡 <strong>Giải thích:</strong> {showPreview.explanation}
              </div>
            )}
            <div className="flex gap-2 mt-4 text-xs text-on-surface-variant">
              <span className={cn('px-2 py-1 rounded-full font-bold', difficultyBadge(showPreview.difficulty).cls)}>
                {difficultyBadge(showPreview.difficulty).label}
              </span>
              <span className={cn('px-2 py-1 rounded-full font-bold flex items-center gap-1', statusBadge(showPreview.status).cls)}>
                {statusBadge(showPreview.status).icon}
                {statusBadge(showPreview.status).label}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
