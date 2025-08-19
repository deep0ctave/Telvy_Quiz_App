import DrawerNavbar from './DrawerNavbar';
import DrawerSidebar from './DrawerSidebar';


function DrawerLayout({ showSidebar, children }) {
  return (
    <div className={`drawer bg-base-100 mx-auto max-w-[100rem] ${showSidebar ? 'lg:drawer-open' : ''}`}>
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      {/* Page Content */}
      <div className="drawer-content flex flex-col">
        <DrawerNavbar showSidebar={showSidebar} />
        <main className="flex-grow p-4">{children}</main>
      </div>

      {/* Sidebar */}
      {showSidebar && <DrawerSidebar />}
    </div>
  );
}

export default DrawerLayout;
