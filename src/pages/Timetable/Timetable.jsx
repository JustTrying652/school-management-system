import { useEffect, useState } from "react";
import {
  collection, getDocs, doc, setDoc, getDoc
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useToast } from "../../context/ToastContext";
import { X, Pencil } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_TIMES = {
  1: "8:00–8:40",
  2: "8:40–9:20",
  3: "9:20–10:00",
  4: "10:20–11:00",
  5: "11:00–11:40",
  6: "11:40–12:20",
  7: "13:00–13:40",
  8: "13:40–14:20",
};

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

const emptySlot = { subject: "", teacherId: "", teacherName: "" };

export default function Timetable() {
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [slots, setSlots] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeCell, setActiveCell] = useState(null); // { day, period }
  const [cellForm, setCellForm] = useState(emptySlot);

  async function fetchBase() {
    setLoading(true);
    try {
      const [classSnap, teacherSnap] = await Promise.all([
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "teachers")),
      ]);
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTeachers(teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimetable(cls) {
    try {
      const ref = doc(db, "timetables", cls.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSlots(snap.data().slots || {});
      } else {
        setSlots({});
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { fetchBase(); }, []);

  async function handleClassChange(cls) {
    setSelectedClass(cls);
    await fetchTimetable(cls);
  }

  function getSlot(day, period) {
    return slots[`${day}_${period}`] || null;
  }

  function openCellModal(day, period) {
    setActiveCell({ day, period });
    const existing = getSlot(day, period);
    setCellForm(existing || emptySlot);
    setShowModal(true);
  }

  function handleTeacherChange(e) {
    const id = e.target.value;
    const teacher = teachers.find((t) => t.id === id);
    setCellForm({
      ...cellForm,
      teacherId: id,
      teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "",
    });
  }

  function handleClearSlot() {
    const key = `${activeCell.day}_${activeCell.period}`;
    const updated = { ...slots };
    delete updated[key];
    setSlots(updated);
    setShowModal(false);
  }

  function handleSaveCell(e) {
    e.preventDefault();
    const key = `${activeCell.day}_${activeCell.period}`;
    setSlots({ ...slots, [key]: cellForm });
    setShowModal(false);
  }

  async function handleSaveTimetable() {
    if (!selectedClass) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "timetables", selectedClass.id), {
        classId: selectedClass.id,
        className: selectedClass.name,
        grade: selectedClass.grade,
        stream: selectedClass.stream,
        slots,
        updatedAt: new Date(),
      });
      toast({ message: "Timetable saved successfully." });
    } catch (err) {
      console.error(err);
      toast({ message: "Failed to save timetable.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">Manage weekly class schedules</p>
        </div>
        {selectedClass && (
          <button
            onClick={handleSaveTimetable}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Timetable"}
          </button>
        )}
      </div>

      {/* Class selector */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-2">Select Class</label>
        {loading ? (
          <div className="h-9 bg-gray-100 rounded-lg animate-pulse w-64" />
        ) : classes.length === 0 ? (
          <p className="text-sm text-gray-400">No classes found. Add classes first.</p>
        ) : (
          <select
            value={selectedClass?.id || ""}
            onChange={(e) => {
              const cls = classes.find((c) => c.id === e.target.value);
              if (cls) handleClassChange(cls);
            }}
            className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          >
            <option value="">Select a class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.grade}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Timetable grid */}
      {selectedClass && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">{selectedClass.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedClass.grade} · Click any cell to assign a subject
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-28">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-4 py-3 text-left font-medium">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PERIODS.map((period) => (
                  <tr key={period} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">Period {period}</p>
                      <p className="text-xs text-gray-400">{PERIOD_TIMES[period]}</p>
                    </td>
                    {DAYS.map((day) => {
                      const slot = getSlot(day, period);
                      return (
                        <td key={day} className="px-4 py-3">
                          <button
                            onClick={() => openCellModal(day, period)}
                            className={`w-full text-left rounded-xl px-3 py-2 transition border ${
                              slot
                                ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                                : "bg-gray-50 border-gray-200 hover:bg-gray-100 border-dashed"
                            }`}
                          >
                            {slot ? (
                              <>
                                <p className="font-medium text-blue-700 text-xs">{slot.subject}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{slot.teacherName || "—"}</p>
                              </>
                            ) : (
                              <p className="text-xs text-gray-400 flex items-center gap-1">
                                <Pencil size={10} /> Add
                              </p>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cell edit modal */}
      {showModal && activeCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {activeCell.day} — Period {activeCell.period}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCell} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <select
                  required
                  value={cellForm.subject}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select subject</option>
                  {Object.entries(SUBJECTS_BY_PATHWAY).map(([pathway, subjects]) => (
                    <optgroup key={pathway} label={pathway}>
                      {subjects.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Teacher (optional)</label>
                <select
                  value={cellForm.teacherId}
                  onChange={handleTeacherChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                {getSlot(activeCell.day, activeCell.period) && (
                  <button
                    type="button"
                    onClick={handleClearSlot}
                    className="px-4 py-2 text-sm text-red-500 hover:text-red-700 transition"
                  >
                    Clear slot
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}