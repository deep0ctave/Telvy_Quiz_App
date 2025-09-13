import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getLinkClasses = ({ isActive }) =>
  `w-full text-left px-4 py-2 rounded-md transition ${
    isActive ? 'bg-primary text-white font-semibold' : 'hover:bg-base-200'
  }`;

function DrawerSidebar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const actualUser = user?.user || user;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="drawer-side z-40">
      <label htmlFor="drawer" className="drawer-overlay" />
      <aside className="min-h-screen w-80 bg-base-100 flex flex-col">
        <div className="sticky top-0 z-20 flex items-center gap-2 p-4 backdrop-blur">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span className="font-bold text-lg">Schoolmela</span>
        </div>

        <ul className="menu px-4 py-2 w-full flex-1 space-y-1">
          <li><NavLink to="/dashboard" className={getLinkClasses}>Dashboard</NavLink></li>

          {actualUser?.role === 'student' && (
            <>
              <li><NavLink to="/student/quizzes" className={getLinkClasses}>Quizzes</NavLink></li>
              <li><NavLink to="/student/stats" className={getLinkClasses}>My Stats</NavLink></li>
              <li><NavLink to="/student/leaderboard" className={getLinkClasses}>Leaderboard</NavLink></li>
            </>
          )}

          {actualUser?.role === 'teacher' && (
            <>
              <li><NavLink to="/admin/dashboard" className={getLinkClasses}>Live Dashboard</NavLink></li>
              <li><NavLink to="/admin/quizzes" className={getLinkClasses}>Manage Quizzes</NavLink></li>
              <li><NavLink to="/admin/questions" className={getLinkClasses}>Question Pool</NavLink></li>
            </>
          )}

          {actualUser?.role === 'admin' && (
            <>
              <li><NavLink to="/admin/dashboard" className={getLinkClasses}>Live Dashboard</NavLink></li>
              <li><NavLink to="/admin/users" className={getLinkClasses}>Manage Users</NavLink></li>
              <li><NavLink to="/admin/quizzes" className={getLinkClasses}>Manage Quizzes</NavLink></li>
              <li><NavLink to="/admin/questions" className={getLinkClasses}>Question Pool</NavLink></li>
            </>
          )}

          <li><NavLink to="/settings" className={getLinkClasses}>Settings</NavLink></li>
        </ul>

        <div className="p-4 mt-auto">
          <button onClick={handleLogout} className="btn btn-error btn-outline w-full">
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}

export default DrawerSidebar;
