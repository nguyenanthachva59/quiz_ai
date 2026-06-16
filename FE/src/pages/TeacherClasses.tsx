import React from 'react';
import {
  Plus, Users, BookOpen, Copy, Check, Pencil, Trash2,
  ChevronRight, X, AlertCircle, FileText, Play, BarChart3,
  CheckCircle2, Clock, Trophy, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

interface ClassItem {
  id: string; name: string; description: string; code: string;
  teacher_id: string; teacher_name: string;
  member_count: number; quiz_count: number;
  created_at: string;
}
interface ClassQuiz {
  id: string; class_id: string; title: string; teacher_quiz_id: string;
  num_questions: number; difficulty: string; time_limit_minutes: number;
  teacher_id: string; assigned_at: string;
}
interface Member {
  id: string; student_id: string; display_name: string; email: string; joined_at: string;
}
interface Progress {
  student_id: string; display_name: string; email: string;
  total_quizzes: number; completed_quizzes: number; avg_score: number | null;
  quiz_details: { class_quiz_id: string; title: string; score: number; completed_at: string }[];
}
interface Document { id: string; file_name: string; status: string; }
interface TeacherQuiz {
  id: string; title: string; num_questions: number;
  difficulty: string; time_limit_minutes: number;
}

type View = 'list' | 'detail';

export default function TeacherClasses() {
  const { token } = useAuth();
  const authH = { Authorization: `Bearer ${token}` };

  const [view, setView] = React.useState<View>('list');
  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<ClassItem | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [quizzes, setQuizzes] = React.useState<ClassQuiz[]>([]);
  const [progress, setProgress] = React.useState<Progress[]>([]);
  const [teacherQuizzes, setTeacherQuizzes] = React.useState<TeacherQuiz[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailTab, setDetailTab] = React.useState<'quizzes' | 'members' | 'progress'>('quizzes');

  // Modals
  const [showCreateClass, setShowCreateClass] = React.useState(false);
  const [showEditClass, setShowEditClass] = React.useState(false);
  const [showDeleteClass, setShowDeleteClass] = React.useState(false);
  const [showAddQuiz, setShowAddQuiz] = React.useState(false);
  const [showEditQuiz, setShowEditQuiz] = React.useState<ClassQuiz | null>(null);
  const [showDeleteQuiz, setShowDeleteQuiz] = React.useState<string | null>(null);
  const [showKickMember, setShowKickMember] = React.useState<Member | null>(null);

  // Forms
  const [className, setClassName] = React.useState('');
  const [classDesc, setClassDesc] = React.useState('');
  const [selectedTeacherQuizId, setSelectedTeacherQuizId] = React.useState('');
  const [editQuizTitle, setEditQuizTitle] = React.useState('');

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [copiedCode, setCopiedCode] = React.useState(false);

  React.useEffect(() => { if (token) fetchClasses(); }, [token]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/classes/my`, { headers: authH });
      if (res.ok) setClasses(await res.json());
    } finally { setLoading(false); }
  };

  const openClass = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setView('detail');
    setDetailTab('quizzes');
    await Promise.all([fetchMembers(cls.id), fetchQuizzes(cls.id), fetchProgress(cls.id), fetchTeacherQuizzes()]);
  };

  const fetchMembers = async (classId: string) => {
    const res = await fetch(`${API_BASE}/classes/${classId}/members`, { headers: authH });
    if (res.ok) setMembers(await res.json());
  };
  const fetchQuizzes = async (classId: string) => {
    const res = await fetch(`${API_BASE}/classes/${classId}/quizzes`, { headers: authH });
    if (res.ok) setQuizzes(await res.json());
  };
  const fetchProgress = async (classId: string) => {
    const res = await fetch(`${API_BASE}/classes/${classId}/progress`, { headers: authH });
    if (res.ok) setProgress(await res.json());
  };
  const fetchTeacherQuizzes = async () => {
    const res = await fetch(`${API_BASE}/quiz/teacher/my`, { headers: authH });
    if (res.ok) setTeacherQuizzes(await res.json());
  };

  const handleCreateClass = async () => {
    if (!className.trim()) { setError('Vui lòng nhập tên lớp.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/classes/`, {
        method: 'POST', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: className, description: classDesc }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Tạo lớp thất bại.');
      const cls = await res.json();
      setClasses(prev => [cls, ...prev]);
      setShowCreateClass(false); setClassName(''); setClassDesc('');
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleEditClass = async () => {
    if (!selectedClass) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/classes/${selectedClass.id}`, {
        method: 'PATCH', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: className, description: classDesc }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Cập nhật thất bại.');
      const updated = await res.json();
      setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedClass(updated);
      setShowEditClass(false);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/classes/${selectedClass.id}`, { method: 'DELETE', headers: authH });
      setClasses(prev => prev.filter(c => c.id !== selectedClass.id));
      setView('list'); setSelectedClass(null); setShowDeleteClass(false);
    } finally { setSubmitting(false); }
  };

  const handleAddQuiz = async () => {
    if (!selectedClass) return;
    if (!selectedTeacherQuizId) { setError('Vui lòng chọn quiz.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/classes/${selectedClass.id}/quizzes`, {
        method: 'POST', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_quiz_id: selectedTeacherQuizId }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Giao quiz thất bại.');
      const q = await res.json();
      setQuizzes(prev => [...prev, q]);
      setShowAddQuiz(false); setSelectedTeacherQuizId('');
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleEditQuiz = async () => {
    if (!showEditQuiz || !selectedClass) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/classes/${selectedClass.id}/quizzes/${showEditQuiz.id}`, {
        method: 'PATCH', headers: { ...authH, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editQuizTitle }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Cập nhật thất bại.');
      const updated = await res.json();
      setQuizzes(prev => prev.map(q => q.id === updated.id ? updated : q));
      setShowEditQuiz(null);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/classes/${selectedClass.id}/quizzes/${quizId}`, { method: 'DELETE', headers: authH });
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      setShowDeleteQuiz(null);
    } finally { setSubmitting(false); }
  };

  const handleKickMember = async () => {
    if (!showKickMember || !selectedClass) return;
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/classes/${selectedClass.id}/members/${showKickMember.student_id}`, { method: 'DELETE', headers: authH });
      setMembers(prev => prev.filter(m => m.id !== showKickMember.id));
      setShowKickMember(null);
    } finally { setSubmitting(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const diffLabel: Record<string, string> = { easy: 'Dễ', medium: 'TB', hard: 'Khó', mixed: 'Hỗn hợp' };

  // ── LIST VIEW ────────────────────────────────────────────
  if (view === 'list') return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">Quản lý lớp học</h1>
          <p className="text-on-surface-variant mt-1">Tạo lớp, giao quiz và theo dõi tiến độ học sinh.</p>
        </div>
        <button onClick={() => { setClassName(''); setClassDesc(''); setError(''); setShowCreateClass(true); }}
          className="hero-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
          <Plus size={20} />Tạo lớp mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span>Đang tải...</span>
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-on-surface-variant bg-white rounded-2xl border border-outline-variant/10">
          <BookOpen size={48} className="opacity-30" />
          <p>Bạn chưa có lớp nào. Tạo lớp đầu tiên!</p>
          <button onClick={() => setShowCreateClass(true)}
            className="px-5 py-2.5 hero-gradient text-white rounded-xl text-sm font-bold">
            Tạo lớp ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {classes.map(cls => (
            <div key={cls.id} className="bg-white rounded-2xl border border-outline-variant/10 p-6 hover:shadow-lg transition-all flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-headline font-bold text-lg text-on-surface">{cls.name}</h3>
                  {cls.description && <p className="text-xs text-on-surface-variant mt-1">{cls.description}</p>}
                </div>
                <div className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-xl">
                  <span className="text-sm font-bold text-primary tracking-widest">{cls.code}</span>
                  <button onClick={() => copyCode(cls.code)} className="ml-1 text-primary hover:text-primary/70">
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                <span className="flex items-center gap-1"><Users size={14} />{cls.member_count} học sinh</span>
                <span className="flex items-center gap-1"><FileText size={14} />{cls.quiz_count} quiz</span>
              </div>
              <button onClick={() => openClass(cls)}
                className="w-full py-2.5 border-2 border-primary/20 text-primary font-bold rounded-xl hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-sm">
                Quản lý lớp <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal tạo lớp */}
      {showCreateClass && (
        <Modal title="Tạo lớp học mới" onClose={() => setShowCreateClass(false)}>
          {error && <ErrorBox msg={error} />}
          <Field label="Tên lớp *">
            <input value={className} onChange={e => setClassName(e.target.value)}
              placeholder="VD: Lớp 11A1 - Tin học" className={inputCls} />
          </Field>
          <Field label="Mô tả (tuỳ chọn)">
            <textarea value={classDesc} onChange={e => setClassDesc(e.target.value)}
              placeholder="Ghi chú về lớp..." rows={2} className={inputCls} />
          </Field>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowCreateClass(false)} className={btnSecondary}>Hủy</button>
            <button onClick={handleCreateClass} disabled={submitting} className={btnPrimary}>
              {submitting ? <Spin /> : 'Tạo lớp'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );

  // ── DETAIL VIEW ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-headline font-extrabold text-on-surface">{selectedClass?.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-on-surface-variant">Mã lớp:</span>
              <span className="font-bold text-primary tracking-widest text-sm">{selectedClass?.code}</span>
              <button onClick={() => copyCode(selectedClass?.code || '')} className="text-primary hover:opacity-70">
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setClassName(selectedClass?.name || ''); setClassDesc(selectedClass?.description || ''); setError(''); setShowEditClass(true); }}
            className="flex items-center gap-2 px-4 py-2 border border-outline-variant/20 rounded-xl text-sm font-bold hover:bg-surface-container transition-all">
            <Pencil size={15} />Đổi tên
          </button>
          <button onClick={() => setShowDeleteClass(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-100 text-red-500 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">
            <Trash2 size={15} />Xóa lớp
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Học sinh', value: members.length, icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Quiz đã giao', value: quizzes.length, icon: FileText, color: 'bg-secondary/10 text-secondary' },
          {
            label: 'Hoàn thành TB',
            value: (() => {
              if (progress.length === 0 || quizzes.length === 0) return '—';
              const avg = progress.reduce((s, p) => s + (p.completed_quizzes / Math.max(p.total_quizzes, 1)) * 100, 0) / progress.length;
              return Math.round(avg) + '%';
            })(),
            icon: BarChart3, color: 'bg-emerald-50 text-emerald-600',
          },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-outline-variant/10 p-4 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.color)}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant">{s.label}</p>
              <p className="text-xl font-headline font-extrabold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container p-1 rounded-xl w-fit">
        {([['quizzes', 'Quiz đã giao'], ['members', 'Học sinh'], ['progress', 'Tiến độ']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setDetailTab(tab)}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all',
              detailTab === tab ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface')}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Quizzes */}
      {detailTab === 'quizzes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setSelectedTeacherQuizId(''); setError(''); setShowAddQuiz(true); fetchTeacherQuizzes(); }}
              className="hero-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm hover:opacity-90 transition-all">
              <Plus size={16} />Thêm quiz vào lớp
            </button>
          </div>
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
              <FileText size={36} className="opacity-30" />
              <p className="text-sm">Chưa có quiz nào. Thêm quiz để học sinh làm bài!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map(q => (
                <div key={q.id} className="bg-white rounded-2xl border border-outline-variant/10 p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shrink-0">
                      <Play size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{q.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {q.num_questions} câu · {diffLabel[q.difficulty]} · {q.time_limit_minutes} phút
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowEditQuiz(q); setEditQuizTitle(q.title); setError(''); }}
                      className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant transition-all">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setShowDeleteQuiz(q.id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Members */}
      {detailTab === 'members' && (
        <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
              <Users size={36} className="opacity-30" />
              <p className="text-sm">Chưa có học sinh nào. Chia sẻ mã lớp <b className="text-primary">{selectedClass?.code}</b> cho học sinh.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container">
                <tr>
                  {['Học sinh', 'Email', 'Ngày tham gia', ''].map((h, i) => (
                    <th key={i} className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-surface-container/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                          {m.display_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium">{m.display_name || 'Ẩn danh'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{m.email}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {m.joined_at ? new Date(m.joined_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setShowKickMember(m)}
                        className="text-xs font-bold text-red-500 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all">
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Progress */}
      {detailTab === 'progress' && (
        <div className="space-y-4">
          {progress.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-12 gap-3 text-on-surface-variant">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">Chưa có dữ liệu tiến độ.</p>
            </div>
          ) : (
            progress.map(p => (
              <div key={p.student_id} className="bg-white rounded-2xl border border-outline-variant/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {p.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{p.display_name}</p>
                      <p className="text-xs text-on-surface-variant">{p.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">{p.completed_quizzes}/{p.total_quizzes} quiz</p>
                    {p.avg_score !== null && (
                      <p className={cn('text-lg font-headline font-extrabold',
                        p.avg_score >= 8 ? 'text-emerald-600' : p.avg_score >= 6.5 ? 'text-amber-500' : 'text-red-500')}>
                        TB: {p.avg_score.toFixed(1)}/10
                      </p>
                    )}
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-surface-container rounded-full h-2">
                  <div className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${p.total_quizzes > 0 ? (p.completed_quizzes / p.total_quizzes) * 100 : 0}%` }} />
                </div>
                {p.quiz_details.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {p.quiz_details.map(d => (
                      <div key={d.class_quiz_id} className="flex items-center justify-between text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" />{d.title}</span>
                        <span className="font-bold">{d.score.toFixed(1)}/10</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showEditClass && (
        <Modal title="Đổi tên lớp" onClose={() => setShowEditClass(false)}>
          {error && <ErrorBox msg={error} />}
          <Field label="Tên lớp *">
            <input value={className} onChange={e => setClassName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Mô tả">
            <textarea value={classDesc} onChange={e => setClassDesc(e.target.value)} rows={2} className={inputCls} />
          </Field>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowEditClass(false)} className={btnSecondary}>Hủy</button>
            <button onClick={handleEditClass} disabled={submitting} className={btnPrimary}>{submitting ? <Spin /> : 'Lưu'}</button>
          </div>
        </Modal>
      )}

      {showDeleteClass && (
        <ConfirmModal title="Xóa lớp học?" desc={`Lớp "${selectedClass?.name}" và tất cả dữ liệu sẽ bị xóa vĩnh viễn.`}
          onCancel={() => setShowDeleteClass(false)} onConfirm={handleDeleteClass} loading={submitting} danger />
      )}

      {showAddQuiz && (
        <Modal title="Giao quiz vào lớp" onClose={() => setShowAddQuiz(false)}>
          {error && <ErrorBox msg={error} />}
          <Field label="Chọn quiz đã tạo *">
            <AvailableQuizList
              teacherQuizzes={teacherQuizzes}
              assignedQuizIds={quizzes.map(q => q.teacher_quiz_id)}
              selectedId={selectedTeacherQuizId}
              onSelect={setSelectedTeacherQuizId}
            />
          </Field>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowAddQuiz(false)} className={btnSecondary}>Hủy</button>
            <button onClick={handleAddQuiz} disabled={submitting || !selectedTeacherQuizId} className={btnPrimary}>
              {submitting ? <Spin /> : 'Giao quiz'}
            </button>
          </div>
        </Modal>
      )}

      {showEditQuiz && (
        <Modal title="Đổi tên quiz" onClose={() => setShowEditQuiz(null)}>
          {error && <ErrorBox msg={error} />}
          <Field label="Tên quiz *">
            <input value={editQuizTitle} onChange={e => setEditQuizTitle(e.target.value)} className={inputCls} />
          </Field>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowEditQuiz(null)} className={btnSecondary}>Hủy</button>
            <button onClick={handleEditQuiz} disabled={submitting} className={btnPrimary}>{submitting ? <Spin /> : 'Lưu'}</button>
          </div>
        </Modal>
      )}

      {showDeleteQuiz && (
        <ConfirmModal title="Xóa quiz khỏi lớp?" desc="Quiz sẽ bị xóa khỏi lớp. Học sinh sẽ không thể làm bài này nữa."
          onCancel={() => setShowDeleteQuiz(null)} onConfirm={() => handleDeleteQuiz(showDeleteQuiz)} loading={submitting} danger />
      )}

      {showKickMember && (
        <ConfirmModal title="Xóa học sinh?" desc={`"${showKickMember.display_name}" sẽ bị xóa khỏi lớp.`}
          onCancel={() => setShowKickMember(null)} onConfirm={handleKickMember} loading={submitting} danger />
      )}
    </div>
  );
}

