import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import DrawerLayout from '../components/DrawerLayout/DrawerLayout';

// Public
import Landing from '../components/pages/Landing';
import About from '../components/pages/About';
import ContactUs from '../components/pages/ContactUs';
import Login from '../components/pages/Login';
import Register from '../components/pages/Register';
import ForgotPassword from '../components/pages/ForgotPassword';

// Common Private
import Dashboard from '../components/pages/Dashboard';
import Settings from '../components/pages/Settings';
import NotFound from '../components/pages/NotFound';

// Student
import Quizzes from '../components/pages/Student/quizzes';
import QuizStart from '../components/pages/Attempts/QuizStart';
import LiveAttempt from '../components/pages/Attempts/LiveAttempt';
import AttemptResult from '../components/pages/Attempts/AttemptResult';
import AttemptHistory from '../components/pages/Attempts/AttemptHistory';
import Stats from '../components/pages/Student/Stats';
import Leaderboard from '../components/pages/student/Leaderboard';

// Teacher
//import QuizList from '../components/pages/Teacher/QuizList';

// Admin
import UserList from '../components/pages/Admin/UserList';
import QuestionList from '../components/pages/Admin/QuestionList';
import QuizList from '../components/pages/Admin/QuizList';

import PrivateRoute from './PrivateRoute';

const LayoutWrapper = () => {
  const location = useLocation();
  const hideSidebarPaths = ['/', '/login', '/register', '/about', '/contact-us', '/forgot-password'];
  const showSidebar = !hideSidebarPaths.includes(location.pathname);

  return (
    <DrawerLayout showSidebar={showSidebar}>
      <Outlet />
    </DrawerLayout>
  );
};

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<LayoutWrapper />}>
        {/* 🔓 Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />


        {/* 🔐 Common Authenticated Routes */}
        <Route
          path="/dashboard"
          element={<PrivateRoute><Dashboard /></PrivateRoute>}
        />
        <Route
          path="/settings"
          element={<PrivateRoute><Settings /></PrivateRoute>}
        />

        {/* 🧑‍🎓 Student Routes */}
        <Route
          path="/student/quizzes"
          element={<PrivateRoute><Quizzes /></PrivateRoute>}
        />
        <Route
          path="/student/stats"
          element={<PrivateRoute><Stats /></PrivateRoute>}
        />
        <Route
          path="/student/leaderboard"
          element={<PrivateRoute><Leaderboard /></PrivateRoute>}
        />
        <Route
  path="/attempts/start/:quizId"
  element={<PrivateRoute><QuizStart /></PrivateRoute>}
/>

        <Route
          path="/attempts/live/:attemptId"
          element={<PrivateRoute><LiveAttempt /></PrivateRoute>}
        />
        <Route
          path="/attempts/result/:attemptId"
          element={<PrivateRoute><AttemptResult /></PrivateRoute>}
        />
        <Route
          path="/attempts/history"
          element={<PrivateRoute><AttemptHistory /></PrivateRoute>}
        />

        {/* 👩‍🏫 Teacher Routes */}
        <Route
          path="/teacher/quizzes"
          element={<PrivateRoute><QuizList /></PrivateRoute>}
        />

        {/* 👨‍💼 Admin Routes */}
        <Route
          path="/admin/users"
          element={<PrivateRoute allowedRoles={['admin']}><UserList /></PrivateRoute>}
        />
        <Route
          path="/admin/questions"
          element={<PrivateRoute allowedRoles={['admin']}><QuestionList /></PrivateRoute>}
        />
        <Route
          path="/admin/quizzes"
          element={<PrivateRoute allowedRoles={['admin']}><QuizList /></PrivateRoute>}
        />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
