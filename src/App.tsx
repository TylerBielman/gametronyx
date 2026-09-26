import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAdmin from './components/RequireAdmin';
import AdminActivity from './pages/admin/Activity';
import AdminCodes from './pages/admin/Codes';
import AdminGames from './pages/admin/Games';
import AdminLayout from './pages/admin/AdminLayout';
import AdminPlayers from './pages/admin/Players';
import AdminRequests from './pages/admin/Requests';
import AdminSettings from './pages/admin/Settings';
import AdminSlots from './pages/admin/Slots';
import RequireAuth from './components/RequireAuth';
import AddEmail from './pages/AddEmail';
import Join from './pages/Join';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Me from './pages/Me';
import NotFound from './pages/NotFound';
import Play from './pages/Play';
import Privacy from './pages/Privacy';
import RequestInvite from './pages/RequestInvite';
import { GameSchedule, ScheduleMenu } from './pages/Schedule';
import Reset from './pages/Reset';
import Showcase from './pages/Showcase';
import VerifyEmail from './pages/VerifyEmail';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Showcase />} />
        <Route path="/request-invite" element={<RequestInvite />} />
        <Route path="/join" element={<Join />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route
          path="/add-email"
          element={
            <RequireAuth allowMissingEmail>
              <AddEmail />
            </RequireAuth>
          }
        />
        <Route
          path="/play"
          element={
            <RequireAuth>
              <Play />
            </RequireAuth>
          }
        />
        <Route
          path="/schedule"
          element={
            <RequireAuth>
              <ScheduleMenu />
            </RequireAuth>
          }
        />
        <Route
          path="/schedule/:slug"
          element={
            <RequireAuth>
              <GameSchedule />
            </RequireAuth>
          }
        />
        <Route
          path="/me"
          element={
            <RequireAuth>
              <Me />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/admin/activity" replace />} />
          <Route path="activity" element={<AdminActivity />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="codes" element={<AdminCodes />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="games" element={<AdminGames />} />
          <Route path="slots" element={<AdminSlots />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
