import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

interface Option { key: string; text: string; }
interface Question { id: string; content: string; options: Option[]; difficulty: string; topic: string; }
interface QuizData {
  id: string; questions: Question[]; total_questions: number; time_limit_minutes: number; status: string;
}

export default function QuizTaking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();

  const quiz: QuizData = location.state?.quiz;
  const quizConfig = location.state?.quizConfig;

  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = React.useState((quiz?.time_limit_minutes ?? 30) * 60);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [showConfirm, setShowConfirm] = React.useState(false);
  const startTime = React.useRef(Date.now());

  // Redirect nếu không có quiz
  React.useEffect(() => {
    if (!quiz) navigate('/quizzes');
  }, [quiz]);

  // Timer
  React.useEffect(() => {
    if (!quiz) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true); // Auto submit khi hết giờ
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [quiz]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (questionId: string, key: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: key }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
      const answerList = quiz.questions.map(q => ({
        question_id: q.id,
        selected_answer: answers[q.id] ?? '',
      }));

      const res = await fetch(`${API_BASE}/quiz/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_result_id: quiz.id,
          answers: answerList,
          time_taken_seconds: timeTaken,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Nộp bài thất bại.');
      }
      const result = await res.json();
      navigate('/quiz/result', { state: { result, quizConfig } });
    } catch (e: any) {
      setSubmitError(e.message);
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (!quiz) return null;

  const currentQ = quiz.questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const totalQ = quiz.questions.length;
  const isLowTime = timeLeft < 60;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-outline-variant/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center">
              <span className="text-white text-xs font-bold">Q</span>
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Quiz {totalQ} câu</p>
              <p className="text-xs text-on-surface-variant">{answeredCount}/{totalQ} đã trả lời</p>
            </div>
          </div>

          {/* Timer */}
          <div className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-headline font-bold text-lg transition-all',
            isLowTime ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-surface-container text-on-surface'
          )}>
            <Clock size={18} />
            {formatTime(timeLeft)}
          </div>

          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="px-5 py-2.5 hero-gradient text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
          >
            <Send size={16} />
            Nộp bài
          </button>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mt-2">
          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full hero-gradient rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / totalQ) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex gap-6">
        {/* Question area */}
        <div className="flex-1 space-y-6">
          {/* Question card */}
          <div className="bg-white rounded-2xl border border-outline-variant/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full">
                Câu {currentIdx + 1}/{totalQ}
              </span>
              {currentQ.topic && (
                <span className="text-xs text-secondary bg-secondary/5 px-2.5 py-1 rounded-full font-medium">
                  {currentQ.topic}
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-on-surface leading-relaxed">{currentQ.content}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map(opt => {
              const isSelected = answers[currentQ.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(currentQ.id, opt.key)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant/20 bg-white hover:border-primary/40 hover:bg-primary/3 text-on-surface'
                  )}
                >
                  <span className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all',
                    isSelected ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                  )}>
                    {opt.key}
                  </span>
                  <span className="text-sm font-medium">{opt.text}</span>
                  {isSelected && <CheckCircle2 size={18} className="ml-auto shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={18} /> Câu trước
            </button>
            <button
              onClick={() => setCurrentIdx(i => Math.min(totalQ - 1, i + 1))}
              disabled={currentIdx === totalQ - 1}
              className="flex items-center gap-2 px-5 py-2.5 hero-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
            >
              Câu tiếp <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Question navigator sidebar */}
        <div className="w-48 shrink-0 hidden md:block">
          <div className="bg-white rounded-2xl border border-outline-variant/10 p-4 sticky top-28">
            <p className="text-xs font-bold text-on-surface-variant mb-3">Danh sách câu hỏi</p>
            <div className="grid grid-cols-4 gap-1.5">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={cn(
                    'w-full aspect-square rounded-lg text-xs font-bold transition-all',
                    i === currentIdx
                      ? 'hero-gradient text-white scale-110'
                      : answers[q.id]
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-on-surface-variant">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary/10" />
                <span>Đã trả lời ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-surface-container" />
                <span>Chưa trả lời ({totalQ - answeredCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm submit modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Xác nhận nộp bài?</h3>
            <p className="text-sm text-on-surface-variant mb-2">
              Bạn đã trả lời <strong>{answeredCount}/{totalQ}</strong> câu hỏi.
            </p>
            {answeredCount < totalQ && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm mb-4">
                <AlertCircle size={16} />
                Còn {totalQ - answeredCount} câu chưa trả lời.
              </div>
            )}
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-700 text-sm mb-4">
                <AlertCircle size={16} />
                {submitError}
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface font-bold rounded-xl text-sm hover:bg-surface-container transition-colors"
              >
                Làm tiếp
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex-1 py-3 hero-gradient text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}