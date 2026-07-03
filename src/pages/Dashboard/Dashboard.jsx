import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Users, GraduationCap, BookOpen, Banknote, ClipboardList, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatsSkeleton from "../../components/StatsSkeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useRole } from "../../hooks/useRole";

const GRADE_COLORS = ["#38bdf8", "#818cf8", "#f472b6"];
const FEE_COLORS = ["#22c55e", "#facc15", "#f87171"];

export default function Dashboard() {
  const { role } = useRole();
  const [stats, setStats] = useState({
    students: 0, teachers: 0, classes: 0,
    payments: 0, attendance: 0, results: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [gradeChartData, setGradeChartData] = useState([]);
  const [feeChartData, setFeeChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStats() {
  try {
    const [stuSnap, teachSnap, classSnap, paySnap, attSnap, resSnap] = await Promise.all([
      getDocs(collection(db, "students")),
      getDocs(collection(db, "teachers")),
      getDocs(collection(db, "classes")),
      getDocs(collection(db, "feePayments")),
      getDocs(collection(db, "attendance")),
      getDocs(collection(db, "results")),
    ]);

    setStats({
      students: stuSnap.size,
      teachers: teachSnap.size,
      classes: classSnap.size,
      payments: paySnap.size,
      attendance: attSnap.size,
      results: resSnap.size,
    });

    const payments = paySnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
      .slice(0, 5);
    setRecentPayments(payments);

    // Grade chart data
    const students = stuSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const gradeCounts = { "Grade 10": 0, "Grade 11": 0, "Grade 12": 0 };
    students.forEach((s) => {
      if (gradeCounts[s.grade] !== undefined) gradeCounts[s.grade]++;
    });
    setGradeChartData(
      Object.entries(gradeCounts).map(([grade, count]) => ({ grade, count }))
    );

    // Fee status chart
    const structSnap = await getDocs(collection(db, "feeStructures"));
    const structures = structSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const currentYear = new Date().getFullYear().toString();

    function getExpected(grade) {
      const s = structures.find((s) => s.grade === grade && s.year === currentYear);
      return s ? Number(s.amount) : 0;
    }

    function getTotalPaid(studentId) {
      return paySnap.docs
        .filter((d) => d.data().studentId === studentId)
        .reduce((sum, d) => sum + Number(d.data().amount), 0);
    }

    let cleared = 0, partial = 0, unpaid = 0;
    students.forEach((student) => {
      const expected = getExpected(student.grade);
      if (!expected) return;
      const paid = getTotalPaid(student.id);
      if (paid >= expected) cleared++;
      else if (paid > 0) partial++;
      else unpaid++;
    });

    setFeeChartData([
      { name: "Cleared", value: cleared },
      { name: "Partial", value: partial },
      { name: "Unpaid", value: unpaid },
    ]);

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}
    fetchStats();
  }, []);

  const ALL_STAT_CARDS = [
    { label: "Total Students", key: "students", icon: Users, color: "bg-blue-500", to: "/students", roles: ["Principal", "Teacher"] },
    { label: "Total Teachers", key: "teachers", icon: GraduationCap, color: "bg-green-500", to: "/teachers", roles: ["Principal"] },
    { label: "Total Classes", key: "classes", icon: BookOpen, color: "bg-purple-500", to: "/classes", roles: ["Principal", "Teacher"] },
    { label: "Fee Payments", key: "payments", icon: Banknote, color: "bg-yellow-500", to: "/fees", roles: ["Principal", "Bursar"] },
    { label: "Attendance Records", key: "attendance", icon: ClipboardList, color: "bg-pink-500", to: "/attendance", roles: ["Principal", "Teacher"] },
    { label: "Result Records", key: "results", icon: FileText, color: "bg-indigo-500", to: "/results", roles: ["Principal", "Teacher"] },
  ];

  const ALL_QUICK_ACTIONS = [
    { label: "Add Student", to: "/students", roles: ["Principal", "Teacher"] },
    { label: "Add Teacher", to: "/teachers", roles: ["Principal"] },
    { label: "Record Payment", to: "/fees", roles: ["Principal", "Bursar"] },
    { label: "Take Attendance", to: "/attendance", roles: ["Principal", "Teacher"] },
  ];

  const statCards = ALL_STAT_CARDS.filter((c) => c.roles.includes(role));
  const quickActions = ALL_QUICK_ACTIONS.filter((a) => a.roles.includes(role));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here's an overview of the school.</p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <StatsSkeleton count={6} />
      ) : (
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
                <p className="text-2xl font-bold text-gray-800">{stats[key]}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Students per grade */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Students per Grade</h2>
            {gradeChartData.every((d) => d.count === 0) ? (
              <p className="text-sm text-gray-400">No student data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={gradeChartData} barSize={40}>
                  <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {gradeChartData.map((_, i) => (
                      <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Fee payment status */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-700 mb-4">Fee Payment Status</h2>
            {feeChartData.every((d) => d.value === 0) ? (
              <p className="text-sm text-gray-400">No fee structure set yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={feeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {feeChartData.map((_, i) => (
                      <Cell key={i} fill={FEE_COLORS[i % FEE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Quick </h2>
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
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-24" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                </div>
              ))}
            </div>
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