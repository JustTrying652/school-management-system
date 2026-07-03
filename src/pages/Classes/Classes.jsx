import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Plus, Pencil, Trash2, X, ArrowRightLeft } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";

const emptyForm = {
  name: "",
  grade: "",
  stream: "",
  classTeacherId: "",
  classTeacherName: "",
  capacity: "",
};

export default function Classes() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // Transfer state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStudent, setTransferStudent] = useState(null);
  const [transferClassId, setTransferClassId] = useState("");
  const [transferring, setTransferring] = useState(false);

  const classStudents = selectedClass
    ? students.filter((s) => s.classId === selectedClass.id)
    : [];

  async function fetchData() {
    setLoading(true);
    try {
      const [classSnap, teacherSnap, stuSnap] = await Promise.all([
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "teachers")),
        getDocs(collection(db, "students")),
      ]);
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTeachers(teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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

  function openEditModal(cls) {
    setForm({
      name: cls.name,
      grade: cls.grade,
      stream: cls.stream,
      classTeacherId: cls.classTeacherId,
      classTeacherName: cls.classTeacherName,
      capacity: cls.capacity,
    });
    setEditingId(cls.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleTeacherChange(e) {
    const selectedId = e.target.value;
    const selectedTeacher = teachers.find((t) => t.id === selectedId);
    setForm({
      ...form,
      classTeacherId: selectedId,
      classTeacherName: selectedTeacher
        ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}`
        : "",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "classes", editingId), form);
        toast({ message: "Class updated successfully." });
      } else {
        await addDoc(collection(db, "classes"), { ...form, createdAt: new Date() });
        toast({ message: "Class added successfully." });
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
      message: "This will permanently delete this class record.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "classes", id));
          await fetchData();
          toast({ message: "Class deleted.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to delete class.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  function openTransferModal(student) {
    setTransferStudent(student);
    setTransferClassId("");
    setShowTransferModal(true);
  }

  async function handleTransfer(e) {
    e.preventDefault();
    if (!transferClassId) return;
    setTransferring(true);
    try {
      const newClass = classes.find((c) => c.id === transferClassId);
      await updateDoc(doc(db, "students", transferStudent.id), {
        classId: transferClassId,
        grade: newClass.grade,
        stream: newClass.stream,
      });
      await fetchData();
      // Update selected class students list
      setShowTransferModal(false);
      toast({ message: `${transferStudent.firstName} transferred to ${newClass.name}.` });
    } catch (err) {
      toast({ message: "Failed to transfer student.", type: "error" });
    } finally {
      setTransferring(false);
    }
  }

  const filtered = classes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.grade?.toLowerCase().includes(q) ||
      c.stream?.toLowerCase().includes(q) ||
      c.classTeacherName?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Classes</h1>
          <p className="text-gray-500 text-sm mt-1">{classes.length} classes registered</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          Add Class
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, grade, stream or teacher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {search ? "No classes match your search." : "No classes yet. Add one to get started."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-6 py-3 font-medium">Class Name</th>
                    <th className="px-6 py-3 font-medium">Grade</th>
                    <th className="px-6 py-3 font-medium">Stream</th>
                    <th className="px-6 py-3 font-medium">Class Teacher</th>
                    <th className="px-6 py-3 font-medium">Students</th>
                    <th className="px-6 py-3 font-medium">Capacity</th>
                    <th className="px-6 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((cls) => {
                    const count = students.filter((s) => s.classId === cls.id).length;
                    return (
                      <tr key={cls.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 font-medium text-blue-600">
                          <button
                            onClick={() => setSelectedClass(cls)}
                            className="hover:underline"
                          >
                            {cls.name}
                          </button>
                        </td>
                        <td className="px-6 py-3">{cls.grade}</td>
                        <td className="px-6 py-3">{cls.stream || "—"}</td>
                        <td className="px-6 py-3">{cls.classTeacherName || "—"}</td>
                        <td className="px-6 py-3">
                          <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">
                            {count} student{count !== 1 ? "s" : ""}
                          </span>
                        </td>
                        <td className="px-6 py-3">{cls.capacity || "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(cls)}
                              className="text-gray-400 hover:text-blue-600 transition"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(cls.id)}
                              className="text-gray-400 hover:text-red-500 transition"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                {editingId ? "Edit Class" : "Add New Class"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class Name</label>
                <input
                  required
                  placeholder="e.g. Grade 10 East"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                    placeholder="e.g. East, West, North"
                    value={form.stream}
                    onChange={(e) => setForm({ ...form, stream: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Class Teacher</label>
                <select
                  value={form.classTeacherId}
                  onChange={handleTeacherChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select teacher (optional)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
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
                  {saving ? "Saving..." : editingId ? "Update Class" : "Add Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Class Students Modal */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-800">{selectedClass.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedClass.grade} · Class Teacher: {selectedClass.classTeacherName || "—"}
                </p>
              </div>
              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-gray-500 mb-3">
                {classStudents.length} student{classStudents.length !== 1 ? "s" : ""} enrolled
              </p>
              {classStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No students assigned to this class yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-left">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Adm No.</th>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Pathway</th>
                        <th className="px-4 py-2.5 font-medium">Transfer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-blue-600 font-medium">{s.admissionNumber}</td>
                          <td className="px-4 py-2.5">{s.firstName} {s.lastName}</td>
                          <td className="px-4 py-2.5">{s.pathway || "—"}</td>
                          <td className="px-4 py-2.5">
                            <button
                              onClick={() => openTransferModal(s)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition"
                            >
                              <ArrowRightLeft size={13} />
                              Transfer
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
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && transferStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Transfer Student</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm text-blue-700">
                Moving: <span className="font-medium">{transferStudent.firstName} {transferStudent.lastName}</span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Transfer to Class</label>
                <select
                  required
                  value={transferClassId}
                  onChange={(e) => setTransferClassId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new class</option>
                  {classes
                    .filter((c) => c.id !== selectedClass?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.grade}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring || !transferClassId}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {transferring ? "Transferring..." : "Transfer"}
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