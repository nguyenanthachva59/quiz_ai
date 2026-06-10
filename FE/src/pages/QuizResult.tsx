import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Trophy, RotateCcw, Home, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

interface Option { key: string; text: string; }
interface Question {
  id: string; content: string; options: Option[];
  correct_answer: string; explanation: string; topic: string; difficulty: string;
}
interface AnswerResult {
  question_id: string; selected_answer: string;
  correct_answer: string; is_correct: boolean;
}
interface QuizResult {
  id: string; score: number; correct_count: number; total_questions: number;
  time_taken_seconds: number; time_limit_minutes: number;
  document_id?: string;
  questions: Question[]; answers_with_result?: AnswerResult[];
  status: string;
}

export default function QuizResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const result: QuizResult = location.state?.result;
  const resultId: string = location.state?.resultId;
  const quizConfig = location.state?.quizConfig;

  const [data, setData] = React.useState<QuizResult | null>(result ?? null);
  const [loading, setLoading] = React.useState(!result && !!resultId);
  const [retaking, setRetaking] = React.useState(false);
  const [retakeError, setRetakeError] = React.useState('');
  const [expandedQ, setExpandedQ] = React.useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = React.useState<Record<string, string>>({});
  const [loadingAI, setLoadingAI] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (result || !resultId || !token) return;
    setLoading(true);
    fetch(`${API_BASE}/quiz/result/${resultId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [resultId, token]);

  const handleRetake = async () => {
    console.log('=== RETAKE DEBUG ===');
    console.log('quizConfig from state:', quizConfig);
    console.log('data?.document_id:', data?.document_id);

    const documentId = quizConfig?.document_id ?? data?.document_id;
    console.log('documentId resolved:', documentId);

    if (!documentId || !token) {
      console.log('No documentId or token — going to /quizzes');
      navigate('/quizzes', { state: { openCreate: true } });
      return;
    }

    const config = quizConfig ?? {
      document_id: documentId,
      num_questions: data?.total_questions ?? 10,
      difficulty: 'mixed',
      time_limit_minutes: data?.time_limit_minutes ?? 45,
    };

    console.log('Sending config:', config);

    setRetaking(true);
    setRetakeError('');
    try {
      const res = await fetch(`${API_BASE}/quiz/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Tạo quiz thất bại.');
      }
      const quiz = await res.json();
      console.log('Quiz created, navigating to /quiz/taking');
      navigate('/quiz/taking', { state: { quiz, quizConfig: config } });
    } catch (e: any) {
      setRetakeError(e.message);
      setRetaking(false);
    }
  };

  const loadAIExplanation = async (questionId: string) => {
    if (aiExplanations[questionId] || !data) return;
    setLoadingAI(prev => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch(`${API_BASE}/quiz/result/${data.id}/explanation/${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const exp = await res.json();
        setAiExplanations(prev => ({ ...prev, [questionId]: exp.ai_explanation }));
      }
    } finally {
      setLoadingAI(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <p className="text-on-surface-variant">Không tìm thấy kết quả.</p>
      <button onClick={() => navigate('/quizzes')} className="px-5 py-2.5 hero-gradient text-white rounded-xl font-bold">
        Về trang Quiz
      </button>
    </div>
  );

  const score = data.score ?? 0;
  const percent = Math.round((data.correct_count / data.total_questions) * 100);

  const scoreInfo = score >= 8
    ? { label: 'Xuất sắc!', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200' }
    : score >= 6.5
    ? { label: 'Khá tốt!', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' }
    : score >= 5
    ? { label: 'Trung bình', color: 'text-orange-500', bg: 'bg-orange-50', ring: 'ring-orange-200' }
    : { label: 'Cần cố gắng hơn', color: 'text-red-500', bg: 'bg-red-50', ring: 'ring-red-200' };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} phút ${s} giây`;
  };

  const answersMap: Record<string, AnswerResult> = {};
  (data.answers_with_result ?? []).forEach(a => { answersMap[a.question_id] = a; });

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="bg-white rounded-3xl border border-outline-variant/10 p-8 text-center">
          <div className={cn('inline-flex items-center justify-center w-28 h-28 rounded-full ring-4 mb-4', scoreInfo.bg, scoreInfo.ring)}>
            <span className={cn('text-4xl font-headline font-bold', scoreInfo.color)}>
              {score.toFixed(1)}
            </span>
          </div>
          <h1 className={cn('text-2xl font-headline font-bold mb-1', scoreInfo.color)}>{scoreInfo.label}</h1>
          <p className="text-on-surface-variant text-sm mb-6">Điểm số của bạn</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-surface-container rounded-2xl p-4">
              <p className="text-2xl font-headline font-bold text-emerald-600">{data.correct_count}</p>
              <p className="text-xs text-on-surface-variant mt-1">Câu đúng</p>
            </div>
            <div className="bg-surface-container rounded-2xl p-4">
              <p className="text-2xl font-headline font-bold text-red-500">{data.total_questions - data.correct_count}</p>
              <p className="text-xs text-on-surface-variant mt-1">Câu sai</p>
            </div>
            <div className="bg-surface-container rounded-2xl p-4">
              <p className="text-2xl font-headline font-bold text-primary">{formatTime(data.time_taken_seconds)}</p>
              <p className="text-xs text-on-surface-variant mt-1">Thời gian</p>
            </div>
          </div>

          <div className="w-full bg-surface-container rounded-full h-3 mb-6">
            <div
              className={cn('h-3 rounded-full transition-all', score >= 8 ? 'bg-emerald-500' : score >= 6.5 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex gap-3 justify-center flex-col items-center">
            {retakeError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm w-full">
                <span>⚠️ {retakeError}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/quizzes')}
                className="flex items-center gap-2 px-5 py-2.5 bg-surface-container text-on-surface font-bold rounded-xl text-sm hover:bg-surface-container transition-colors"
              >
                <Home size={16} /> Trang Quiz
              </button>
              <button
                onClick={handleRetake}
                disabled={retaking}
                className="flex items-center gap-2 px-5 py-2.5 hero-gradient text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60"
              >
                {retaking ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Làm lại
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-headline font-bold text-on-surface px-1">Chi tiết từng câu</h2>

          {data.questions.map((q, i) => {
            const ans = answersMap[q.id];
            const isCorrect = ans?.is_correct ?? false;
            const isExpanded = expandedQ === q.id;

            return (
              <div
                key={q.id}
                className={cn(
                  'bg-white rounded-2xl border overflow-hidden transition-all',
                  isCorrect ? 'border-emerald-200' : 'border-red-200'
                )}
              >
                <button
                  onClick={() => {
                    setExpandedQ(isExpanded ? null : q.id);
                    if (!isExpanded) loadAIExplanation(q.id);
                  }}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                  )}>
                    {isCorrect
                      ? <CheckCircle2 size={18} className="text-emerald-600" />
                      : <XCircle size={18} className="text-red-500" />}
                  </span>
                  <p className="flex-1 text-sm font-medium text-on-surface line-clamp-1">
                    <span className="text-on-surface-variant mr-1">{i + 1}.</span>
                    {q.content}
                  </p>
                  {isExpanded ? <ChevronUp size={16} className="text-on-surface-variant shrink-0" /> : <ChevronDown size={16} className="text-on-surface-variant shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-outline-variant/10 pt-3">
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map(opt => {
                        const isSelected = ans?.selected_answer === opt.key;
                        const isCorrectOpt = q.correct_answer === opt.key;
                        return (
                          <div
                            key={opt.key}
                            className={cn(
                              'p-3 rounded-xl border text-sm flex items-center gap-2',
                              isCorrectOpt ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                                : isSelected ? 'border-red-300 bg-red-50 text-red-700'
                                : 'border-outline-variant/20 text-on-surface-variant'
                            )}
                          >
                            <span className="font-bold">{opt.key}.</span>
                            <span>{opt.text}</span>
                            {isCorrectOpt && <CheckCircle2 size={14} className="ml-auto shrink-0 text-emerald-600" />}
                            {isSelected && !isCorrectOpt && <XCircle size={14} className="ml-auto shrink-0 text-red-500" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3 bg-primary/5 rounded-xl text-sm text-on-surface-variant">
                        💡 {q.explanation}
                      </div>
                    )}

                    <div className="p-3 bg-secondary/5 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-secondary" />
                        <span className="text-xs font-bold text-secondary">Giải thích AI</span>
                      </div>
                      {loadingAI[q.id] ? (
                        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                          <div className="w-3 h-3 border border-secondary/30 border-t-secondary rounded-full animate-spin" />
                          Đang tải giải thích...
                        </div>
                      ) : aiExplanations[q.id] ? (
                        <p className="text-sm text-on-surface-variant">{aiExplanations[q.id]}</p>
                      ) : (
                        <button
                          onClick={() => loadAIExplanation(q.id)}
                          className="text-xs text-secondary font-bold hover:underline"
                        >
                          Tải giải thích AI
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}