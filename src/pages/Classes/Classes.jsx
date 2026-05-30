import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const emptyForm = {
  name: "",
  grade: "",
  stream: "",
  classTeacherId: "",
  classTeacherName: "",
  capacity: "",
};

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchData() {
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

  useEffect(() => {
    fetchData();
  }, []);

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
      } else {
        await addDoc(collection(db, "classes"), {
          ...form,
          createdAt: new Date(),
        });
      }
      await fetchData();
      closeModal();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      await fetchData();
    } catch (err) {
      console.error(err);
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
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading classes...</div>
        ) : filtered.length === 0 ? (
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
                  <th className="px-6 py-3 font-medium">Capacity</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-blue-600">{cls.name}</td>
                    <td className="px-6 py-3">{cls.grade}</td>
                    <td className="px-6 py-3">{cls.stream}</td>
                    <td className="px-6 py-3">{cls.classTeacherName || "—"}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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
                  placeholder="e.g. Form 1 East"
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
    </div>
  );
}