import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useRole } from "./hooks/useRole";
import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Students from "./pages/Students/Students";
import Teachers from "./pages/Teachers/Teachers";
import Classes from "./pages/Classes/Classes";
import Fees from "./pages/Fees/Fees";
import Attendance from "./pages/Attendance/Attendance";
import Results from "./pages/Results/Results";
import Timetable from "./pages/Timetable/Timetable";
import UserManagement from "./pages/UserManagement/UserManagement";
import MainLayout from "./layouts/MainLayout";
import ParentPortal from "./pages/ParentPortal/ParentPortal";
import ParentDashboard from "./pages/ParentPortal/ParentDashboard";
import Reports from "./pages/Reports/Reports";
import Promotion from "./pages/Promotion/Promotion";
import Disciplinary from "./pages/Disciplinary/Disciplinary";
import Library from "./pages/Library/Library";

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  const { role } = useRole();
  if (!currentUser) return <Navigate to="/login" />;
  if (role === "Librarian") return <Navigate to="/library" />;
  return <MainLayout>{children}</MainLayout>;
}

function RoleRoute({ children, roles }) {
  const { role } = useRole();
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  if (!roles.includes(role)) return <Navigate to="/" />;
  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <Routes>
      <Route path="/parent" element={<ParentPortal />} />
      <Route path="/parent/dashboard" element={<ParentDashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/library" element={
        <RoleRoute roles={["Principal", "Librarian", "Teacher"]}><Library /></RoleRoute>
      } />
      <Route path="/disciplinary" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Disciplinary /></RoleRoute>
      } />
      <Route path="/promotion" element={
        <RoleRoute roles={["Principal"]}><Promotion /></RoleRoute>
      } />
      <Route path="/reports" element={
        <RoleRoute roles={["Principal", "Teacher", "Bursar"]}><Reports /></RoleRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/students" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Students /></RoleRoute>
      } />
      <Route path="/teachers" element={
        <RoleRoute roles={["Principal"]}><Teachers /></RoleRoute>
      } />
      <Route path="/classes" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Classes /></RoleRoute>
      } />
      <Route path="/fees" element={
        <RoleRoute roles={["Principal", "Bursar"]}><Fees /></RoleRoute>
      } />
      <Route path="/attendance" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Attendance /></RoleRoute>
      } />
      <Route path="/results" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Results /></RoleRoute>
      } />
      <Route path="/timetable" element={
        <RoleRoute roles={["Principal", "Teacher"]}><Timetable /></RoleRoute>
      } />
      <Route path="/users" element={
        <RoleRoute roles={["Principal"]}><UserManagement /></RoleRoute>
      } />
    </Routes>
  );
}

export default App;