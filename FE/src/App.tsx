import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@/src/contexts/AuthContext";
import ProtectedRoute from "@/src/components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import QuestionBank from "./pages/QuestionBank";
import QuizManagement from "./pages/QuizManagement";
import QuizTaking from "./pages/QuizTaking";
import QuizResult from "./pages/QuizResult";
import History from "./pages/History";
import Settings from "./pages/Setting";
import UsersPage from "./pages/UsersPage";
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      user.getIdToken().then((userToken) => {
        setToken(userToken);
      }).catch((error) => {
        console.error("Error getting token:", error);
      });
    } else {
      console.error("User is not authenticated");
    }
  }, []); // Chạy lại khi ứng dụng khởi tạo hoặc khi user thay đổi

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/quiz/taking"
            element={
              <ProtectedRoute>
                <QuizTaking />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/questions"
            element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <QuestionBank />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <QuizManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <History />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz/result"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <QuizResult />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;