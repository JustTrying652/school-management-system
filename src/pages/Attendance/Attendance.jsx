import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { ClipboardCheck, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";
import { openWhatsApp, absenceMessage } from "../../utils/whatsapp";

const STATUS = ["Present", "Absent", "Late"];

export default function Attendance() {
  const { toast } = useToast();
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const [activeTab, setActiveTab] = useState("take");

  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);

  const [filterClassId, setFilterClassId] = useState("");
  const [filterDate, setFilterDate] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [stuSnap, recSnap, classSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "attendance")),
        getDocs(collection(db, "classes")),
      ]);
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setRecords(recSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedDate) {
      setAttendanceMap({});
      setAlreadyTaken(false);
      return;
    }
    const classStudents = students.filter((s) => s.classId === selectedClassId);
    const existingRecords = records.filter(
      (r) => r.classId === selectedClassId && r.date === selectedDate
    );
    if (existingRecords.length > 0) {
      setAlreadyTaken(true);
      const map = {};
      existingRecords.forEach((r) => { map[r.studentId] = r.status; });
      setAttendanceMap(map);
    } else {
      setAlreadyTaken(false);
      const map = {};
      classStudents.forEach((s) => { map[s.id] = "Present"; });
      setAttendanceMap(map);
    }
  }, [selectedClassId, selectedDate, students, records]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  async function handleSaveAttendance() {
    if (!selectedClassId || !selectedDate) return;
    if (classStudents.length === 0) return alert("No students in this class.");
    setSaving(true);
    try {
      await Promise.all(
        classStudents.map((student) =>
          addDoc(collection(db, "attendance"), {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            classId: selectedClassId,
            className: selectedClass?.name || "",
            grade: student.grade,
            date: selectedDate,
            status: attendanceMap[student.id] || "Present",
            createdAt: new Date(),
          })
        )
      );
      await fetchData();
      setAlreadyTaken(true);
      toast({ message: `Attendance saved for ${selectedClass?.name}.` });
    } catch (err) {
      console.error(err);
      toast({ message: "Failed to save attendance.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteDayAttendance() {
    setConfirmModal({
      open: true,
      message: `This will delete all attendance records for ${selectedClass?.name} on ${selectedDate}.`,
      onConfirm: async () => {
        try {
          const toDelete = records.filter(
            (r) => r.classId === selectedClassId && r.date === selectedDate
          );
          await Promise.all(toDelete.map((r) => deleteDoc(doc(db, "attendance", r.id))));
          await fetchData();
          toast({ message: "Attendance records deleted.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to delete records.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  const filteredRecords = records.filter((r) => {
    return (
      (!filterClassId || r.classId === filterClassId) &&
      (!filterDate || r.date === filterDate)
    );
  });

  const grouped = filteredRecords.reduce((acc, r) => {
    const key = `${r.date}__${r.classId || r.grade}`;
    if (!acc[key]) acc[key] = {
      date: r.date,
      grade: r.grade,
      className: r.className || r.grade,
      records: [],
    };
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
        <TableSkeleton rows={5} cols={4} />
      ) : (
        <>
          {/* ── Take Attendance Tab ── */}
          {activeTab === "take" && (
            <div>
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                      ))}
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

              {selectedClassId && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {alreadyTaken && (
                    <div className="bg-yellow-50 border-b border-yellow-100 px-6 py-3 flex items-center justify-between">
                      <p className="text-sm text-yellow-700">
                        Attendance already recorded for {selectedClass?.name} on {selectedDate}.
                      </p>
                      <button
                        onClick={handleDeleteDayAttendance}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Delete & Redo
                      </button>
                    </div>
                  )}

                  {classStudents.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No students found in {selectedClass?.name}.
                    </div>
                  ) : (
                    <>
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600 text-left">
                          <tr>
                            <th className="px-6 py-3 font-medium">Adm No.</th>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium">Notify</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {classStudents.map((student) => (
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
                              <td className="px-6 py-3">
                                {(attendanceMap[student.id] === "Absent" || attendanceMap[student.id] === "Late") && student.parentPhone ? (
                                  <button
                                    onClick={() => openWhatsApp(student.parentPhone, absenceMessage(
                                      `${student.firstName} ${student.lastName}`,
                                      student.grade,
                                      selectedDate
                                    ))}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition font-medium"
                                  >
                                    <MessageCircle size={13} />
                                    Notify
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {!alreadyTaken && (
                        <div className="px-6 py-4 border-t flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {classStudents.length} students —{" "}
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
              <div className="flex flex-wrap gap-4 mb-4">
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — {c.grade}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {(filterClassId || filterDate) && (
                  <button
                    onClick={() => { setFilterClassId(""); setFilterDate(""); }}
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
                  {groupedList.map((group) => {
                    const { present, absent, late } = getSummary(group.records);
                    return (
                      <div key={`${group.date}__${group.className}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-gray-800">{group.className}</span>
                            <span className="text-gray-400 text-sm ml-3">{group.date}</span>
                          </div>
                          <div className="flex gap-3 text-xs">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">{present} Present</span>
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full">{absent} Absent</span>
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">{late} Late</span>
                          </div>
                        </div>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-left">
                            <tr>
                              <th className="px-6 py-2 font-medium">Adm No.</th>
                              <th className="px-6 py-2 font-medium">Name</th>
                              <th className="px-6 py-2 font-medium">Status</th>
                              <th className="px-6 py-2 font-medium">Notify</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.records.map((r) => (
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
                                <td className="px-6 py-2">
                                  {(r.status === "Absent" || r.status === "Late") ? (() => {
                                    const student = students.find((s) => s.id === r.studentId);
                                    return student?.parentPhone ? (
                                      <button
                                        onClick={() => openWhatsApp(student.parentPhone, absenceMessage(r.studentName, r.grade, r.date))}
                                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition font-medium"
                                      >
                                        <MessageCircle size={13} />
                                        Notify
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-300">No phone</span>
                                    );
                                  })() : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
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

      {confirmModal.open && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ open: false, message: "", onConfirm: null })}
        />
      )}
    </div>
  );
}