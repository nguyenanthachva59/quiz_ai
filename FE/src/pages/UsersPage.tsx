import React from 'react';
import {
  Users, Search, Shield, UserCheck, UserX, Trash2,
  AlertCircle, ChevronDown, RefreshCw, Mail, Crown,
  GraduationCap, User,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/contexts/AuthContext';
import { API_BASE } from '@/src/lib/api';
import DashboardLayout from '@/src/components/DashboardLayout';

// ── Types ────────────────────────────────────────────────────
interface UserItem {
  uid: string;
  display_name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  is_active: boolean;
}

// ── Role config ──────────────────────────────────────────────
const ROLE_CONFIG = {
  admin: {
    label: 'Quản trị viên',
    icon: Crown,
    badge: 'bg-primary/10 text-primary border-primary/20',
  },
  teacher: {
    label: 'Giáo viên',
    icon: UserCheck,
    badge: 'bg-secondary/10 text-secondary border-secondary/20',
  },
  student: {
    label: 'Học sinh',
    icon: GraduationCap,
    badge: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
};

// ── Main component ───────────────────────────────────────────
export default function UsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  // Thao tác đang xử lý
  const [updatingUid, setUpdatingUid] = React.useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = React.useState<string | null>(null);
  const [deletingUid, setDeletingUid] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  // ── Fetch users ──────────────────────────────────────────
  const fetchUsers = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Lỗi ${res.status}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  React.useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Đổi role ─────────────────────────────────────────────
  const handleRoleChange = async (uid: string, newRole: string) => {
    setUpdatingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Cập nhật thất bại.');
      }
      setUsers(prev =>
        prev.map(u => u.uid === uid ? { ...u, role: newRole as UserItem['role'] } : u)
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingUid(null);
    }
  };

  // ── Xóa user (soft delete) ───────────────────────────────
  const handleDeleteUser = async (uid: string) => {
    setDeletingUid(uid);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${uid}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Xóa thất bại.');
      }
      // Soft delete → đánh dấu is_active = false thay vì xóa khỏi list
      setUsers(prev =>
        prev.map(u => u.uid === uid ? { ...u, is_active: false } : u)
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingUid(null);
      setConfirmDeleteUid(null);
    }
  };

  // ── Filter ───────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch =
      !search ||
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getAvatar = (name: string) =>
    (name || '?').trim().charAt(0).toUpperCase();

  // ── Render ───────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
              Quản lý người dùng
            </h1>
            <p className="text-on-surface-variant mt-1">
              Xem, phân quyền và quản lý tài khoản trong hệ thống.
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Tổng người dùng',
              value: users.length,
              icon: Users,
              color: 'bg-primary/10 text-primary',
            },
            {
              label: 'Đang hoạt động',
              value: users.filter(u => u.is_active !== false).length,
              icon: UserCheck,
              color: 'bg-emerald-50 text-emerald-600',
            },
            {
              label: 'Vô hiệu hóa',
              value: users.filter(u => u.is_active === false).length,
              icon: UserX,
              color: 'bg-red-50 text-red-500',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-outline-variant/10 p-5 flex items-center gap-4"
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', stat.color)}>
                <stat.icon size={22} />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium">{stat.label}</p>
                <p className="text-2xl font-headline font-extrabold">
                  {loading ? '...' : stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="relative">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2.5 bg-white border border-outline-variant/20 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="student">Học sinh</option>
              <option value="admin">Quản trị viên</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-outline-variant/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
              <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Đang tải...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
              <Users size={40} className="opacity-30" />
              <p className="text-sm">
                {search || roleFilter !== 'all'
                  ? 'Không tìm thấy người dùng nào phù hợp.'
                  : 'Chưa có người dùng nào trong hệ thống.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-surface-container">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Người dùng</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Vai trò</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase">Trạng thái</th>
                  <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map(user => {
                  const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.student;
                  const RoleIcon = roleCfg.icon;
                  const isActive = user.is_active !== false;

                  return (
                    <tr
                      key={user.uid}
                      className={cn(
                        'hover:bg-surface-container/30 transition-colors',
                        !isActive && 'opacity-50'
                      )}
                    >
                      {/* Avatar + Tên */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {getAvatar(user.display_name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface">
                              {user.display_name || '(Chưa đặt tên)'}
                            </p>
                            <p className="text-xs text-on-surface-variant">{user.uid.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                          <Mail size={13} className="shrink-0" />
                          {user.email}
                        </div>
                      </td>

                      {/* Role dropdown */}
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            disabled={updatingUid === user.uid || !isActive}
                            onChange={e => handleRoleChange(user.uid, e.target.value)}
                            className={cn(
                              'appearance-none pl-7 pr-7 py-1.5 text-xs font-bold rounded-lg border cursor-pointer outline-none transition-all',
                              roleCfg.badge,
                              'focus:ring-2 focus:ring-primary/20',
                              (updatingUid === user.uid || !isActive) && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <option value="student">Học sinh</option>
                            <option value="teacher">Giáo viên</option>
                            <option value="admin">Quản trị viên</option>
                          </select>
                          <RoleIcon size={12} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          {updatingUid === user.uid ? (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 border border-current border-t-transparent rounded-full animate-spin pointer-events-none" />
                          ) : (
                            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold',
                          isActive
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-500'
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            isActive ? 'bg-emerald-500' : 'bg-red-400'
                          )} />
                          {isActive ? 'Hoạt động' : 'Đã vô hiệu hóa'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setConfirmDeleteUid(user.uid)}
                          disabled={!isActive || deletingUid === user.uid}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={13} />
                          {isActive ? 'Vô hiệu hóa' : 'Đã xóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm delete modal */}
      {confirmDeleteUid && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setConfirmDeleteUid(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <UserX size={22} className="text-red-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-headline font-bold text-on-surface">Vô hiệu hóa tài khoản?</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Người dùng sẽ không thể đăng nhập. Bạn có thể khôi phục sau bằng cách chỉnh sửa trực tiếp trong Firestore.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteUid(null)}
                className="flex-1 py-3 border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container transition-all"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDeleteUser(confirmDeleteUid)}
                disabled={!!deletingUid}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deletingUid ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Xác nhận'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}