import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  Banknote, ClipboardList, FileText, CalendarDays, LogOut, Menu, X,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/students", icon: Users, label: "Students" },
  { to: "/teachers", icon: GraduationCap, label: "Teachers" },
  { to: "/classes", icon: BookOpen, label: "Classes" },
  { to: "/fees", icon: Banknote, label: "Fees" },
  { to: "/attendance", icon: ClipboardList, label: "Attendance" },
  { to: "/results", icon: FileText, label: "Results" },
  { to: "/timetable", icon: CalendarDays, label: "Timetable" },
];

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get current page label for topbar
  const currentPage = navItems.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

  // Set browser tab title
  document.title = currentPage
    ? `${currentPage.label} — School Admin`
    : "School Admin";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-16"} bg-blue-900 text-white flex flex-col transition-all duration-300`}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-blue-800">
          <div className="bg-white text-blue-900 rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0">
            S
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm leading-tight">School Admin</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-700 text-white font-medium"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-blue-800 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-blue-200 hover:text-white text-sm w-full transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {currentPage && (
              <div className="flex items-center gap-2 text-gray-700">
                <currentPage.icon size={18} className="text-blue-600" />
                <span className="font-semibold text-sm">{currentPage.label}</span>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Logged in as <span className="font-medium text-gray-800">{currentUser?.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  );
}