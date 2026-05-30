import { useEffect, useState } from "react";
import { collection, getCountFromServer, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Users, GraduationCap, BookOpen, Banknote, ClipboardList, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0, teachers: 0, classes: 0,
    payments: 0, attendance: 0, results: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStats() {
      try {
        const [s, t, c, p, a, r, paySnap] = await Promise.all([
          getCountFromServer(collection(db, "students")),
          getCountFromServer(collection(db, "teachers")),
          getCountFromServer(collection(db, "classes")),
          getCountFromServer(collection(db, "feePayments")),
          getCountFromServer(collection(db, "attendance")),
          getCountFromServer(collection(db, "results")),
          getDocs(collection(db, "feePayments")),
        ]);
        setStats({
          students: s.data().count,
          teachers: t.data().count,
          classes: c.data().count,
          payments: p.data().count,
          attendance: a.data().count,
          results: r.data().count,
        });
        const payments = paySnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
          .slice(0, 5);
        setRecentPayments(payments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Students", key: "students", icon: Users, color: "bg-blue-500", to: "/students" },
    { label: "Total Teachers", key: "teachers", icon: GraduationCap, color: "bg-green-500", to: "/teachers" },
    { label: "Total Classes", key: "classes", icon: BookOpen, color: "bg-purple-500", to: "/classes" },
    { label: "Fee Payments", key: "payments", icon: Banknote, color: "bg-yellow-500", to: "/fees" },
    { label: "Attendance Records", key: "attendance", icon: ClipboardList, color: "bg-pink-500", to: "/attendance" },
    { label: "Result Records", key: "results", icon: FileText, color: "bg-indigo-500", to: "/results" },
  ];

  const quickActions = [
    { label: "Add Student", to: "/students" },
    { label: "Add Teacher", to: "/teachers" },
    { label: "Record Payment", to: "/fees" },
    { label: "Take Attendance", to: "/attendance" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here's an overview of the school.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map(({ label, key, icon: Icon, color, to }) => (
          <button
            key={key}
            onClick={() => navigate(to)}
            className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition text-left w-full"
          >
            <div className={`${color} text-white rounded-xl p-3`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">
                {loading ? "..." : stats[key]}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, to }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition text-center"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Recent Payments</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : recentPayments.length === 0 ? (
            <p className="text-sm text-gray-400">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{p.studentName}</p>
                    <p className="text-xs text-gray-400">{p.method} · {p.date}</p>
                  </div>
                  <span className="text-green-600 font-semibold">
                    KES {Number(p.amount).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}