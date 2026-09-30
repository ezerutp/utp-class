import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, isExpired } from './lib/auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CourseDetail } from './pages/CourseDetail';
import { ComingSoon } from './pages/ComingSoon';
import { Calendar } from './pages/Calendar';
import { Activities } from './pages/Activities';
import { Layout } from './components/Layout';
import type { ReactElement } from 'react';

function RequireAuth({ children }: { children: ReactElement }) {
  const { session } = useAuth();
  // Si el token esta vencido pero hay refresh token, dejamos pasar: el interceptor lo renueva.
  if (!session || (isExpired(session.accessToken) && !session.refreshToken)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/courses/:courseId/sections/:sectionId" element={<CourseDetail />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/actividades" element={<Activities />} />
        <Route
          path="/calificaciones"
          element={<ComingSoon title="Calificaciones" description="Consolidado de notas de todos tus cursos del periodo." />}
        />
        <Route
          path="/mensajes"
          element={<ComingSoon title="Mensajes" description="Conversaciones con tus docentes y compañeros." />}
        />
        <Route
          path="/recursos"
          element={<ComingSoon title="Recursos" description="Materiales y archivos de tus cursos." />}
        />
        <Route
          path="/configuracion"
          element={<ComingSoon title="Configuración" description="Preferencias de tu cuenta y de la aplicación." />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
