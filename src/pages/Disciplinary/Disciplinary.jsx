import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";
import { Plus, Trash2, X, ShieldAlert } from "lucide-react";

const INCIDENT_TYPES = [
  "Absenteeism",
  "Bullying",
  "Cheating",
  "Destruction of Property",
  "Disrespect to Staff",
  "Drug/Substance Abuse",
  "Fighting",
  "Lateness",
  "Misconduct",
  "Theft",
  "Truancy",
  "Uniform Violation",
  "Other",
];

const ACTIONS_TAKEN = [
  "Verbal Warning",
  "Written Warning",
  "Parent Notified",
  "Detention",
  "Suspension",
  "Expulsion",
  "Counselling",
  "Community Service",
  "Other",
];

const SEVERITY = {
  low: { label: "Low", color: "bg-yellow-100 text-yellow-700" },
  medium: { label: "Medium", color: "bg-orange-100 text-orange-700" },
  high: { label: "High", color: "bg-red-100 text-red-600" },
};

const emptyForm = {
  studentId: "",
  studentName: "",
  admissionNumber: "",
  grade: "",
  classId: "",
  className: "",
  date: new Date().toISOString().split("T")[0],
  incidentType: "",
  severity: "low",
  description: "",
  actionTaken: "",
  actionDetails: "",
};

