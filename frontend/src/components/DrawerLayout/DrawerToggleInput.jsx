const DrawerToggleInput = ({ isOpen, toggle }) => {
  return (
    <input
      id="drawer-toggle"
      type="checkbox"
      className="drawer-toggle"
      checked={isOpen}
      onChange={toggle}
    />
  );
};

export default DrawerToggleInput;
