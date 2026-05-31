import { useAuth } from "../context/AuthContext";

export function useRole() {
  const { userProfile } = useAuth();
  const role = userProfile?.role || null;

  return {
    role,
    isPrincipal: role === "Principal",
    isTeacher: role === "Teacher",
    isBursar: role === "Bursar",
    can: (allowedRoles) => allowedRoles.includes(role),
  };
}