import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, deleteDoc, doc
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { Plus, Trash2, X } from "lucide-react";
import { toas, useToast } from "../../context/ToastContext";

const GRADES = ["Grade 10", "Grade 11", "Grade 12"];

const SUBJECTS_BY_PATHWAY = {
  "STEM": ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Engineering Technology"],
  "Arts & Sports Science": ["Music", "Fine Art", "Performing Arts", "Media Studies", "Physical Education", "Creative Writing"],
  "Social Sciences": ["History", "Geography", "Economics", "Business Studies", "Life Skills", "Religious Education"],
  "Core": ["English", "Kiswahili", "Community Service Learning", "Physical Education"],
};

const ALL_SUBJECTS = [
  ...SUBJECTS_BY_PATHWAY["Core"],
  ...SUBJECTS_BY_PATHWAY["STEM"],
  ...SUBJECTS_BY_PATHWAY["Arts & Sports Science"],
  ...SUBJECTS_BY_PATHWAY["Social Sciences"],
];

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

const emptyForm = {
  studentId: "",
  studentName: "",
  admissionNumber: "",
  grade: "",
  subject: "",
  exam: "",
  score: "",
  year: new Date().getFullYear().toString(),
  remarks: "",
};

export default function Results() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("records");

  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterExam, setFilterExam] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // Report card
  const [reportStudent, setReportStudent] = useState("");
  const [reportExam, setReportExam] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [resSnap, stuSnap] = await Promise.all([
        getDocs(collection(db, "results")),
        getDocs(collection(db, "students")),
      ]);
      setResults(resSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    setForm({
      ...form,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      grade: student.grade,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.studentId) return alert("Please select a student.");
    setSaving(true);
    try {
  await addDoc(collection(db, "results"), {
    ...form,
    score: Number(form.score),
    createdAt: new Date(),
  });
  await fetchData();
  setShowModal(false);
  toast({ message: "Result added successfully." });
} catch (err) {
  console.error(err);
  toast({ message: "Failed to add result.", type: "error" });
}
  }

  async function handleDelete(id) {
  if (!window.confirm("Delete this result?")) return;
  try {
    await deleteDoc(doc(db, "results", id));
    await fetchData();
    toast({ message: "Result deleted.", type: "warning" });
  } catch (err) {
    toast({ message: "Failed to delete result.", type: "error" });
  }
}

  const filteredStudentSearch = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const filteredResults = results.filter((r) => {
    return (
      (!filterGrade || r.grade === filterGrade) &&
      (!filterExam || r.exam === filterExam) &&
      (!filterSubject || r.subject === filterSubject)
    );
  });

  // Report card data
  const reportStudentData = students.find((s) => s.id === reportStudent);
  const reportResults = results.filter(
    (r) => r.studentId === reportStudent && (!reportExam || r.exam === reportExam)
  );
  const reportAverage = reportResults.length
    ? Math.round(reportResults.reduce((sum, r) => sum + Number(r.score), 0) / reportResults.length)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Results</h1>
          <p className="text-gray-500 text-sm mt-1">Record and view student exam results</p>
        </div>
        {activeTab === "records" && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Add Result
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {["records", "report"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "records" ? "Result Records" : "Report Card"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* ── Records Tab ── */}
          {activeTab === "records" && (
            <div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Exams</option>
                  {EXAMS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Subjects</option>
                  {ALL_SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {(filterGrade || filterExam || filterSubject) && (
                  <button
                    onClick={() => { setFilterGrade(""); setFilterExam(""); setFilterSubject(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filteredResults.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No results found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Adm No.</th>
                          <th className="px-6 py-3 font-medium">Grade</th>
                          <th className="px-6 py-3 font-medium">Subject</th>
                          <th className="px-6 py-3 font-medium">Exam</th>
                          <th className="px-6 py-3 font-medium">Score</th>
                          <th className="px-6 py-3 font-medium">Grade</th>
                          <th className="px-6 py-3 font-medium">Remarks</th>
                          <th className="px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredResults.map((r) => {
                          const { grade, color } = getGrade(r.score);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium">{r.studentName}</td>
                              <td className="px-6 py-3 text-blue-600">{r.admissionNumber}</td>
                              <td className="px-6 py-3">{r.grade}</td>
                              <td className="px-6 py-3">{r.subject}</td>
                              <td className="px-6 py-3">{r.exam}</td>
                              <td className="px-6 py-3 font-medium">{r.score}%</td>
                              <td className={`px-6 py-3 font-bold ${color}`}>{grade}</td>
                              <td className="px-6 py-3 text-gray-400">{r.remarks || "—"}</td>
                              <td className="px-6 py-3">
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  className="text-gray-400 hover:text-red-500 transition"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Report Card Tab ── */}
          {activeTab === "report" && (
            <div>
              {/* Report filters */}
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Select Student</label>
                    <select
                      value={reportStudent}
                      onChange={(e) => setReportStudent(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName} — {s.admissionNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Exam (optional)</label>
                    <select
                      value={reportExam}
                      onChange={(e) => setReportExam(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Exams</option>
                      {EXAMS.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {reportStudent && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Report header */}
                  <div className="px-6 py-5 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-800">
                          {reportStudentData?.firstName} {reportStudentData?.lastName}
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {reportStudentData?.admissionNumber} · {reportStudentData?.grade} · {reportStudentData?.pathway || "—"}
                        </p>
                      </div>
                      {reportAverage !== null && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Average Score</p>
                          <p className={`text-3xl font-bold ${getGrade(reportAverage).color}`}>
                            {reportAverage}%
                          </p>
                          <p className={`text-sm font-semibold ${getGrade(reportAverage).color}`}>
                            {getGrade(reportAverage).grade}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {reportResults.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      No results found for this student.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Subject</th>
                          <th className="px-6 py-3 font-medium">Exam</th>
                          <th className="px-6 py-3 font-medium">Score</th>
                          <th className="px-6 py-3 font-medium">Grade</th>
                          <th className="px-6 py-3 font-medium">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportResults.map((r) => {
                          const { grade, color } = getGrade(r.score);
                          return (
                            <tr key={r.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium">{r.subject}</td>
                              <td className="px-6 py-3 text-gray-500">{r.exam}</td>
                              <td className="px-6 py-3 font-medium">{r.score}%</td>
                              <td className={`px-6 py-3 font-bold ${color}`}>{grade}</td>
                              <td className="px-6 py-3 text-gray-400">{r.remarks || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Add Result Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Add Result</h2>
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
                    setForm({ ...form, studentId: "", studentName: "", admissionNumber: "", grade: "" });
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
                  Selected: <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span> — {selectedStudent.grade}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject</option>
                    {Object.entries(SUBJECTS_BY_PATHWAY).map(([pathway, subjects]) => (
                      <optgroup key={pathway} label={pathway}>
                        {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Exam</label>
                  <select
                    required
                    value={form.exam}
                    onChange={(e) => setForm({ ...form, exam: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select exam</option>
                    {EXAMS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Score (%)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 78"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <input
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Remarks (optional)</label>
                <input
                  placeholder="e.g. Excellent performance"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                  {saving ? "Saving..." : "Add Result"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}