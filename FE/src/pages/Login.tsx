import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { Eye, EyeOff, LogIn, Sparkles, AlertCircle, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';

type View = 'login' | 'forgot' | 'forgot-success';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // ── Đăng nhập ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.includes('user-not-found') ||
        msg.includes('wrong-password') ||
        msg.includes('invalid-credential')
      ) {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (msg.includes('too-many-requests')) {
        setError('Quá nhiều lần thử. Vui lòng thử lại sau.');
      } else {
        setError(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Quên mật khẩu ───────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Vui lòng nhập địa chỉ email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('Địa chỉ email không hợp lệ.');
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setView('forgot-success');
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        setForgotError('Email không tồn tại hoặc chưa được đăng ký trong hệ thống.');
      } else if (code === 'auth/too-many-requests') {
        setForgotError('Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.');
      } else {
        setForgotError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const switchToForgot = () => {
    setForgotEmail(email); // pre-fill email nếu đã nhập
    setForgotError('');
    setView('forgot');
  };

  const switchToLogin = () => {
    setError('');
    setView('login');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-headline font-bold text-xl text-on-surface">QuizAI</span>
          </div>

          {view === 'login' && (
            <>
              <h1 className="text-2xl font-headline font-bold text-on-surface">Chào mừng trở lại!</h1>
              <p className="text-on-surface-variant mt-1 text-sm">Đăng nhập để tiếp tục học tập</p>
            </>
          )}
          {(view === 'forgot' || view === 'forgot-success') && (
            <>
              <h1 className="text-2xl font-headline font-bold text-on-surface">Quên mật khẩu?</h1>
              <p className="text-on-surface-variant mt-1 text-sm">
                Nhập email để nhận link đặt lại mật khẩu
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-8">

          {/* ── VIEW: LOGIN ── */}
          {view === 'login' && (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-6 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* autocomplete="off" để không hiện email cũ sau khi logout */}
              <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    autoComplete="off"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl border bg-surface',
                      'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10',
                      'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm'
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">Mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      className={cn(
                        'w-full px-4 py-3 pr-11 rounded-xl border bg-surface',
                        'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10',
                        'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Quên mật khẩu */}
                  <div className="text-right mt-1.5">
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    'hero-gradient text-white shadow-sm',
                    'hover:opacity-90 active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn className="w-4 h-4" />Đăng nhập</>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-on-surface-variant mt-6">
                Chưa có tài khoản?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Đăng ký ngay
                </Link>
              </p>
            </>
          )}

          {/* ── VIEW: FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <button
                onClick={switchToLogin}
                className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </button>

              {forgotError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5" autoComplete="off">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-1.5">
                    Email đã đăng ký
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                      autoComplete="off"
                      className={cn(
                        'w-full pl-10 pr-4 py-3 rounded-xl border bg-surface',
                        'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10',
                        'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm'
                      )}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5">
                    Chúng tôi sẽ gửi link đặt lại mật khẩu về email này.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={cn(
                    'w-full py-3 rounded-xl font-semibold text-sm transition-all',
                    'hero-gradient text-white shadow-sm',
                    'hover:opacity-90 active:scale-[0.98]',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Mail className="w-4 h-4" />Gửi link đặt lại mật khẩu</>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── VIEW: FORGOT SUCCESS ── */}
          {view === 'forgot-success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-headline font-bold text-on-surface">Kiểm tra hộp thư!</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Nếu <span className="font-bold text-primary">{forgotEmail}</span> đã được đăng ký,
                  chúng tôi đã gửi link đặt lại mật khẩu đến địa chỉ này.
                </p>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-1">
                  <p className="text-xs font-bold text-amber-700">Không thấy email?</p>
                  <p className="text-xs text-amber-600">• Kiểm tra thư mục <strong>Spam / Junk</strong></p>
                  <p className="text-xs text-amber-600">• Email từ <strong>noreply@...firebaseapp.com</strong></p>
                  <p className="text-xs text-amber-600">• Link có hiệu lực trong <strong>1 giờ</strong></p>
                </div>
              </div>
              <button
                onClick={switchToLogin}
                className="w-full py-3 rounded-xl font-semibold text-sm border border-outline-variant/20 hover:bg-surface-container transition-all flex items-center justify-center gap-2 text-on-surface"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}