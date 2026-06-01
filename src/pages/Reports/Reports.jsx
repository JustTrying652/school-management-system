import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useRole } from "../../hooks/useRole";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

const EXAMS = ["Mid Term 1", "End Term 1", "Mid Term 2", "End Term 2", "Mid Term 3", "End Term 3"];
const GRADES = ["Grade 10", "Grade 11", "Grade 12"];

function getLetterGrade(score) {
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 65) return "B";
  if (score >= 60) return "B-";
  if (score >= 55) return "C+";
  if (score >= 50) return "C";
  if (score >= 45) return "C-";
  if (score >= 40) return "D+";
  if (score >= 35) return "D";
  if (score >= 30) return "D-";
  return "E";
}

function downloadExcel(data, filename, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export default function Reports() {
  const { role } = useRole();

  // All data
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [payments, setPayments] = useState([]);
  const [structures, setStructures] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [classFilter, setClassFilter] = useState("");
  const [examFilter, setExamFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Export loading states
  const [exporting, setExporting] = useState({
    students: false,
    results: false,
    attendance: false,
    fees: false,
  });

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [classSnap, stuSnap, resSnap, paySnap, structSnap, attSnap] = await Promise.all([
          getDocs(collection(db, "classes")),
          getDocs(collection(db, "students")),
          getDocs(collection(db, "results")),
          getDocs(collection(db, "feePayments")),
          getDocs(collection(db, "feeStructures")),
          getDocs(collection(db, "attendance")),
        ]);
        setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setResults(resSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setPayments(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setStructures(structSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setAttendance(attSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Get students in selected class
  function getClassStudents(classId) {
    return students.filter((s) => s.classId === classId);
  }

  // ── Export: Class List ──────────────────────────────────
  function exportClassList() {
    if (!classFilter) return alert("Please select a class.");
    setExporting((e) => ({ ...e, students: true }));
    try {
      const cls = classes.find((c) => c.id === classFilter);
      const classStudents = getClassStudents(classFilter);
      if (classStudents.length === 0) return alert("No students found in this class.");

      const data = classStudents.map((s, i) => ({
        "#": i + 1,
        "Admission No.": s.admissionNumber,
        "First Name": s.firstName,
        "Last Name": s.lastName,
        "Grade": s.grade,
        "Stream": s.stream || "—",
        "Pathway": s.pathway || "—",
        "Gender": s.gender,
        "Parent Phone": s.parentPhone || "—",
      }));

      downloadExcel(data, `Class List - ${cls.name}`, cls.name);
    } finally {
      setExporting((e) => ({ ...e, students: false }));
    }
  }

  // ── Export: Results ─────────────────────────────────────
  function exportResults() {
    if (!classFilter) return alert("Please select a class.");
    if (!examFilter) return alert("Please select an exam.");
    setExporting((e) => ({ ...e, results: true }));
    try {
      const cls = classes.find((c) => c.id === classFilter);
      const classStudents = getClassStudents(classFilter);
      if (classStudents.length === 0) return alert("No students found in this class.");

      // Get all subjects for this exam in this class
      const classResults = results.filter(
        (r) =>
          classStudents.some((s) => s.id === r.studentId) &&
          r.exam === examFilter
      );
      const subjects = [...new Set(classResults.map((r) => r.subject))].sort();

      const data = classStudents.map((student, i) => {
        const studentResults = classResults.filter((r) => r.studentId === student.id);
        const row = {
          "#": i + 1,
          "Admission No.": student.admissionNumber,
          "Name": `${student.firstName} ${student.lastName}`,
          "Grade": student.grade,
          "Pathway": student.pathway || "—",
        };

        let total = 0;
        let count = 0;
        subjects.forEach((subject) => {
          const result = studentResults.find((r) => r.subject === subject);
          if (result) {
            row[subject] = result.score;
            total += result.score;
            count++;
          } else {
            row[subject] = "—";
          }
        });

        const avg = count > 0 ? Math.round(total / count) : null;
        row["Average"] = avg !== null ? avg : "—";
        row["Overall Grade"] = avg !== null ? getLetterGrade(avg) : "—";

        return row;
      });

      downloadExcel(data, `Results - ${cls.name} - ${examFilter}`, examFilter);
    } finally {
      setExporting((e) => ({ ...e, results: false }));
    }
  }

  // ── Export: Attendance ──────────────────────────────────
  function exportAttendance() {
    if (!classFilter) return alert("Please select a class.");
    if (!dateFrom || !dateTo) return alert("Please select a date range.");
    setExporting((e) => ({ ...e, attendance: true }));
    try {
      const cls = classes.find((c) => c.id === classFilter);
      const classStudents = getClassStudents(classFilter);
      if (classStudents.length === 0) return alert("No students found in this class.");

      // Filter attendance records
      const classAttendance = attendance.filter(
        (a) =>
          classStudents.some((s) => s.id === a.studentId) &&
          a.date >= dateFrom &&
          a.date <= dateTo
      );

      // Get unique dates in range
      const dates = [...new Set(classAttendance.map((a) => a.date))].sort();

      if (dates.length === 0) return alert("No attendance records found for this date range.");

      const data = classStudents.map((student, i) => {
        const row = {
          "#": i + 1,
          "Admission No.": student.admissionNumber,
          "Name": `${student.firstName} ${student.lastName}`,
          "Grade": student.grade,
        };

        let present = 0, absent = 0, late = 0;
        dates.forEach((date) => {
          const record = classAttendance.find(
            (a) => a.studentId === student.id && a.date === date
          );
          const status = record ? record.status : "—";
          row[date] = status;
          if (status === "Present") present++;
          else if (status === "Absent") absent++;
          else if (status === "Late") late++;
        });

        row["Present"] = present;
        row["Absent"] = absent;
        row["Late"] = late;
        row["Total Days"] = dates.length;

        return row;
      });

      downloadExcel(
        data,
        `Attendance - ${cls.name} - ${dateFrom} to ${dateTo}`,
        "Attendance"
      );
    } finally {
      setExporting((e) => ({ ...e, attendance: false }));
    }
  }

  // ── Export: Fee Report ──────────────────────────────────
  function exportFees() {
    if (!gradeFilter) return alert("Please select a grade.");
    setExporting((e) => ({ ...e, fees: true }));
    try {
      const gradeStudents = students.filter((s) => s.grade === gradeFilter);
      if (gradeStudents.length === 0) return alert("No students found in this grade.");

      const currentYear = new Date().getFullYear().toString();
      const structure = structures.find(
        (s) => s.grade === gradeFilter && s.year === currentYear
      );
      const expectedFee = structure ? Number(structure.amount) : 0;

      const data = gradeStudents.map((student, i) => {
        const totalPaid = payments
          .filter((p) => p.studentId === student.id)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = expectedFee - totalPaid;

        let status = "No Structure";
        if (expectedFee) {
          if (balance <= 0) status = "Cleared";
          else if (totalPaid > 0) status = "Partial";
          else status = "Unpaid";
        }

        return {
          "#": i + 1,
          "Admission No.": student.admissionNumber,
          "Name": `${student.firstName} ${student.lastName}`,
          "Grade": student.grade,
          "Expected Fee (KES)": expectedFee || "—",
          "Total Paid (KES)": totalPaid,
          "Balance (KES)": expectedFee ? balance : "—",
          "Status": status,
          "Parent Phone": student.parentPhone || "—",
        };
      });

      downloadExcel(data, `Fee Report - ${gradeFilter} - ${currentYear}`, gradeFilter);
    } finally {
      setExporting((e) => ({ ...e, fees: false }));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Export school data to Excel</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Class List */}
          {(role === "Principal" || role === "Teacher") && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 text-blue-600 rounded-xl p-2.5">
                  <Download size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Class List</h2>
                  <p className="text-xs text-gray-500">Student roster by class</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={exportClassList}
                  disabled={exporting.students || !classFilter}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting.students ? "Exporting..." : "Export to Excel"}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {(role === "Principal" || role === "Teacher") && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 text-indigo-600 rounded-xl p-2.5">
                  <Download size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Results Report</h2>
                  <p className="text-xs text-gray-500">Class results per exam</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exam</label>
                  <select
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select exam</option>
                    {EXAMS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <button
                  onClick={exportResults}
                  disabled={exporting.results || !classFilter || !examFilter}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting.results ? "Exporting..." : "Export to Excel"}
                </button>
              </div>
            </div>
          )}

          {/* Attendance */}
          {(role === "Principal" || role === "Teacher") && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-pink-100 text-pink-600 rounded-xl p-2.5">
                  <Download size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Attendance Report</h2>
                  <p className="text-xs text-gray-500">Class attendance by date range</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={exportAttendance}
                  disabled={exporting.attendance || !classFilter || !dateFrom || !dateTo}
                  className="w-full flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting.attendance ? "Exporting..." : "Export to Excel"}
                </button>
              </div>
            </div>
          )}

          {/* Fees */}
          {(role === "Principal" || role === "Bursar") && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-100 text-yellow-600 rounded-xl p-2.5">
                  <Download size={18} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Fee Report</h2>
                  <p className="text-xs text-gray-500">Fee balances by grade</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button
                  onClick={exportFees}
                  disabled={exporting.fees || !gradeFilter}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  <Download size={15} />
                  {exporting.fees ? "Exporting..." : "Export to Excel"}
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}