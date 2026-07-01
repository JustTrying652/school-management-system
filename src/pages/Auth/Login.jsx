import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e) {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    const userCredential = await login(email, password);
    const adminDoc = await getDoc(doc(db, "admins", userCredential.user.uid));
    const role = adminDoc.data()?.role;
    if (role === "Librarian") {
      navigate("/library");
    } else {
      navigate("/");
    }
  } catch (err) {
    setError("Invalid email or password. Please try again.");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-800">School Management</h1>
          <p className="text-gray-500 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@school.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="text-center mt-6">
          <a
            href="/parent"
            className="text-sm text-blue-600 hover:text-blue-700 transition"
          >
            Parent portal →
          </a>
        </div>
      </div>
    </div>
  );
}