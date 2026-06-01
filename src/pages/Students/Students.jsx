import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { UserPlus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";

const emptyForm = {
  firstName: "",
  lastName: "",
  admissionNumber: "",
  classId: "",
  grade: "",
  stream: "",
  pathway: "",
  gender: "",
  parentPhone: "",
};

export default function Students() {
  const { toast } = useToast();
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchData() {
    setLoading(true);
    try {
      const [stuSnap, classSnap] = await Promise.all([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "classes")),
      ]);
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(student) {
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber,
      classId: student.classId || "",
      grade: student.grade,
      stream: student.stream || "",
      pathway: student.pathway || "",
      gender: student.gender,
      parentPhone: student.parentPhone || "",
    });
    setEditingId(student.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleClassChange(e) {
    const selectedId = e.target.value;
    const selectedClass = classes.find((c) => c.id === selectedId);
    setForm({
      ...form,
      classId: selectedId,
      grade: selectedClass ? selectedClass.grade : "",
      stream: selectedClass ? selectedClass.stream : "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "students", editingId), form);
        toast({ message: "Student updated successfully." });
      } else {
        await addDoc(collection(db, "students"), { ...form, createdAt: new Date() });
        toast({ message: "Student added successfully." });
      }
      await fetchData();
      closeModal();
    } catch (err) {
      console.error(err);
      toast({ message: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id) {
    setConfirmModal({
      open: true,
      message: "This will permanently delete this student record.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "students", id));
          await fetchData();
          toast({ message: "Student deleted.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to delete student.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  function getClassName(classId) {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : "—";
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q) ||
      s.grade?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students enrolled</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <UserPlus size={16} />
          Add Student
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, admission number or grade..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {search ? "No students match your search." : "No students yet. Add one to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-6 py-3 font-medium">Adm No.</th>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Class</th>
                    <th className="px-6 py-3 font-medium">Grade</th>
                    <th className="px-6 py-3 font-medium">Pathway</th>
                    <th className="px-6 py-3 font-medium">Gender</th>
                    <th className="px-6 py-3 font-medium">Parent Phone</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-blue-600">{student.admissionNumber}</td>
                      <td className="px-6 py-3">{student.firstName} {student.lastName}</td>
                      <td className="px-6 py-3">{getClassName(student.classId)}</td>
                      <td className="px-6 py-3">{student.grade}</td>
                      <td className="px-6 py-3">{student.pathway || "—"}</td>
                      <td className="px-6 py-3">{student.gender}</td>
                      <td className="px-6 py-3">{student.parentPhone || "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="text-gray-400 hover:text-blue-600 transition"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editingId ? "Edit Student" : "Add New Student"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Admission Number</label>
                <input
                  required
                  value={form.admissionNumber}
                  onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
                <select
                  value={form.classId}
                  onChange={handleClassChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select class (optional)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.grade}
                    </option>
                  ))}
                </select>
                {form.classId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Grade and stream auto-filled from class.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select
                    required
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select grade</option>
                    {["Grade 10", "Grade 11", "Grade 12"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stream</label>
                  <input
                    placeholder="e.g. East, West"
                    value={form.stream}
                    onChange={(e) => setForm({ ...form, stream: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pathway</label>
                  <select
                    value={form.pathway}
                    onChange={(e) => setForm({ ...form, pathway: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select pathway</option>
                    <option value="STEM">STEM</option>
                    <option value="Arts & Sports Science">Arts & Sports Science</option>
                    <option value="Social Sciences">Social Sciences</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                  <select
                    required
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Parent Phone</label>
                <input
                  placeholder="e.g. 0712345678"
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Student" : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
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