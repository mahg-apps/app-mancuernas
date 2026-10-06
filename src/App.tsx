import type { ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BodyPage } from './features/body/BodyPage';
import { ExerciseDetail } from './features/exercises/ExerciseDetail';
import { ExerciseList } from './features/exercises/ExerciseList';
import { Onboarding } from './features/onboarding/Onboarding';
import { Settings } from './features/settings/Settings';
import { ProfileProvider, useProfile } from './state/ProfileContext';

/** Lleva al asistente inicial si todavía no hay perfil. */
function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, loading } = useProfile();
  if (loading) return null;
  if (!profile) return <Navigate to="/bienvenida" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ProfileProvider>
      {/* HashRouter: las rutas no fallan al recargar en GitHub Pages. */}
      <HashRouter>
        <Routes>
          <Route path="/bienvenida" element={<Onboarding />} />
          <Route
            element={
              <RequireProfile>
                <Layout />
              </RequireProfile>
            }
          >
            <Route index element={<BodyPage />} />
            <Route path="ejercicios" element={<ExerciseList />} />
            <Route path="ejercicio/:id" element={<ExerciseDetail />} />
            <Route path="ajustes" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProfileProvider>
  );
}