// ── AvailableQuizList component ──────────────────────────────
function AvailableQuizList({ teacherQuizzes, assignedQuizIds, selectedId, onSelect }: {
  teacherQuizzes: { id: string; title: string; num_questions: number; time_limit_minutes: number }[];
  assignedQuizIds: string[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (teacherQuizzes.length === 0) {
    return (
      <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
        Bạn chưa có quiz nào. Vào <b>Quản lý Quiz</b> để tạo quiz trước.
      </p>
    );
  }
  const available = teacherQuizzes.filter(q => !assignedQuizIds.includes(q.id));
  if (available.length === 0) {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl">
        Tất cả quiz đã được giao vào lớp này rồi.
      </p>
    );
  }
  return (
    <div className="space-y-2 max-h-52 overflow-y-auto">
      {available.map(q => (
        <button key={q.id} onClick={() => onSelect(q.id)}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedId === q.id ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-primary/30'}`}>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold truncate ${selectedId === q.id ? 'text-primary' : 'text-on-surface'}`}>{q.title}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{q.num_questions} câu · {q.time_limit_minutes} phút</p>
          </div>
          {selectedId === q.id && <CheckCircle2 size={16} className="text-primary shrink-0" />}
        </button>
      ))}
    </div>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────
const inputCls = "w-full px-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";
const btnPrimary = "flex-1 py-3 hero-gradient text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2";
const btnSecondary = "flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all";

function Spin() { return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />; }
function ErrorBox({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm mb-3"><AlertCircle size={15} />{msg}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5 mb-3"><label className="text-sm font-bold text-on-surface">{label}</label>{children}</div>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 hero-gradient text-white flex justify-between items-center">
          <h3 className="text-xl font-headline font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
function ConfirmModal({ title, desc, onCancel, onConfirm, loading, danger }: {
  title: string; desc: string; onCancel: () => void; onConfirm: () => void; loading: boolean; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto", danger ? "bg-red-50" : "bg-amber-50")}>
          <Trash2 size={22} className={danger ? "text-red-500" : "text-amber-500"} />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-headline font-bold">{title}</h3>
          <p className="text-sm text-on-surface-variant mt-1">{desc}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={btnSecondary}>Hủy</button>
          <button onClick={onConfirm} disabled={loading}
            className={cn("flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center",
              danger ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600")}>
            {loading ? <Spin /> : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}