import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Planner from "./pages/Planner";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-neutral-950 text-white">
        <nav className="border-b border-neutral-800 p-4 flex gap-4">
          <Link to="/">Dashboard</Link>
          <Link to="/planner">Planner</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/login">Login</Link>
        </nav>

        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/planner" element={<Planner />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;