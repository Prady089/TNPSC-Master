import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { isStaff, isSuper, profileComplete, useAuth } from './lib/auth';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';

const Library = lazy(() => import('./pages/Library'));
const UnitPage = lazy(() => import('./pages/UnitPage'));
const BookPage = lazy(() => import('./pages/BookPage'));
const Reader = lazy(() => import('./pages/Reader'));
const QuizHub = lazy(() => import('./pages/QuizHub'));
const QuizPlay = lazy(() => import('./pages/QuizPlay'));
const QuizPrint = lazy(() => import('./pages/QuizPrint'));
const Progress = lazy(() => import('./pages/Progress'));
const News = lazy(() => import('./pages/News'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Review = lazy(() => import('./pages/Review'));
const Admin = lazy(() => import('./pages/Admin'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Chat = lazy(() => import('./pages/Chat'));
const ChatRoom = lazy(() => import('./pages/ChatRoom'));

function Guard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!profileComplete(profile) && loc.pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return isStaff(profile) ? <>{children}</> : <Navigate to="/" replace />;
}

function SuperOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  return isSuper(profile) ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/onboarding" element={<Guard><Onboarding /></Guard>} />
        <Route path="/quiz/play" element={<Guard><QuizPlay /></Guard>} />
        <Route path="/quiz/print" element={<Guard><QuizPrint /></Guard>} />
        <Route path="/read/:chapterId" element={<Guard><Reader /></Guard>} />
        <Route path="/chat/:roomId" element={<Guard><ChatRoom /></Guard>} />
        <Route element={<Guard><Layout /></Guard>}>
          <Route index element={<Home />} />
          <Route path="library" element={<Library />} />
          <Route path="learn" element={<Navigate to="/library" replace />} />
          <Route path="learn/unit/:code" element={<UnitPage />} />
          <Route path="learn/book/:bookId" element={<BookPage />} />
          <Route path="quiz" element={<QuizHub />} />
          <Route path="progress" element={<Progress />} />
          <Route path="news" element={<News />} />
          <Route path="chat" element={<Chat />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin/review" element={<AdminOnly><Review /></AdminOnly>} />
          <Route path="admin" element={<SuperOnly><Admin /></SuperOnly>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
