import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  Sparkles,
  BrainCircuit,
  Clock,
  FileText,
  TrendingUp,
  BookOpen,
  BarChart3,
  CheckCircle2,
  Trophy,
  Target,
  Plus,
  History,
  Database,
  Users,
  Layers,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { API_BASE } from "@/src/lib/api";

interface QuizHistoryItem {
  id: string;
  score: number | null;
  correct_count: number | null;
  total_questions: number;
  time_limit_minutes: number;
  time_taken_seconds: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface AdminQuizResult {
  id: string;
  score?: number | null;
  correct_count?: number | null;
  total_questions?: number;
  time_taken_seconds?: number | null;
  status: string;
  completed_at?: string | null;
  created_at?: string | null;
}

interface AdminStats {
  users?: {
    total: number;
    active: number;
    inactive: number;
  };
  documents?: {
    total: number;
  };
  questions?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  quizzes?: {
    total: number;
    completed: number;
    avg_score: number;
  };
}

export default function Dashboard() {
  const { profile } = useAuth();

  if (profile?.role === "admin") {
    return <AdminDashboard />;
  }

  return <StudentDashboard />;
}

function StudentDashboard() {
  const { profile, token } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = React.useState<QuizHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      setLoading(true);

      try {
        const res = await fetch(`${API_BASE}/quiz/history/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setHistory(Array.isArray(data) ? data : []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  const completedHistory = history.filter(
    (item) => item.status === "completed"
  );

  const totalQuizzes = completedHistory.length;

  const totalQuestions = completedHistory.reduce(
    (sum, item) => sum + (item.total_questions || 0),
    0
  );

  const totalCorrect = completedHistory.reduce(
    (sum, item) => sum + (item.correct_count || 0),
    0
  );

  const accuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const avgScore =
    totalQuizzes > 0
      ? completedHistory.reduce((sum, item) => sum + (item.score || 0), 0) /
        totalQuizzes
      : 0;

  const totalTimeSeconds = completedHistory.reduce(
    (sum, item) => sum + (item.time_taken_seconds || 0),
    0
  );

  const totalTimeText =
    totalTimeSeconds >= 3600
      ? `${(totalTimeSeconds / 3600).toFixed(1)} giờ`
      : `${Math.round(totalTimeSeconds / 60)} phút`;

  const latestResult = completedHistory[0];

  const displayName = profile?.display_name || "bạn";
  const firstName = displayName.trim().split(" ").slice(-1)[0] || displayName;

  const getScoreLabel = () => {
    if (totalQuizzes === 0) return "Bắt đầu thôi";
    if (avgScore >= 8) return "Xuất sắc";
    if (avgScore >= 6.5) return "Khá tốt";
    if (avgScore >= 5) return "Ổn định";
    return "Cần cố gắng";
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s.toString().padStart(2, "0")} giây`;
  };

  const statCards = [
    {
      label: "Tỉ lệ đúng",
      value: totalQuizzes === 0 ? "—" : `${accuracy}%`,
      status:
        totalQuizzes === 0
          ? "Chưa có dữ liệu"
          : accuracy >= 70
          ? "Tỉ lệ tốt"
          : "Cần luyện thêm",
      icon: Target,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      label: "Bài đã hoàn thành",
      value: String(totalQuizzes),
      status: totalQuizzes >= 5 ? "Chăm chỉ" : "Mới bắt đầu",
      icon: BookOpen,
      color: "text-secondary",
      bg: "bg-secondary/5",
    },
    {
      label: "Điểm trung bình",
      value: totalQuizzes === 0 ? "—" : avgScore.toFixed(1),
      status: getScoreLabel(),
      icon: Trophy,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 relative overflow-hidden hero-gradient rounded-3xl p-8 text-white">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold mb-5">
              <Sparkles size={14} />
              QuizAI Learning
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 font-headline">
              Chào mừng trở lại, {firstName}!
            </h1>

            <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
              Upload tài liệu, để AI tạo quiz và luyện tập ngay. Hệ thống sẽ lưu
              kết quả để bạn theo dõi quá trình tiến bộ.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/quizzes")}
                className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-primary-fixed transition-colors"
              >
                <Plus size={18} />
                Tạo bài Quiz mới
              </button>

              <button
                onClick={() => navigate("/reports")}
                className="inline-flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors"
              >
                <BarChart3 size={18} />
                Xem báo cáo
              </button>
            </div>
          </div>

          <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
            <BrainCircuit size={210} />
          </div>
        </div>

        <div className="xl:col-span-4 bg-white border border-outline-variant/10 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold mb-4">
              <Sparkles size={12} className="mr-1" />
              Gợi ý học tập
            </span>

            {totalQuizzes === 0 ? (
              <>
                <p className="font-headline text-lg font-bold text-on-surface mb-2">
                  Hãy tạo quiz đầu tiên
                </p>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Bạn chưa có kết quả làm bài. Hãy vào Quản lý bài Quiz, chọn
                  tài liệu và bắt đầu luyện tập.
                </p>
              </>
            ) : (
              <>
                <p className="font-headline text-lg font-bold text-on-surface mb-2">
                  Tiếp tục cải thiện kết quả
                </p>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Điểm trung bình hiện tại của bạn là{" "}
                  <b>{avgScore.toFixed(1)}/10</b>. Hãy làm thêm quiz để tăng độ
                  chính xác.
                </p>
              </>
            )}
          </div>

          <button
            onClick={() => navigate("/quizzes")}
            className="text-secondary font-bold text-sm flex items-center gap-1 group mt-6"
          >
            Đi tới Quản lý bài Quiz
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl flex items-center gap-5 asymmetric-shadow border border-outline-variant/10"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                stat.bg,
                stat.color
              )}
            >
              <stat.icon size={26} />
            </div>

            <div>
              <p className="text-sm text-on-surface-variant">{stat.label}</p>
              <div className="flex items-end gap-2">
                <h3
                  className={cn(
                    "text-3xl font-headline font-extrabold",
                    stat.color
                  )}
                >
                  {stat.value}
                </h3>

                {stat.label === "Điểm trung bình" && totalQuizzes > 0 && (
                  <span className="text-xs text-on-surface-variant mb-1">
                    /10
                  </span>
                )}
              </div>

              <p className="text-sm font-bold text-on-surface mt-1">
                {stat.status}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SummaryCard
          icon={Clock}
          title="Thời gian học"
          subtitle="Tổng thời gian làm quiz"
          value={totalQuizzes === 0 ? "—" : totalTimeText}
          color="text-primary"
          bg="bg-primary/5"
        />

        <SummaryCard
          icon={CheckCircle2}
          title="Tổng câu đúng"
          subtitle="Tất cả bài đã hoàn thành"
          value={
            totalQuestions === 0 ? "—" : `${totalCorrect}/${totalQuestions}`
          }
          color="text-emerald-600"
          bg="bg-emerald-50"
        />

        <div className="bg-white rounded-2xl border border-outline-variant/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="font-headline font-bold">Bài gần nhất</h3>
              <p className="text-xs text-on-surface-variant">
                Kết quả mới nhất
              </p>
            </div>
          </div>

          {latestResult ? (
            <button
              onClick={() =>
                navigate("/quiz/result", {
                  state: { resultId: latestResult.id },
                })
              }
              className="text-left group w-full"
            >
              <p className="text-3xl font-headline font-extrabold text-orange-500">
                {(latestResult.score ?? 0).toFixed(1)}/10
              </p>

              <p className="text-xs text-on-surface-variant mt-1">
                Đúng {latestResult.correct_count ?? 0}/
                {latestResult.total_questions} ·{" "}
                {formatDuration(latestResult.time_taken_seconds)}
              </p>

              <p className="text-xs text-primary font-bold mt-2 group-hover:underline">
                Xem lại kết quả
              </p>
            </button>
          ) : (
            <p className="text-3xl font-headline font-extrabold text-on-surface-variant">
              —
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-on-surface font-headline">
            Bắt đầu học tập
          </h2>
          <p className="text-sm text-on-surface-variant">
            Các thao tác chính dành cho học sinh.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionCard
            icon={FileText}
            title="Tạo quiz từ tài liệu"
            description="Chọn tài liệu đã upload và để AI tạo bài quiz luyện tập."
            button="Tạo quiz"
            onClick={() => navigate("/quizzes")}
            color="primary"
          />

          <ActionCard
            icon={History}
            title="Xem báo cáo học tập"
            description="Theo dõi điểm số, thời gian làm bài và lịch sử học tập."
            button="Xem báo cáo"
            onClick={() => navigate("/reports")}
            color="secondary"
          />

          <ActionCard
            icon={BookOpen}
            title="Tiếp tục luyện tập"
            description="Làm thêm quiz mới để cải thiện điểm số và độ chính xác."
            button="Luyện tập"
            onClick={() => navigate("/quizzes")}
            color="emerald"
          />
        </div>
      </section>

      {loading && (
        <p className="text-sm text-on-surface-variant">
          Đang cập nhật dữ liệu học tập...
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  subtitle,
  value,
  color,
  bg,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant/10 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            bg,
            color
          )}
        >
          <Icon size={20} />
        </div>

        <div>
          <h3 className="font-headline font-bold">{title}</h3>
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        </div>
      </div>

      <p className={cn("text-3xl font-headline font-extrabold", color)}>
        {value}
      </p>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  title,
  description,
  button,
  onClick,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  button: string;
  onClick: () => void;
  color: "primary" | "secondary" | "emerald";
}) {
  const colorClass = {
    primary: "bg-primary/5 text-primary border-primary/10",
    secondary: "bg-secondary/5 text-secondary border-secondary/10",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-outline-variant/10 p-6 hover:shadow-lg transition-all">
      <div
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border",
          colorClass
        )}
      >
        <Icon size={24} />
      </div>

      <h3 className="font-headline font-bold text-lg mb-2">{title}</h3>

      <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
        {description}
      </p>

      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
      >
        {button}
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

function AdminDashboard() {
  const { token } = useAuth();

  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [quizResults, setQuizResults] = React.useState<AdminQuizResult[]>([]);
  const [adminError, setAdminError] = React.useState("");

React.useEffect(() => {
  if (!token) return;

  const fetchStats = async () => {
    setLoading(true);
    setAdminError("");

    try {
      const [statsRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/dashboard/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE}/admin/quiz-results`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!statsRes.ok) {
        const err = await statsRes.json().catch(() => null);

        throw new Error(
          err?.detail ||
            `Không lấy được thống kê admin. Mã lỗi: ${statsRes.status}`
        );
      }

      const statsData = await statsRes.json();
      setStats(statsData);

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setQuizResults(Array.isArray(resultsData) ? resultsData : []);
      } else {
        console.warn("Không lấy được quiz results:", resultsRes.status);
        setQuizResults([]);
      }
    } catch (error: any) {
      console.error("Admin dashboard error:", error);
      setAdminError(
        error?.message || "Không lấy được dữ liệu dashboard admin."
      );
      setStats(null);
      setQuizResults([]);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, [token]);

  const cards = [
    {
      label: "Người dùng",
      value: stats?.users?.total ?? 0,
      sub: `${stats?.users?.active ?? 0} đang hoạt động`,
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Tài liệu",
      value: stats?.documents?.total ?? 0,
      sub: "Tổng tài liệu đã upload",
      icon: FileText,
      color: "bg-secondary/10 text-secondary",
    },
    {
      label: "Câu hỏi",
      value: stats?.questions?.total ?? 0,
      sub: `${stats?.questions?.approved ?? 0} đã duyệt`,
      icon: Layers,
      color: "bg-orange-500/10 text-orange-500",
    },
    {
      label: "Bài quiz",
      value: stats?.quizzes?.completed ?? 0,
      sub: `Điểm TB: ${stats?.quizzes?.avg_score ?? 0}/10`,
      icon: BarChart3,
      color: "bg-emerald-50 text-emerald-600",
    },
  ];

  const buildLast7DaysChartData = () => {
    const today = new Date();

    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));

      const key = date.toISOString().slice(0, 10);

      return {
        key,
        label: date.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
        }),
        count: 0,
      };
    });

    quizResults.forEach((item) => {
      if (!item.completed_at) return;

      const completedDate = new Date(item.completed_at);
      const key = completedDate.toISOString().slice(0, 10);

      const matchedDay = days.find((day) => day.key === key);

      if (matchedDay) {
        matchedDay.count += 1;
      }
    });

    return days;
  };

  const activityChartData = buildLast7DaysChartData();

  return (
    <div className="space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
            Dashboard quản trị
          </h2>

          <p className="text-on-surface-variant mt-1">
            Theo dõi tổng quan người dùng, tài liệu, câu hỏi và kết quả quiz.
          </p>
        </div>

        <div className="flex gap-3">
          {/* <Link
            to="/questions"
            className="hero-gradient text-white px-5 py-2.5 rounded-xl font-headline font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
          >
            <Database size={18} />
            Ngân hàng câu hỏi
          </Link> */}

          <Link
            to="/quizzes"
            className="ai-sparkle-gradient text-white px-5 py-2.5 rounded-xl font-headline font-semibold flex items-center gap-2 hover:opacity-90 transition-all"
          >
            <Sparkles size={18} />
            Quản lý Quiz
          </Link>
        </div>
      </section>
      {adminError && (
  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
    {adminError}
  </div>
)}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl flex flex-col justify-between border border-outline-variant/10"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                stat.color
              )}
            >
              <stat.icon size={24} />
            </div>

            <div className="mt-5">
              <p className="text-sm font-medium text-on-surface-variant">
                {stat.label}
              </p>

              <h3 className="text-3xl font-headline font-extrabold mt-1">
                {loading ? "..." : stat.value}
              </h3>

              <p className="text-xs text-on-surface-variant mt-1">
                {stat.sub}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-white p-6 rounded-2xl border border-outline-variant/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-headline font-bold text-on-surface">
              Hoạt động quiz trong 7 ngày gần nhất
            </h3>

            <p className="text-sm text-on-surface-variant mt-1">
              Số bài quiz học sinh đã hoàn thành theo từng ngày.
            </p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChartData}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value) => [`${value} bài`, "Quiz hoàn thành"]}
                labelFormatter={(label) => `Ngày ${label}`}
              />

              <Bar
                dataKey="count"
                name="Quiz hoàn thành"
                radius={[8, 8, 0, 0]}
                fill="#2563eb"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-outline-variant/10">
        <h3 className="text-lg font-headline font-bold mb-2">Gợi ý quản trị</h3>

        <p className="text-sm text-on-surface-variant leading-relaxed">
          Quản trị viên có thể kiểm tra ngân hàng câu hỏi, quản lý quiz, theo
          dõi lịch sử làm bài và đảm bảo chất lượng nội dung AI sinh ra trong hệ
          thống.
        </p>
      </section>
    </div>
  );
}