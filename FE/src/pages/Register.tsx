import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import { Eye, EyeOff, UserPlus, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── Validate helpers ─────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string
): string {
  if (!displayName.trim()) return 'Vui lòng nhập họ và tên.';
  if (displayName.trim().length < 2) return 'Họ và tên phải có ít nhất 2 ký tự.';
  if (displayName.trim().length > 50) return 'Họ và tên không được quá 50 ký tự.';

  if (!email.trim()) return 'Vui lòng nhập email.';
  if (!emailRegex.test(email)) return 'Địa chỉ email không hợp lệ.';

  if (!password) return 'Vui lòng nhập mật khẩu.';
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';
  if (password.length > 100) return 'Mật khẩu quá dài.';
  if (!/[a-zA-Z]/.test(password)) return 'Mật khẩu phải chứa ít nhất một chữ cái.';

  if (!confirmPassword) return 'Vui lòng xác nhận mật khẩu.';
  if (password !== confirmPassword) return 'Mật khẩu xác nhận không khớp.';

  return '';
}

// ── Password strength ────────────────────────────────────────
function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Yếu', color: 'bg-red-400' };
  if (score <= 2) return { level: 2, label: 'Trung bình', color: 'bg-amber-400' };
  if (score <= 3) return { level: 3, label: 'Khá', color: 'bg-blue-400' };
  return { level: 4, label: 'Mạnh', color: 'bg-emerald-500' };
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Field-level touched state để chỉ show lỗi sau khi user đã chạm vào field
  const [touched, setTouched] = useState({
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const strength = getPasswordStrength(password);

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all touched khi submit
    setTouched({ displayName: true, email: true, password: true, confirmPassword: true });

    const validationError = validateForm(displayName, email, password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName.trim());
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('email-already-in-use') || msg.includes('đã được đăng ký')) {
        setError('Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.');
      } else {
        setError(msg || 'Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Inline validation messages
  const nameError = touched.displayName && displayName.trim().length < 2 && displayName.trim().length > 0
    ? 'Tên phải có ít nhất 2 ký tự.' : '';
  const emailError = touched.email && email && !emailRegex.test(email)
    ? 'Email không hợp lệ.' : '';
  const confirmError = touched.confirmPassword && confirmPassword && password !== confirmPassword
    ? 'Mật khẩu không khớp.' : '';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-headline font-bold text-xl text-on-surface">QuizAI</span>
          </div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Tạo tài khoản học sinh</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Đăng ký để tạo quiz và theo dõi kết quả học tập
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-sm p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-6 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

            {/* Họ và tên */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Họ và tên</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={() => handleBlur('displayName')}
                placeholder="Nguyễn Văn A"
                required
                autoComplete="off"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-surface',
                  'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm',
                  nameError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10'
                )}
              />
              {nameError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{nameError}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="example@email.com"
                required
                autoComplete="off"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border bg-surface',
                  'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm',
                  emailError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10'
                )}
              />
              {emailError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{emailError}
                </p>
              )}
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  placeholder="Tối thiểu 6 ký tự"
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

              {/* Password strength bar */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-all',
                          i <= strength.level ? strength.color : 'bg-outline-variant/20'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    Độ mạnh: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Xác nhận mật khẩu</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Nhập lại mật khẩu"
                  required
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 pr-11 rounded-xl border bg-surface',
                    'outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50 text-sm',
                    confirmError
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : confirmPassword && password === confirmPassword
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{confirmError}
                </p>
              )}
              {!confirmError && confirmPassword && password === confirmPassword && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />Mật khẩu khớp
                </p>
              )}
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
                <><UserPlus className="w-4 h-4" />Tạo tài khoản</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-on-surface-variant mt-6">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}