import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRole } from "../../hooks/useRole";
import { useNavigate } from "react-router-dom";
import { UserPlus, Trash2, Pencil, X } from "lucide-react";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";

const ROLES = ["Principal", "Teacher", "Bursar", "Librarian"];

const ROLE_COLORS = {
  Principal: "bg-purple-100 text-purple-700",
  Teacher: "bg-blue-100 text-blue-700",
  Bursar: "bg-yellow-100 text-yellow-700",
  Librarian: "bg-green-100 text-green-700",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "",
};

export default function UserManagement() {
  const { createAdminUser, currentUser } = useAuth();
  const { isPrincipal } = useRole();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });

  // Redirect non-principals
  useEffect(() => {
    if (!isPrincipal) navigate("/");
  }, [isPrincipal]);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "admins"));
      setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAdmins(); }, []);

  function openAddModal() {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  }

  function openEditModal(admin) {
    setForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      password: "",
      role: admin.role,
    });
    setEditingId(admin.id);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "admins", editingId), {
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
        toast({ message: "User updated successfully." });
      } else {
        await createAdminUser(form.email, form.password, {
          firstName: form.firstName,
          lastName: form.lastName,
          role: form.role,
        });
        toast({ message: "User created successfully." });
      }
      await fetchAdmins();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      const msg = err.code === "auth/email-already-in-use"
        ? "Email already in use."
        : err.code === "auth/weak-password"
        ? "Password must be at least 6 characters."
        : "Something went wrong.";
      toast({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(admin) {
    if (admin.id === currentUser.uid) {
      toast({ message: "You cannot delete your own account.", type: "error" });
      return;
    }
    setConfirmModal({
      open: true,
      message: `This will remove ${admin.firstName} ${admin.lastName}'s admin access.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "admins", admin.id));
          await fetchAdmins();
          toast({ message: "User removed.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to remove user.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage admin accounts and roles</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {admins.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-left">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">
                      {admin.firstName} {admin.lastName}
                      {admin.id === currentUser.uid && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{admin.email}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[admin.role] || "bg-gray-100 text-gray-600"}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="text-gray-400 hover:text-blue-600 transition"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin)}
                          disabled={admin.id === currentUser.uid}
                          className="text-gray-400 hover:text-red-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editingId ? "Edit User" : "Add New User"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
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

              {!editingId && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <input
                      required
                      type="password"
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
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
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update User" : "Create User"}
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