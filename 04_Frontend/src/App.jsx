
import { useState } from "react";

import Sidebar from "./components/Sidebar";

import Profile from "./pages/Profile";
import Matches from "./pages/Matches";

function App() {
  // Open Discover Matches by default.
  const [activePage, setActivePage] = useState("Matches");

  const renderPage = () => {
    switch (activePage) {
      case "Profile":
        return <Profile />;

      case "Matches":
        return <Matches />;

      default:
        return <Matches />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
