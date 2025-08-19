import useTheme from '../../hooks/useTheme';

function DrawerNavbar({ showSidebar }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-10 bg-base-100/90 text-base-content backdrop-blur shadow-sm">
      <nav className="navbar w-full py-4 px-4">
        <div className="flex flex-1 items-center gap-2">
          {showSidebar && (
            <label htmlFor="drawer" className="btn btn-ghost lg:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </label>
          )}
          <span className="font-bold text-lg lg:hidden">Telvy</span>
        </div>

        <div className="flex gap-2 items-center">
          {/* ✅ Theme Switch */} 
            <label class="toggle text-base-content">
            <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} className="hidden"/>
            <svg aria-label="sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></g></svg>
            <svg aria-label="moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g stroke-linejoin="round" stroke-linecap="round" stroke-width="2" fill="none" stroke="currentColor"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></g></svg>
            </label>

          {/* Language Switch */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-sm btn-ghost">🌐 Lang</label>
            <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-200 rounded-box w-40">
              <li><a>English</a></li>
              <li><a>Hindi</a></li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default DrawerNavbar;
