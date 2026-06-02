import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { LogOut, GraduationCap, Banknote, ClipboardList } from "lucide-react";

const EXAMS = ["Mid Term 1", "End Term 1", "Mid Term 2", "End Term 2", "Mid Term 3", "End Term 3"];

function getGrade(score) {
  if (score >= 80) return { grade: "A", color: "text-green-600" };
  if (score >= 75) return { grade: "A-", color: "text-green-600" };
  if (score >= 70) return { grade: "B+", color: "text-blue-600" };
  if (score >= 65) return { grade: "B", color: "text-blue-600" };
  if (score >= 60) return { grade: "B-", color: "text-blue-600" };
  if (score >= 55) return { grade: "C+", color: "text-yellow-600" };
  if (score >= 50) return { grade: "C", color: "text-yellow-600" };
  if (score >= 45) return { grade: "C-", color: "text-yellow-600" };
  if (score >= 40) return { grade: "D+", color: "text-orange-600" };
  if (score >= 35) return { grade: "D", color: "text-orange-600" };
  if (score >= 30) return { grade: "D-", color: "text-orange-600" };
  return { grade: "E", color: "text-red-600" };
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("results");
  const [filterExam, setFilterExam] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("parentStudent");
    if (!stored) {
      navigate("/parent");
      return;
    }
    setStudent(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!student) return;
    fetchData();
  }, [student]);

  async function fetchData() {
    setLoading(true);
    try {
      const [resSnap, paySnap, structSnap, attSnap] = await Promise.all([
        getDocs(collection(db, "results")),
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "feeStructures")),
        getDocs(collection(db, "attendance")),
      ]);

      setResults(
        resSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r.studentId === student.id)
      );
      setPayments(
        paySnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.studentId === student.id)
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
      );
      setStructures(structSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAttendance(
        attSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.studentId === student.id)
          .sort((a, b) => b.date.localeCompare(a.date))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("parentStudent");
    navigate("/parent");
  }

  // Fee calculations
  const currentYear = new Date().getFullYear().toString();
  const feeStructure = structures.find(
    (s) => s.grade === student?.grade && s.year === currentYear
  );
  const expectedFee = feeStructure ? Number(feeStructure.amount) : 0;
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = expectedFee - totalPaid;

  // Attendance summary
  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const absentCount = attendance.filter((a) => a.status === "Absent").length;
  const lateCount = attendance.filter((a) => a.status === "Late").length;
  const attendanceRate = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : null;

  // Filtered results
  const filteredResults = results.filter(
    (r) => !filterExam || r.exam === filterExam
  );
  const average = filteredResults.length
    ? Math.round(filteredResults.reduce((sum, r) => sum + Number(r.score), 0) / filteredResults.length)
    : null;

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Topbar */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 text-white rounded-lg w-8 h-8 flex items-center justify-center font-bold text-sm">
            P
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {student.firstName} {student.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {student.admissionNumber} · {student.grade} · {student.pathway || "—"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className="bg-indigo-500 text-white rounded-xl p-3">
              <GraduationCap size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Results</p>
              <p className="text-xl font-bold text-gray-800">{results.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className={`${balance <= 0 ? "bg-green-500" : "bg-red-400"} text-white rounded-xl p-3`}>
              <Banknote size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Fee Balance</p>
              <p className={`text-xl font-bold ${balance <= 0 ? "text-green-600" : "text-red-500"}`}>
                {expectedFee ? `KES ${balance.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-3">
            <div className={`${attendanceRate !== null && attendanceRate >= 80 ? "bg-green-500" : "bg-orange-400"} text-white rounded-xl p-3`}>
              <ClipboardList size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Attendance</p>
              <p className={`text-xl font-bold ${attendanceRate !== null && attendanceRate >= 80 ? "text-green-600" : "text-orange-500"}`}>
                {attendanceRate !== null ? `${attendanceRate}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit">
          {["results", "attendance", "fees"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
                activeTab === tab
                  ? "bg-white text-green-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "fees" ? "Fee Statement" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : (
          <>
            {/* Results tab */}
            {activeTab === "results" && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Academic Results</h2>
                  <select
                    value={filterExam}
                    onChange={(e) => setFilterExam(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Exams</option>
                    {EXAMS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>

                {filteredResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No results found.</div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                          <tr>
                            <th className="px-6 py-3 font-medium">Subject</th>
                            <th className="px-6 py-3 font-medium">Exam</th>
                            <th className="px-6 py-3 font-medium">Score</th>
                            <th className="px-6 py-3 font-medium">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredResults.map((r) => {
                            const { grade, color } = getGrade(r.score);
                            return (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium">{r.subject}</td>
                                <td className="px-6 py-3 text-gray-500">{r.exam}</td>
                                <td className="px-6 py-3 font-medium">{r.score}%</td>
                                <td className={`px-6 py-3 font-bold ${color}`}>{grade}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {average !== null && (
                      <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{filteredResults.length} subjects</p>
                        <div className="text-right">
                          <span className="text-xs text-gray-500">Average: </span>
                          <span className={`font-bold ${getGrade(average).color}`}>
                            {average}% ({getGrade(average).grade})
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Attendance tab */}
            {activeTab === "attendance" && (
              <div className="space-y-4">

                {/* Attendance summary */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Attendance Summary</h2>
                  {attendance.length === 0 ? (
                    <p className="text-sm text-gray-400">No attendance records found.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                          <p className="text-xs text-gray-500 mt-1">Present</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-red-500">{absentCount}</p>
                          <p className="text-xs text-gray-500 mt-1">Absent</p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-4 text-center">
                          <p className="text-2xl font-bold text-yellow-500">{lateCount}</p>
                          <p className="text-xs text-gray-500 mt-1">Late</p>
                        </div>
                      </div>

                      {/* Attendance rate bar */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Attendance rate</span>
                          <span>{attendanceRate}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              attendanceRate >= 80 ? "bg-green-500" : "bg-orange-400"
                            }`}
                            style={{ width: `${attendanceRate}%` }}
                          />
                        </div>
                        {attendanceRate < 80 && (
                          <p className="text-xs text-orange-500 mt-2">
                            Attendance is below the recommended 80% threshold.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Attendance records */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-semibold text-gray-800">Attendance Records</h2>
                  </div>
                  {attendance.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No attendance records found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Class</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendance.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">{a.date}</td>
                            <td className="px-6 py-3 text-gray-500">{a.className || a.grade}</td>
                            <td className="px-6 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                a.status === "Present"
                                  ? "bg-green-100 text-green-700"
                                  : a.status === "Absent"
                                  ? "bg-red-100 text-red-600"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Fees tab */}
            {activeTab === "fees" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">Fee Summary ({currentYear})</h2>
                  {!expectedFee ? (
                    <p className="text-sm text-gray-400">No fee structure set for your grade yet.</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Annual Fee</span>
                        <span className="font-medium">KES {expectedFee.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Total Paid</span>
                        <span className="font-medium text-green-600">KES {totalPaid.toLocaleString()}</span>
                      </div>
                      <div className="border-t pt-3 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">Balance</span>
                        <span className={`font-bold text-base ${balance <= 0 ? "text-green-600" : "text-red-500"}`}>
                          {balance <= 0 ? "Cleared ✓" : `KES ${balance.toLocaleString()} owing`}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Payment progress</span>
                          <span>{Math.min(Math.round((totalPaid / expectedFee) * 100), 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${balance <= 0 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${Math.min((totalPaid / expectedFee) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h2 className="font-semibold text-gray-800">Payment History</h2>
                  </div>
                  {payments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No payments recorded yet.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Amount</th>
                          <th className="px-6 py-3 font-medium">Method</th>
                          <th className="px-6 py-3 font-medium">Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">{p.date}</td>
                            <td className="px-6 py-3 text-green-600 font-medium">
                              KES {Number(p.amount).toLocaleString()}
                            </td>
                            <td className="px-6 py-3">{p.method}</td>
                            <td className="px-6 py-3 text-gray-400">{p.reference || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}