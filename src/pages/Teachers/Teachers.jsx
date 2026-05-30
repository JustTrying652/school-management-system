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
  staffNumber: "",
  subject: "",
  phone: "",
  email: "",
  gender: "",
};

export default function Teachers() {
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });
  const { toast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function fetchTeachers() {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "teachers"));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTeachers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(teacher) {
    setForm({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      staffNumber: teacher.staffNumber,
      subject: teacher.subject,
      phone: teacher.phone,
      email: teacher.email,
      gender: teacher.gender,
    });
    setEditingId(teacher.id);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
  if (editingId) {
    await updateDoc(doc(db, "teachers", editingId), form);
    toast({ message: "Teacher updated successfully." });
  } else {
    await addDoc(collection(db, "teachers"), { ...form, createdAt: new Date() });
    toast({ message: "Teacher added successfully." });
  }
  await fetchTeachers();
  closeModal();
} catch (err) {
  console.error(err);
  toast({ message: "Something went wrong. Please try again.", type: "error" });
}
  }

  function handleDelete(id) {
  setConfirmModal({
    open: true,
    message: "This will permanently delete this teacher record.",
    onConfirm: async () => {
      try {
        await deleteDoc(doc(db, "teachers", id));
        await fetchTeachers();
        toast({ message: "Teacher deleted.", type: "warning" });
      } catch (err) {
        toast({ message: "Failed to delete teacher.", type: "error" });
      } finally {
        setConfirmModal({ open: false, message: "", onConfirm: null });
      }
    },
  });
}

  const filtered = teachers.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.firstName?.toLowerCase().includes(q) ||
      t.lastName?.toLowerCase().includes(q) ||
      t.staffNumber?.toLowerCase().includes(q) ||
      t.subject?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Teachers</h1>
          <p className="text-gray-500 text-sm mt-1">{teachers.length} teachers on staff</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <UserPlus size={16} />
          Add Teacher
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, staff number or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {search ? "No teachers match your search." : "No teachers yet. Add one to get started."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Staff No.</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Subject</th>
                  <th className="px-6 py-3 font-medium">Gender</th>
                  <th className="px-6 py-3 font-medium">Phone</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-blue-600">{teacher.staffNumber}</td>
                    <td className="px-6 py-3">{teacher.firstName} {teacher.lastName}</td>
                    <td className="px-6 py-3">{teacher.subject}</td>
                    <td className="px-6 py-3">{teacher.gender}</td>
                    <td className="px-6 py-3">{teacher.phone}</td>
                    <td className="px-6 py-3">{teacher.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="text-gray-400 hover:text-blue-600 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
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
                {editingId ? "Edit Teacher" : "Add New Teacher"}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Staff Number</label>
                  <input
                    required
                    value={form.staffNumber}
                    onChange={(e) => setForm({ ...form, staffNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input
                  required
                  placeholder="e.g. Mathematics, English"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    placeholder="e.g. 0712345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  {saving ? "Saving..." : editingId ? "Update Teacher" : "Add Teacher"}
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