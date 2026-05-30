import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, query, where, doc, deleteDoc
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { ClipboardCheck, Trash2 } from "lucide-react";

const STATUS = ["Present", "Absent", "Late"];

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("take");

  // Data
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Take attendance state
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);

  // History filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const GRADES = ["Grade 10", "Grade 11", "Grade 12"];

  async function fetchData() {
    setLoading(true);
    try {
      const [stuSnap, recSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "attendance")),
      ]);
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRecords(recSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // When grade or date changes, check if attendance already taken
  // and pre-fill the attendance map
  useEffect(() => {
    if (!selectedGrade || !selectedDate) {
      setAttendanceMap({});
      setAlreadyTaken(false);
      return;
    }

    const gradeStudents = students.filter((s) => s.grade === selectedGrade);
    const existingRecords = records.filter(
      (r) => r.grade === selectedGrade && r.date === selectedDate
    );

    if (existingRecords.length > 0) {
      setAlreadyTaken(true);
      const map = {};
      existingRecords.forEach((r) => {
        map[r.studentId] = r.status;
      });
      setAttendanceMap(map);
    } else {
      setAlreadyTaken(false);
      const map = {};
      gradeStudents.forEach((s) => {
        map[s.id] = "Present";
      });
      setAttendanceMap(map);
    }
  }, [selectedGrade, selectedDate, students, records]);

  const gradeStudents = students.filter((s) => s.grade === selectedGrade);

  async function handleSaveAttendance() {
    if (!selectedGrade || !selectedDate) return;
    if (gradeStudents.length === 0) return alert("No students in this grade.");
    setSaving(true);
    try {
      await Promise.all(
        gradeStudents.map((student) =>
          addDoc(collection(db, "attendance"), {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            grade: selectedGrade,
            date: selectedDate,
            status: attendanceMap[student.id] || "Present",
            createdAt: new Date(),
          })
        )
      );
      await fetchData();
      setAlreadyTaken(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDayAttendance() {
    if (!window.confirm(`Delete all attendance records for ${selectedGrade} on ${selectedDate}?`)) return;
    const toDelete = records.filter(
      (r) => r.grade === selectedGrade && r.date === selectedDate
    );
    await Promise.all(toDelete.map((r) => deleteDoc(doc(db, "attendance", r.id))));
    await fetchData();
  }

  // History filtered records
  const filteredRecords = records.filter((r) => {
    return (
      (!filterGrade || r.grade === filterGrade) &&
      (!filterDate || r.date === filterDate)
    );
  });

  // Group history by date + grade
  const grouped = filteredRecords.reduce((acc, r) => {
    const key = `${r.date}__${r.grade}`;
    if (!acc[key]) acc[key] = { date: r.date, grade: r.grade, records: [] };
    acc[key].records.push(r);
    return acc;
  }, {});

  const groupedList = Object.values(grouped).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  function getSummary(recs) {
    const present = recs.filter((r) => r.status === "Present").length;
    const absent = recs.filter((r) => r.status === "Absent").length;
    const late = recs.filter((r) => r.status === "Late").length;
    return { present, absent, late, total: recs.length };
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Take and view student attendance records</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {["take", "history"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "take" ? "Take Attendance" : "History"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* ── Take Attendance Tab ── */}
          {activeTab === "take" && (
            <div>
              {/* Controls */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Attendance list */}
              {selectedGrade && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Already taken banner */}
                  {alreadyTaken && (
                    <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-3 flex items-center justify-between">
                      <p className="text-sm text-yellow-700">
                        Attendance already recorded for {selectedGrade} on {selectedDate}.
                      </p>
                      <button
                        onClick={handleDeleteDayAttendance}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Delete & Redo
                      </button>
                    </div>
                  )}

                  {gradeStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No students found in {selectedGrade}.
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                          <tr>
                            <th className="px-6 py-3 font-medium">Adm No.</th>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {gradeStudents.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 text-blue-600">{student.admissionNumber}</td>
                              <td className="px-6 py-3 font-medium">
                                {student.firstName} {student.lastName}
                              </td>
                              <td className="px-6 py-3">
                                <div className="flex gap-2">
                                  {STATUS.map((s) => (
                                    <button
                                      key={s}
                                      disabled={alreadyTaken}
                                      onClick={() =>
                                        setAttendanceMap({ ...attendanceMap, [student.id]: s })
                                      }
                                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                                        attendanceMap[student.id] === s
                                          ? s === "Present"
                                            ? "bg-green-500 text-white"
                                            : s === "Absent"
                                            ? "bg-red-500 text-white"
                                            : "bg-yellow-400 text-white"
                                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {!alreadyTaken && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {gradeStudents.length} students —{" "}
                            {Object.values(attendanceMap).filter((v) => v === "Present").length} present,{" "}
                            {Object.values(attendanceMap).filter((v) => v === "Absent").length} absent,{" "}
                            {Object.values(attendanceMap).filter((v) => v === "Late").length} late
                          </p>
                          <button
                            onClick={handleSaveAttendance}
                            disabled={saving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
                          >
                            <ClipboardCheck size={16} />
                            {saving ? "Saving..." : "Save Attendance"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── History Tab ── */}
          {activeTab === "history" && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {(filterGrade || filterDate) && (
                  <button
                    onClick={() => { setFilterGrade(""); setFilterDate(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {groupedList.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
                  No attendance records found.
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedList.map(({ date, grade, records: recs }) => {
                    const { present, absent, late, total } = getSummary(recs);
                    return (
                      <div key={`${date}__${grade}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        {/* Group header */}
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-800">{grade}</span>
                            <span className="text-gray-400 text-sm ml-3">{date}</span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              {present} Present
                            </span>
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full">
                              {absent} Absent
                            </span>
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                              {late} Late
                            </span>
                          </div>
                        </div>

                        {/* Records */}
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr>
                              <th className="px-6 py-2 font-medium">Adm No.</th>
                              <th className="px-6 py-2 font-medium">Name</th>
                              <th className="px-6 py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {recs.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-6 py-2 text-blue-600">{r.admissionNumber}</td>
                                <td className="px-6 py-2">{r.studentName}</td>
                                <td className="px-6 py-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    r.status === "Present"
                                      ? "bg-green-100 text-green-700"
                                      : r.status === "Absent"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}