export default function Disciplinary() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });

  // Filters
  const [filterClassId, setFilterClassId] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [search, setSearch] = useState("");

  // Student search in modal
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Active tab
  const [activeTab, setActiveTab] = useState("records");

  async function fetchData() {
    setLoading(true);
    try {
      const [recSnap, stuSnap, classSnap] = await Promise.all([
        getDocs(collection(db, "disciplinary")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "classes")),
      ]);
      setRecords(
        recSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.date?.localeCompare(a.date))
      );
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function openModal() {
    setForm(emptyForm);
    setSelectedStudent(null);
    setStudentSearch("");
    setShowModal(true);
  }

  function selectStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    const cls = classes.find((c) => c.id === student.classId);
    setForm({
      ...form,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      grade: student.grade,
      classId: student.classId || "",
      className: cls?.name || "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId) return alert("Please select a student.");
    setSaving(true);
    try {
      await addDoc(collection(db, "disciplinary"), {
        ...form,
        recordedBy: `${userProfile?.firstName} ${userProfile?.lastName}` || "Admin",
        createdAt: new Date(),
      });
      await fetchData();
      setShowModal(false);
      toast({ message: "Disciplinary record added." });
    } catch (err) {
      console.error(err);
      toast({ message: "Failed to add record.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      open: true,
      message: "This will permanently delete this disciplinary record.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "disciplinary", id));
          await fetchData();
          toast({ message: "Record deleted.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to delete record.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  const filteredStudentSearch = students
    .filter((s) => {
      const q = studentSearch.toLowerCase();
      return (
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!filterClassId || r.classId === filterClassId) &&
      (!filterType || r.incidentType === filterType) &&
      (!filterSeverity || r.severity === filterSeverity) &&
      (!search ||
        r.studentName?.toLowerCase().includes(q) ||
        r.admissionNumber?.toLowerCase().includes(q))
    );
  });

  // Per student summary for the summary tab
  const studentSummary = students
    .map((s) => {
      const studentRecords = records.filter((r) => r.studentId === s.id);
      if (studentRecords.length === 0) return null;
      const high = studentRecords.filter((r) => r.severity === "high").length;
      const medium = studentRecords.filter((r) => r.severity === "medium").length;
      const low = studentRecords.filter((r) => r.severity === "low").length;
      const cls = classes.find((c) => c.id === s.classId);
      return {
        student: s,
        className: cls?.name || "—",
        total: studentRecords.length,
        high,
        medium,
        low,
        latest: studentRecords[0]?.date || "—",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Disciplinary Records</h1>
          <p className="text-gray-500 text-sm mt-1">Log and track student disciplinary incidents</p>
        </div>
        {activeTab === "records" && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Add Record
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {["records", "summary"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "records" ? "All Records" : "Student Summary"}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <>
          {/* Records tab */}
          {activeTab === "records" && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by name or adm no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  {Object.entries(SEVERITY).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                {(filterClassId || filterType || filterSeverity || search) && (
                  <button
                    onClick={() => { setFilterClassId(""); setFilterType(""); setFilterSeverity(""); setSearch(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filteredRecords.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No disciplinary records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Class</th>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Incident</th>
                          <th className="px-6 py-3 font-medium">Severity</th>
                          <th className="px-6 py-3 font-medium">Action </th>
                          <th className="px-6 py-3 font-medium">Recorded By</th>
                          <th className="px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <p className="font-medium">{r.studentName}</p>
                              <p className="text-xs text-gray-400">{r.admissionNumber}</p>
                            </td>
                            <td className="px-6 py-3 text-gray-500">{r.className || "—"}</td>
                            <td className="px-6 py-3">{r.date}</td>
                            <td className="px-6 py-3">
                              <p>{r.incidentType}</p>
                              {r.description && (
                                <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{r.description}</p>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEVERITY[r.severity]?.color}`}>
                                {SEVERITY[r.severity]?.label}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <p>{r.actionTaken}</p>
                              {r.actionDetails && (
                                <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{r.actionDetails}</p>
                              )}
                            </td>
                            <td className="px-6 py-3 text-gray-500">{r.recordedBy}</td>
                            <td className="px-6 py-3">
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="text-gray-400 hover:text-red-500 transition"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Summary tab */}
          {activeTab === "summary" && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {studentSummary.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No disciplinary records yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-left">
                      <tr>
                        <th className="px-6 py-3 font-medium">Student</th>
                        <th className="px-6 py-3 font-medium">Class</th>
                        <th className="px-6 py-3 font-medium">Total Incidents</th>
                        <th className="px-6 py-3 font-medium">High</th>
                        <th className="px-6 py-3 font-medium">Medium</th>
                        <th className="px-6 py-3 font-medium">Low</th>
                        <th className="px-6 py-3 font-medium">Latest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {studentSummary.map(({ student, className, total, high, medium, low, latest }) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-gray-400">{student.admissionNumber}</p>
                          </td>
                          <td className="px-6 py-3 text-gray-500">{className}</td>
                          <td className="px-6 py-3">
                            <span className="font-bold text-gray-800">{total}</span>
                          </td>
                          <td className="px-6 py-3">
                            {high > 0 ? (
                              <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">{high}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-3">
                            {medium > 0 ? (
                              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">{medium}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-3">
                            {low > 0 ? (
                              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">{low}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-6 py-3 text-gray-500">{latest}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Record Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Add Disciplinary Record</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Student search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
                <input
                  placeholder="Type name or admission number..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setSelectedStudent(null);
                    setForm({ ...form, studentId: "", studentName: "", admissionNumber: "", grade: "", classId: "", className: "" });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {studentSearch && !selectedStudent && filteredStudentSearch.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredStudentSearch.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition"
                      >
                        {s.firstName} {s.lastName} — {s.admissionNumber} ({s.grade})
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
                  <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                  {" "}— {form.className || selectedStudent.grade}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                  <select
                    required
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(SEVERITY).map(([key, { label }]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Incident Type</label>
                <select
                  required
                  value={form.incidentType}
                  onChange={(e) => setForm({ ...form, incidentType: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select incident type</option>
                  {INCIDENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the incident..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action Taken</label>
                <select
                  required
                  value={form.actionTaken}
                  onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select action taken</option>
                  {ACTIONS_TAKEN.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action Details (optional)</label>
                <textarea
                  rows={2}
                  placeholder="Any additional details about the action taken..."
                  value={form.actionDetails}
                  onChange={(e) => setForm({ ...form, actionDetails: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedStudent}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
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