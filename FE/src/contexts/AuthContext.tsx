import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { API_BASE } from '@/src/lib/api';

type Role = 'student' | 'admin';

interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: Role;
  is_active: boolean;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return data.detail || data.message || fallback;
  } catch {
    return fallback;
  }
}

function normalizeRole(role: string | undefined): Role {
  return role === 'admin' ? 'admin' : 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (idToken: string) => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const message = await getErrorMessage(res, 'Không thể lấy thông tin tài khoản.');
      throw new Error(`${message} Mã lỗi: ${res.status}`);
    }

    const data = await res.json();
    const normalizedProfile: UserProfile = {
      ...data,
      role: normalizeRole(data.role),
    };

    setProfile(normalizedProfile);
    return normalizedProfile;
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setUser(null);
      setProfile(null);
      setToken(null);
      return;
    }

    const idToken = await auth.currentUser.getIdToken(true);
    setToken(idToken);
    await fetchProfile(idToken);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);

      try {
        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          setToken(null);
          return;
        }

        setUser(firebaseUser);
        const idToken = await firebaseUser.getIdToken(true);
        setToken(idToken);
        await fetchProfile(idToken);
      } catch (error) {
        console.error('AuthContext error:', error);
        setProfile(null);
        setToken(null);

        try {
          await signOut(auth);
        } catch {
          // ignore
        }

        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setUser(credential.user);

      const idToken = await credential.user.getIdToken(true);
      setToken(idToken);
      await fetchProfile(idToken);
    } catch (error: any) {
      console.error('Login error:', error);

      if (error?.code === 'auth/invalid-credential') {
        throw new Error('Email hoặc mật khẩu không đúng.');
      }
      if (error?.code === 'auth/user-not-found') {
        throw new Error('Tài khoản không tồn tại.');
      }
      if (error?.code === 'auth/wrong-password') {
        throw new Error('Mật khẩu không đúng.');
      }
      if (error?.code === 'auth/invalid-email') {
        throw new Error('Email không hợp lệ.');
      }

      throw new Error(error?.message || 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
          role: 'student',
        }),
      });

      if (!res.ok) {
        const message = await getErrorMessage(res, 'Đăng ký thất bại.');
        throw new Error(message);
      }

      await login(email, password);
    } catch (error: any) {
      console.error('Register error:', error);
      throw new Error(error?.message || 'Đăng ký thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setProfile(null);
      setToken(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider.');
  }

  return context;
}
