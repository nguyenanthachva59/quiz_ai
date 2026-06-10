import React from 'react';
import {
  User, Settings as SettingsIcon, BrainCircuit, Save,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { cn } from '@/src/lib/utils';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { auth } from '@/src/lib/firebase';

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

export default function Settings() {
  const { profile } = useAuth();

  const [defaultQuestions, setDefaultQuestions] = React.useState(localStorage.getItem('defaultQuestions') || '10');
  const [defaultTime, setDefaultTime] = React.useState(localStorage.getItem('defaultTime') || '30');
  const [defaultDifficulty, setDefaultDifficulty] = React.useState(localStorage.getItem('defaultDifficulty') || 'mixed');
  const [showAIExplanation, setShowAIExplanation] = React.useState(localStorage.getItem('showAIExplanation') !== 'false');
  const [strictDocumentMode, setStrictDocumentMode] = React.useState(localStorage.getItem('strictDocumentMode') !== 'false');
  const [saved, setSaved] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwError, setPwError] = React.useState('');
  const [pwSuccess, setPwSuccess] = React.useState(false);

  const strength = getPasswordStrength(newPassword);

  const handleSave = () => {
    localStorage.setItem('defaultQuestions', defaultQuestions);
    localStorage.setItem('defaultTime', defaultTime);
    localStorage.setItem('defaultDifficulty', defaultDifficulty);
    localStorage.setItem('showAIExplanation', String(showAIExplanation));
    localStorage.setItem('strictDocumentMode', String(strictDocumentMode));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (!currentPassword) { setPwError('Vui lòng nhập mật khẩu hiện tại.'); return; }
    if (!newPassword) { setPwError('Vui lòng nhập mật khẩu mới.'); return; }
    if (newPassword.length < 6) { setPwError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (!/[a-zA-Z]/.test(newPassword)) { setPwError('Mật khẩu mới phải chứa ít nhất một chữ cái.'); return; }
    if (newPassword !== confirmNewPassword) { setPwError('Mật khẩu xác nhận không khớp.'); return; }
    if (currentPassword === newPassword) { setPwError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }
    setPwLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Không tìm thấy tài khoản.');
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    } catch (err: any) {
      const code = err.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPwError('Mật khẩu hiện tại không đúng.');
      } else if (code === 'auth/too-many-requests') {
        setPwError('Quá nhiều lần thử sai. Vui lòng thử lại sau.');
      } else if (code === 'auth/requires-recent-login') {
        setPwError('Phiên đăng nhập đã cũ. Vui lòng đăng xuất và đăng nhập lại.');
      } else {
        setPwError(err.message || 'Đổi mật khẩu thất bại.');
      }
    } finally {
      setPwLoading(false);
    }
  };

  const roleLabel: Record<string, string> = {
    admin: 'Quản trị viên',
    teacher: 'Giáo viên',
    student: 'Học sinh',
  };

  const pwChecks = [
    { label: 'Ít nhất 6 ký tự', pass: newPassword.length >= 6 },
    { label: 'Ít nhất 10 ký tự (khuyến nghị)', pass: newPassword.length >= 10 },
    { label: 'Có chữ hoa (A-Z)', pass: /[A-Z]/.test(newPassword) },
    { label: 'Có chữ số (0-9)', pass: /[0-9]/.test(newPassword) },
    { label: 'Có ký tự đặc biệt (!@#$...)', pass: /[^a-zA-Z0-9]/.test(newPassword) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Cài đặt</h1>
        <p className="text-on-surface-variant mt-1">Quản lý thông tin tài khoản và cấu hình mặc định khi tạo bài quiz.</p>
      </div>

      {/* Thông tin tài khoản */}
      <section className="bg-white rounded-2xl border border-outline-variant/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold">Thông tin tài khoản</h2>
            <p className="text-sm text-on-surface-variant">Thông tin người dùng hiện tại</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Họ và tên</label>
            <div className="mt-2 p-3 bg-surface-container rounded-xl text-sm font-medium">{profile?.display_name || 'Người dùng'}</div>
          </div>
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Email</label>
            <div className="mt-2 p-3 bg-surface-container rounded-xl text-sm font-medium">{profile?.email || '—'}</div>
          </div>
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Vai trò</label>
            <div className="mt-2 p-3 bg-surface-container rounded-xl text-sm font-medium">{roleLabel[profile?.role ?? 'student']}</div>
          </div>
        </div>
      </section>

      {/* Đổi mật khẩu */}
      <section className="bg-white rounded-2xl border border-outline-variant/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold">Đổi mật khẩu</h2>
            <p className="text-sm text-on-surface-variant">Cần nhập mật khẩu hiện tại để xác thực trước khi đổi.</p>
          </div>
        </div>

        {pwSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-5 text-emerald-700 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />Đổi mật khẩu thành công!
          </div>
        )}
        {pwError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-5 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{pwError}
          </div>
        )}

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Cột trái: form */}
          <form onSubmit={handleChangePassword} className="space-y-4" autoComplete="off">
            <div>
              <label className="text-sm font-bold text-on-surface-variant">Mật khẩu hiện tại</label>
              <div className="relative mt-2">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border bg-surface text-sm border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant">Mật khẩu mới</label>
              <div className="relative mt-2">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl border bg-surface text-sm border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={cn('h-1 flex-1 rounded-full transition-all', i <= strength.level ? strength.color : 'bg-outline-variant/20')} />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant">Độ mạnh: <span className="font-medium">{strength.label}</span></p>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-on-surface-variant">Xác nhận mật khẩu mới</label>
              <div className="relative mt-2">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 pr-11 rounded-xl border bg-surface text-sm outline-none transition-all text-on-surface placeholder:text-on-surface-variant/50',
                    confirmNewPassword && newPassword !== confirmNewPassword
                      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                      : confirmNewPassword && newPassword === confirmNewPassword
                        ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'border-outline-variant/40 focus:border-primary focus:ring-2 focus:ring-primary/10'
                  )}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} />Mật khẩu không khớp</p>
              )}
              {confirmNewPassword && newPassword === confirmNewPassword && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} />Mật khẩu khớp</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className={cn(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all',
                'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98]',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {pwLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Lock size={16} />Đổi mật khẩu</>
              }
            </button>
          </form>

          {/* Cột phải: checklist + tips */}
          <div className="space-y-4">
            {/* Checklist realtime */}
            <div className="bg-surface-container rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-on-surface">Yêu cầu mật khẩu mới</p>
              {pwChecks.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all',
                    newPassword
                      ? item.pass ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'
                      : 'bg-outline-variant/10 text-on-surface-variant/30'
                  )}>
                    {newPassword && item.pass
                      ? <CheckCircle2 size={13} />
                      : <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    }
                  </div>
                  <span className={cn(
                    'text-sm transition-colors',
                    newPassword
                      ? item.pass ? 'text-emerald-700 font-medium' : 'text-red-500'
                      : 'text-on-surface-variant'
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Tips bảo mật */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 space-y-3">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <Lock size={14} />Lời khuyên bảo mật
              </p>
              {[
                'Không dùng tên, ngày sinh hoặc thông tin cá nhân dễ đoán.',
                'Không dùng lại mật khẩu từ tài khoản khác.',
                'Nên thay đổi mật khẩu định kỳ 3–6 tháng/lần.',
                'Không chia sẻ mật khẩu với bất kỳ ai.',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">•</span>
                  <p className="text-xs text-amber-700">{tip}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Cấu hình mặc định */}
      <section className="bg-white rounded-2xl border border-outline-variant/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold">Cấu hình mặc định khi tạo quiz</h2>
            <p className="text-sm text-on-surface-variant">Các giá trị này sẽ được dùng làm mặc định khi bạn tạo bài quiz mới.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Số câu hỏi mặc định</label>
            <select value={defaultQuestions} onChange={e => setDefaultQuestions(e.target.value)}
              className="mt-2 w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm">
              <option value="5">5 câu</option>
              <option value="10">10 câu</option>
              <option value="15">15 câu</option>
              <option value="20">20 câu</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Thời gian mặc định</label>
            <select value={defaultTime} onChange={e => setDefaultTime(e.target.value)}
              className="mt-2 w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm">
              <option value="15">15 phút</option>
              <option value="30">30 phút</option>
              <option value="45">45 phút</option>
              <option value="60">60 phút</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-on-surface-variant">Độ khó mặc định</label>
            <select value={defaultDifficulty} onChange={e => setDefaultDifficulty(e.target.value)}
              className="mt-2 w-full p-3 bg-surface-container border-none rounded-xl outline-none text-sm">
              <option value="mixed">Hỗn hợp</option>
              <option value="easy">Dễ</option>
              <option value="medium">Trung bình</option>
              <option value="hard">Khó</option>
            </select>
          </div>
        </div>
      </section>

      {/* Cài đặt AI */}
      <section className="bg-white rounded-2xl border border-outline-variant/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BrainCircuit size={20} />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold">Cài đặt AI</h2>
            <p className="text-sm text-on-surface-variant">Cấu hình cách AI sinh câu hỏi và hỗ trợ sau khi làm bài.</p>
          </div>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-surface-container rounded-xl cursor-pointer">
            <div>
              <p className="text-sm font-bold">Hiển thị giải thích AI sau khi nộp bài</p>
              <p className="text-xs text-on-surface-variant mt-1">Học sinh có thể xem giải thích chi tiết sau khi hoàn thành bài quiz.</p>
            </div>
            <input type="checkbox" checked={showAIExplanation} onChange={e => setShowAIExplanation(e.target.checked)} className="w-5 h-5" />
          </label>
          <label className="flex items-center justify-between p-4 bg-surface-container rounded-xl cursor-pointer">
            <div>
              <p className="text-sm font-bold">Chỉ sinh câu hỏi dựa trên tài liệu</p>
              <p className="text-xs text-on-surface-variant mt-1">AI sẽ ưu tiên bám sát nội dung file được upload, hạn chế kiến thức ngoài.</p>
            </div>
            <input type="checkbox" checked={strictDocumentMode} onChange={e => setStrictDocumentMode(e.target.checked)} className="w-5 h-5" />
          </label>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave}
          className="hero-gradient text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
          <Save size={18} />Lưu cài đặt
        </button>
        {saved && (
          <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={16} />Đã lưu!
          </span>
        )}
      </div>
    </div>
  );
}