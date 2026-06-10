import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  History as HistoryIcon,
  Calendar,
  Clock,
  ChevronRight,
  Search,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';

interface QuizResult {
  id: string;
  score: number | null;
  correct_count: number | null;
  total_questions: number;
  time_limit_minutes: number;
  time_taken_seconds: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  document_id?: string;
}

export default function History() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = React.useState<QuizResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/quiz/history/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s.toString().padStart(2, '0')} giây`;
  };

  const totalDone = history.length;

  const totalSeconds = history.reduce(
    (sum, item) => sum + (item.time_taken_seconds ?? 0),
    0
  );

  const totalHours = totalSeconds / 3600;

  const totalCorrect = history.reduce(
    (sum, item) => sum + (item.correct_count ?? 0),
    0
  );

  const totalQuestions = history.reduce(
    (sum, item) => sum + item.total_questions,
    0
  );

  const accuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const chartData = history
  .slice()
  .reverse()
  .map((item, index) => ({
    name: `Bài ${index + 1}`,
    score: Number(item.score ?? 0),
    correct: item.correct_count ?? 0,
    wrong: item.total_questions - (item.correct_count ?? 0),
    time: Math.round((item.time_taken_seconds ?? 0) / 60),
  }));

const pieData = [
  { name: 'Câu đúng', value: totalCorrect },
  { name: 'Câu sai', value: Math.max(totalQuestions - totalCorrect, 0) },
];

  const filtered = history.filter(item => {
    const title = `Quiz ${item.total_questions} câu`;
    return title.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
          Báo cáo & Thống kê
        </h1>
        <p className="text-on-surface-variant mt-1">
          Theo dõi lịch sử làm bài, điểm số và tiến độ học tập của bạn.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 asymmetric-shadow">
          <p className="text-sm font-medium text-on-surface-variant">Tổng bài làm</p>
          <h3 className="text-3xl font-headline font-extrabold mt-1 text-primary">
            {totalDone}
          </h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 asymmetric-shadow">
          <p className="text-sm font-medium text-on-surface-variant">Thời gian học</p>
          <h3 className="text-3xl font-headline font-extrabold mt-1 text-secondary">
            {totalHours.toFixed(1)}h
          </h3>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-outline-variant/10 asymmetric-shadow">
          <p className="text-sm font-medium text-on-surface-variant">Độ chính xác</p>
          <h3 className="text-3xl font-headline font-extrabold mt-1 text-emerald-500">
            {accuracy}%
          </h3>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Biểu đồ điểm số */}
  <div className="bg-white rounded-2xl border border-outline-variant/10 p-6">
    <h3 className="text-lg font-headline font-bold mb-1">
      Tiến độ điểm số
    </h3>
    <p className="text-sm text-on-surface-variant mb-6">
      Theo dõi điểm số qua các lần làm quiz.
    </p>

    {chartData.length === 0 ? (
      <div className="h-64 flex items-center justify-center text-sm text-on-surface-variant">
        Chưa có dữ liệu để hiển thị biểu đồ.
      </div>
    ) : (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, 10]} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Điểm"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>

  {/* Biểu đồ đúng / sai */}
  <div className="bg-white rounded-2xl border border-outline-variant/10 p-6">
    <h3 className="text-lg font-headline font-bold mb-1">
      Tỉ lệ đúng / sai
    </h3>
    <p className="text-sm text-on-surface-variant mb-6">
      Tổng hợp kết quả từ tất cả bài quiz đã làm.
    </p>

    {totalQuestions === 0 ? (
      <div className="h-64 flex items-center justify-center text-sm text-on-surface-variant">
        Chưa có dữ liệu để hiển thị biểu đồ.
      </div>
    ) : (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={85}
              label
            >
              <Cell fill="#10b981" />
              <Cell fill="#ef4444" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}

    <div className="flex justify-center gap-6 mt-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-emerald-500" />
        Câu đúng
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500" />
        Câu sai
      </div>
    </div>
  </div>
</div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
        <div className="p-6 border-b border-outline-variant/10 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-headline font-bold">Các bài đã thực hiện</h3>

          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm bài quiz..."
              className="pl-9 pr-4 py-2 bg-surface-container border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm">Đang tải lịch sử...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
            <BookOpen size={42} className="opacity-30" />
            <p className="text-sm">Chưa có bài quiz nào được hoàn thành.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {filtered.map(item => {
              const score = item.score ?? 0;

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    navigate('/quiz/result', { state: { resultId: item.id } })
                  }
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-surface-container/50 transition-colors group text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center flex-shrink-0">
                      <HistoryIcon size={24} />
                    </div>

                    <div>
                      <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors">
                        Quiz {item.total_questions} câu
                      </h4>

                      <div className="flex flex-wrap items-center gap-4 mt-1 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(item.completed_at ?? item.created_at)}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatTime(item.time_taken_seconds)}
                        </span>

                        <span>
                          Đúng {item.correct_count ?? 0}/{item.total_questions}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 mt-4 sm:mt-0">
                    <div className="text-right">
                      <p className={cn(
                        'text-lg font-headline font-extrabold',
                        score >= 8
                          ? 'text-emerald-600'
                          : score >= 6.5
                          ? 'text-amber-600'
                          : 'text-red-500'
                      )}>
                        {score.toFixed(1)}/10
                      </p>

                      <p className={cn(
                        'text-[10px] font-bold uppercase tracking-widest',
                        score >= 5 ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {score >= 5 ? 'Hoàn thành' : 'Cần cải thiện'}
                      </p>
                    </div>

                    <ChevronRight
                      className="text-outline group-hover:translate-x-1 transition-transform"
                      size={20}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}