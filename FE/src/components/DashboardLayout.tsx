import React from "react";
import {
  LayoutDashboard,
  Database,
  FileQuestion,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Menu,
  Bell,
  Search,
  Sparkles,
  X,
  User,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { useAuth } from "@/src/contexts/AuthContext";
import { API_BASE } from "@/src/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout, token } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  const [recentResults, setRecentResults] = React.useState<any[]>([]);

  const notificationRef = React.useRef<HTMLDivElement | null>(null);
  const userMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    if (!token) return;

    const fetchRecentResults = async () => {
      try {
        const res = await fetch(`${API_BASE}/quiz/history/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setRecentResults(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch {
        // ignore
      }
    };

    fetchRecentResults();
  }, [token]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleLabel: Record<string, string> = {
    admin: "Quản trị viên",
    teacher: "Giáo viên",
    student: "Học sinh",
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} phút ${s.toString().padStart(2, "0")} giây`;
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return "—";

    return new Date(dateString).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const allNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/dashboard",
      roles: ["admin", "student"],
    },
    // {
    //   icon: Database,
    //   label: "Ngân hàng câu hỏi",
    //   path: "/questions",
    //   roles: ["admin"],
    // },
    {
      icon: FileQuestion,
      label: "Quản lý bài Quiz",
      path: "/quizzes",
      roles: ["admin", "student"],
    },
    {
      icon: BarChart3,
      label: "Báo cáo & Thống kê",
      path: "/reports",
      roles: [ "student"],
    },
{
icon :User,
label: "Quản lý người dùng",
path: "/users",
roles: ["admin"],
},
    {
      icon: Settings,
      label: "Cài đặt",
      path: "/settings",
      roles: ["admin", "teacher", "student"],
    },
  ];

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(profile?.role ?? "student")
  );

  return (
    <div className="flex min-h-screen bg-surface">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-outline-variant/10 transition-all duration-300 lg:translate-x-0 lg:static lg:inset-0",
          isSidebarCollapsed ? "lg:w-20" : "lg:w-64",
          isMobileMenuOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="px-2 py-6 mb-4 flex items-center justify-between">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-2",
                isSidebarCollapsed && "justify-center w-full"
              )}
            >
              <div className="w-8 h-8 rounded-lg hero-gradient flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>

              {!isSidebarCollapsed && (
                <span className="text-xl font-bold text-primary tracking-tight font-headline">
                  QuizAI
                </span>
              )}
            </Link>

            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant"
                title="Thu gọn menu"
              >
                <Menu size={18} />
              </button>
            )}
          </div>

          {isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="hidden lg:flex w-10 h-10 mx-auto mb-4 items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant"
              title="Mở rộng menu"
            >
              <Menu size={18} />
            </button>
          )}

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 py-3 rounded-xl transition-all duration-200 font-headline text-sm",
                  isSidebarCollapsed ? "justify-center px-0" : "px-4",
                  location.pathname === item.path
                    ? "bg-primary/5 text-primary font-bold"
                    : "text-on-surface-variant hover:bg-surface-container"
                )}
              >
                <item.icon size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-outline-variant/10 mt-auto">
            <div
              className={cn(
                "flex items-center gap-3 py-4 mb-2",
                isSidebarCollapsed ? "justify-center px-0" : "px-2"
              )}
            >
              <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
                {profile?.display_name?.charAt(0).toUpperCase() ?? "?"}
              </div>

              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface truncate">
                    {profile?.display_name ?? "Người dùng"}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {roleLabel[profile?.role ?? "student"]}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowHelp(true)}
              title={isSidebarCollapsed ? "Trợ giúp" : undefined}
              className={cn(
                "flex items-center gap-3 py-2 w-full text-on-surface-variant hover:text-primary transition-colors text-sm rounded-lg",
                isSidebarCollapsed ? "justify-center px-0" : "px-4"
              )}
            >
              <HelpCircle size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span>Trợ giúp</span>}
            </button>

            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Đăng xuất" : undefined}
              className={cn(
                "flex items-center gap-3 py-2 w-full text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm",
                isSidebarCollapsed ? "justify-center px-0" : "px-4"
              )}
            >
              <LogOut size={18} className="shrink-0" />
              {!isSidebarCollapsed && <span>Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex justify-between items-center w-full px-6 py-3 h-16 sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-outline-variant/10">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="lg:hidden p-2 hover:bg-surface-container rounded-full transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={20} />
            </button>

            <div className="relative w-full max-w-md hidden sm:block">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
              >
                <Bell size={20} />

                {recentResults.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-outline-variant/10 p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-headline font-bold text-on-surface">
                      Thông báo
                    </h3>

                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Đóng
                    </button>
                  </div>

                  {recentResults.length === 0 ? (
                    <div className="p-4 bg-surface-container rounded-xl text-sm text-on-surface-variant">
                      Chưa có thông báo nào. Sau khi bạn hoàn thành quiz, kết
                      quả sẽ hiển thị tại đây.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setShowNotifications(false);
                            navigate("/quiz/result", {
                              state: { resultId: item.id },
                            });
                          }}
                          className="w-full text-left p-3 bg-primary/5 rounded-xl border border-primary/10 hover:bg-primary/10 transition-colors"
                        >
                          <p className="text-sm font-bold text-primary">
                            Hoàn thành Quiz {item.total_questions} câu
                          </p>

                          <p className="text-xs text-on-surface-variant mt-1">
                            Điểm:{" "}
                            <b>{Number(item.score ?? 0).toFixed(1)}/10</b> ·
                            Đúng{" "}
                            <b>
                              {item.correct_count ?? 0}/{item.total_questions}
                            </b>
                          </p>

                          <p className="text-xs text-on-surface-variant mt-1">
                            Thời gian làm bài:{" "}
                            {formatDuration(item.time_taken_seconds)}
                          </p>

                          <p className="text-[11px] text-on-surface-variant/70 mt-2">
                            Hoàn thành lúc: {formatDateTime(item.completed_at)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu((prev) => !prev);
                  setShowNotifications(false);
                }}
                className="w-8 h-8 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-xs"
              >
                {profile?.display_name?.charAt(0).toUpperCase() ?? "?"}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-xl border border-outline-variant/10 p-3 z-50">
                  <div className="px-3 py-3 border-b border-outline-variant/10 mb-2">
                    <p className="text-sm font-bold text-on-surface">
                      {profile?.display_name ?? "Người dùng"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {roleLabel[profile?.role ?? "student"]}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/settings");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-container transition-colors"
                  >
                    Cài đặt tài khoản
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate("/reports");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-container transition-colors"
                  >
                    Báo cáo học tập
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</div>
      </main>

      {showHelp && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-headline font-bold">
                  Trợ giúp QuizAI
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Hướng dẫn nhanh cách sử dụng hệ thống.
                </p>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm text-on-surface">
              <div>
                <h3 className="font-bold text-primary mb-2">
                  1. Tạo bài quiz
                </h3>
                <p>
                  Vào <b>Quản lý bài Quiz</b>, upload hoặc chọn tài liệu, sau
                  đó chọn số câu hỏi, thời gian, độ khó và bấm{" "}
                  <b>Bắt đầu làm bài</b>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-2">2. Làm bài</h3>
                <p>
                  Chọn đáp án cho từng câu, có thể chuyển qua lại giữa các câu
                  hỏi. Khi hoàn thành, bấm <b>Nộp bài</b>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-primary mb-2">3. Xem kết quả</h3>
                <p>
                  Sau khi nộp bài, hệ thống sẽ hiển thị điểm số, số câu
                  đúng/sai, đáp án đúng và phần giải thích. Lịch sử nằm trong{" "}
                  <b>Báo cáo & Thống kê</b>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-red-500 mb-2">
                  4. Lỗi thường gặp
                </h3>
                <ul className="list-disc pl-5 space-y-1 text-on-surface-variant">
                  <li>AI quá tải: thử lại sau vài phút.</li>
                  <li>
                    Tài liệu không đọc được: thử file PDF rõ hơn, DOCX hoặc TXT.
                  </li>
                  <li>Không thấy tài liệu: upload lại file.</li>
                  <li>
                    Không đăng nhập được: kiểm tra email, mật khẩu hoặc đăng
                    nhập lại.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-surface-container rounded-xl">
                <p className="font-bold">Liên hệ hỗ trợ</p>
                <p className="text-on-surface-variant mt-1">
                  Email: thachneo59@gmail.com
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}