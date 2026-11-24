
function Sidebar({ activePage, setActivePage }) {
  const pages = [
    { name: "Profile", label: "Profile", icon: "👤" },
    { name: "Matches", label: "Discover Matches", icon: "💙" },
  ];

  return (
    <aside className="sidebar">
      <h2 className="logo">
        NGL<span>.</span>
      </h2>

      <p className="sidebar-label">MENU</p>

      <nav>
        {pages.map((page) => (
          <button
            key={page.name}
            className={
              activePage === page.name
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => setActivePage(page.name)}
          >
            <span>{page.icon}</span>
            {page.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        Intelligent matching, made personal.
      </div>
    </aside>
  );
}

export default Sidebar;
