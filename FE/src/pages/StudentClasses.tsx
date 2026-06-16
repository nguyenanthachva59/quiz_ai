import React from 'react';
import {
  Users, BookOpen, Play, ChevronRight, AlertCircle,
  LogOut, Hash, CheckCircle2, Clock, X,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';
import { useNavigate } from 'react-router-dom';

interface ClassItem {
  id: string; name: string; description: string; code: string;
  teacher_name: string; member_count: number; quiz_count: number;
}

// Đúng với ClassQuizResponse mới — teacher_quiz_id thay vì document_id
interface ClassQuiz {
  id: string;
  title: string;
  teacher_quiz_id: string;
  num_questions: number;
  difficulty: string;
  time_limit_minutes: number;
  assigned_at: string;
}

export default function StudentClasses() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const authH = { Authorization: `Bearer ${token}` };

  const [classes, setClasses] = React.useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = React.useState<ClassItem | null>(null);
  const [quizzes, setQuizzes] = React.useState<ClassQuiz[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = React.useState(false);

  const [showJoin, setShowJoin] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const [joining, setJoining] = React.useState(false);
  const [joinError, setJoinError] = React.useState('');
  const [joinSuccess, setJoinSuccess] = React.useState('');

  const [showLeave, setShowLeave] = React.useState<ClassItem | null>(null);
  const [leaving, setLeaving] = React.useState(false);

  const [startingQuiz, setStartingQuiz] = React.useState<string | null>(null);
  const [startError, setStartError] = React.useState('');

  React.useEffect(() => { if (token) fetchClasses(); }, [token]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/classes/joined`, { headers: authH });
      if (res.ok) setClasses(await res.json());
    } finally { setLoading(false); }
  };

  const openClass = async (cls: ClassItem) => {
    setSelectedClass(cls);
    setStartError('');
    setQuizzes([]);
    setLoadingQuizzes(true);
    try {
      const res = await fetch(`${API_BASE}/classes/${cls.id}/quizzes`, { headers: authH });
      if (res.ok) {
        const data = await res.json();
        console.log('Quizzes fetched:', data); // debug
        setQuizzes(Array.isArray(data) ? data : []);
      } else {
        console.error('Fetch quizzes failed:', res.status, await res.text());
      }
    } catch (e) {
      console.error('Fetch quizzes error:', e);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setJoinError('Vui lòng nhập mã lớp.'); return; }
    setJoining(true); setJoinError(''); setJoinSuccess('');
    try {
      const res = await fetch(`${API_BASE}/classes/join?code=${joinCode.trim().toUpperCase()}`, {
        method: 'POST', headers: authH,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Tham gia thất bại.');
      setJoinSuccess(data.message);
      setJoinCode('');
      await fetchClasses();
      setTimeout(() => { setShowJoin(false); setJoinSuccess(''); }, 1500);
    } catch (e: any) { setJoinError(e.message); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!showLeave) return;
    setLeaving(true);
    try {
      await fetch(`${API_BASE}/classes/leave/${showLeave.id}`, { method: 'DELETE', headers: authH });
      setClasses(prev => prev.filter(c => c.id !== showLeave.id));
      if (selectedClass?.id === showLeave.id) { setSelectedClass(null); setQuizzes([]); }
      setShowLeave(null);
    } finally { setLeaving(false); }
  };

  const handleStartQuiz = async (cq: ClassQuiz) => {
    setStartingQuiz(cq.id); setStartError('');
    try {
      const res = await fetch(`${API_BASE}/quiz/class/${cq.id}/start`, {
        method: 'POST',
        headers: authH,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể bắt đầu bài quiz.');
      }
      const quiz = await res.json();
      navigate('/quiz/taking', {
        state: {
          quiz,
          fromClass: {
            classId: selectedClass?.id,
            className: selectedClass?.name,
            quizTitle: cq.title,
          },
        },
      });
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStartingQuiz(null);
    }
  };

  const diffLabel: Record<string, string> = {
    easy: 'Dễ', medium: 'Trung bình', hard: 'Khó', mixed: 'Hỗn hợp',
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">Lớp học của tôi</h1>
          <p className="text-on-surface-variant mt-1">Tham gia lớp và làm quiz giáo viên giao.</p>
        </div>
        <button
          onClick={() => { setJoinCode(''); setJoinError(''); setJoinSuccess(''); setShowJoin(true); }}
          className="hero-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Hash size={18} />Nhập mã lớp
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách lớp */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide px-1">Lớp đã tham gia</h2>
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-3 text-on-surface-variant">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : classes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant text-center p-6">
              <BookOpen size={36} className="opacity-30" />
              <p className="text-sm">Bạn chưa tham gia lớp nào.<br />Nhập mã lớp từ giáo viên để bắt đầu.</p>
            </div>
          ) : (
            classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => openClass(cls)}
                className={cn(
                  'w-full text-left bg-white rounded-2xl border-2 p-4 transition-all hover:shadow-sm',
                  selectedClass?.id === cls.id
                    ? 'border-primary bg-primary/5'
                    : 'border-outline-variant/10 hover:border-primary/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('font-bold', selectedClass?.id === cls.id ? 'text-primary' : 'text-on-surface')}>
                    {cls.name}
                  </p>
                  <ChevronRight size={16} className="text-on-surface-variant" />
                </div>
                <p className="text-xs text-on-surface-variant mt-1">GV: {cls.teacher_name || 'Giáo viên'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><Users size={12} />{cls.member_count}</span>
                  <span className="flex items-center gap-1"><BookOpen size={12} />{cls.quiz_count} quiz</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Chi tiết lớp + quiz */}
        <div className="lg:col-span-2">
          {!selectedClass ? (
            <div className="bg-white rounded-2xl border border-outline-variant/10 flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant h-full">
              <BookOpen size={40} className="opacity-20" />
              <p className="text-sm">Chọn một lớp để xem quiz</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
              {/* Header lớp */}
              <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-headline font-bold text-on-surface">{selectedClass.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    GV: {selectedClass.teacher_name || 'Giáo viên'}
                  </p>
                </div>
                <button
                  onClick={() => setShowLeave(selectedClass)}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-500 border border-red-100 px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
                >
                  <LogOut size={14} />Rời lớp
                </button>
              </div>

              {/* Quiz list */}
              <div className="p-6">
                {startError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm mb-4">
                    <AlertCircle size={15} />{startError}
                  </div>
                )}
                <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wide mb-4">
                  Quiz giáo viên giao
                </h4>

                {loadingQuizzes ? (
                  <div className="flex items-center justify-center py-10 gap-3 text-on-surface-variant">
                    <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm">Đang tải...</span>
                  </div>
                ) : quizzes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant">
                    <BookOpen size={32} className="opacity-30" />
                    <p className="text-sm">Giáo viên chưa giao quiz nào.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quizzes.map(q => (
                      <div
                        key={q.id}
                        className="flex items-center gap-4 p-4 border border-outline-variant/10 rounded-2xl hover:border-primary/20 hover:bg-primary/5 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center shrink-0">
                          <Play size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-on-surface truncate">{q.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1">
                              <BookOpen size={11} />{q.num_questions} câu
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />{q.time_limit_minutes} phút
                            </span>
                            <span>{diffLabel[q.difficulty] || q.difficulty}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartQuiz(q)}
                          disabled={startingQuiz === q.id}
                          className="shrink-0 px-4 py-2 hero-gradient text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2"
                        >
                          {startingQuiz === q.id
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><Play size={14} />Làm bài</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nhập mã lớp */}
      {showJoin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowJoin(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 hero-gradient text-white flex justify-between items-center">
              <h3 className="text-xl font-headline font-bold">Tham gia lớp học</h3>
              <button onClick={() => setShowJoin(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {joinSuccess ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 size={40} className="text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600 text-center">{joinSuccess}</p>
                </div>
              ) : (
                <>
                  {joinError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm">
                      <AlertCircle size={15} />{joinError}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-bold text-on-surface block mb-2">Mã lớp</label>
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleJoin()}
                      placeholder="VD: AB1234"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface text-center text-2xl font-bold tracking-[0.3em] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all uppercase"
                    />
                    <p className="text-xs text-on-surface-variant mt-2 text-center">Nhập mã 6 ký tự từ giáo viên</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowJoin(false)}
                      className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold hover:bg-surface-container transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleJoin}
                      disabled={joining || joinCode.length < 6}
                      className="flex-1 py-3 hero-gradient text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {joining
                        ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : 'Tham gia'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal rời lớp */}
      {showLeave && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowLeave(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <LogOut size={22} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-headline font-bold">Rời lớp học?</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Bạn sẽ rời khỏi lớp <b>{showLeave.name}</b>. Để vào lại, bạn cần nhập mã lớp.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeave(null)}
                className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold hover:bg-surface-container transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleLeave}
                disabled={leaving}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-60 flex items-center justify-center"
              >
                {leaving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : 'Rời lớp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}