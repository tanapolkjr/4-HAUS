import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { ToastProvider } from '@/hooks/useToast';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { FactoryPage } from '@/features/factories/FactoryPage';
import { ProductWorkspace } from '@/features/product/ProductWorkspace';
import { ComparePage } from '@/features/compare/ComparePage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null; // pre-paint theme script prevents flash; nothing to show yet
  if (!session) return <LoginPage />;
  return <AppShell />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Gate />}>
                <Route index element={<DashboardPage />} />
                <Route path="factories" element={<FactoryPage />} />
                <Route path="products/:id" element={<ProductWorkspace />} />
                <Route path="compare" element={<ComparePage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
