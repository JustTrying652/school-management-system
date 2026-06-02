import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  Banknote, ClipboardList, FileText, CalendarDays,
  LogOut, Menu, X, ShieldCheck, BarChart2, TrendingUp
} from "lucide-react";

const ALL_NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["Principal", "Teacher", "Bursar"] },
  { to: "/students", icon: Users, label: "Students", roles: ["Principal", "Teacher"] },
  { to: "/teachers", icon: GraduationCap, label: "Teachers", roles: ["Principal"] },
  { to: "/classes", icon: BookOpen, label: "Classes", roles: ["Principal", "Teacher"] },
  { to: "/fees", icon: Banknote, label: "Fees", roles: ["Principal", "Bursar"] },
  { to: "/attendance", icon: ClipboardList, label: "Attendance", roles: ["Principal", "Teacher"] },
  { to: "/results", icon: FileText, label: "Results", roles: ["Principal", "Teacher"] },
  { to: "/timetable", icon: CalendarDays, label: "Timetable", roles: ["Principal", "Teacher"] },
  { to: "/users", icon: ShieldCheck, label: "User Management", roles: ["Principal"] },
  { to: "/reports", icon: BarChart2, label: "Reports", roles: ["Principal", "Teacher", "Bursar"] },
  { to: "/promotion", icon: TrendingUp, label: "Promotion", roles: ["Principal"] },
];

const ROLE_COLORS = {
  Principal: "bg-purple-100 text-purple-700",
  Teacher: "bg-blue-100 text-blue-700",
  Bursar: "bg-yellow-100 text-yellow-700",
};

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, currentUser, userProfile } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  );

  const currentPage = navItems.find((item) =>
    item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)
  );

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

        {/* User info + Logout */}
        <div className="border-t border-blue-800 p-4 space-y-3">
          {sidebarOpen && userProfile && (
            <div>
              <p className="text-xs text-blue-200 font-medium truncate">
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[role] || "bg-gray-100 text-gray-600"}`}>
                {role}
              </span>
            </div>
          )}
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