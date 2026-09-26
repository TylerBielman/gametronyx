import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
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
          path="/me"
          element={
            <RequireAuth>
              <Me />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
