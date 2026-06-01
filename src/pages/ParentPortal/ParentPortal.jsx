import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function ParentPortal() {
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "students"));
      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Normalize phone for comparison
      function normalizePhone(p) {
        if (!p) return "";
        const cleaned = p.replace(/\s+/g, "").replace(/[^0-9]/g, "");
        if (cleaned.startsWith("254")) return "0" + cleaned.slice(3);
        if (cleaned.startsWith("0")) return cleaned;
        if (cleaned.startsWith("7") || cleaned.startsWith("1")) return "0" + cleaned;
        return cleaned;
      }

      const match = students.find(
        (s) =>
          s.admissionNumber?.trim().toLowerCase() === admissionNumber.trim().toLowerCase() &&
          normalizePhone(s.parentPhone) === normalizePhone(phone)
      );

      if (!match) {
        setError("No student found with that admission number and phone number. Please check and try again.");
        return;
      }

      // Store student in sessionStorage so ParentDashboard can access it
      sessionStorage.setItem("parentStudent", JSON.stringify(match));
      navigate("/parent/dashboard");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-green-500 text-white rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            P
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Parent Portal</h1>
          <p className="text-gray-500 text-sm mt-1">View your child's results and fee balance</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admission Number
            </label>
            <input
              type="text"
              required
              placeholder="e.g. ADM001"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Phone Number
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Checking..." : "View My Child's Records"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Enter the admission number and the phone number registered at the school.
        </p>

        <div className="text-center mt-4">
          <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition">
            Admin login →
          </a>
        </div>
      </div>
    </div>
  );
}