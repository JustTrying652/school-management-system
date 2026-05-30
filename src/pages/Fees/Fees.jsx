import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { Plus, Pencil, Trash2, X } from "lucide-react";

const GRADES = ["Grade 10", "Grade 11", "Grade 12"];
const PAYMENT_METHODS = ["M-Pesa", "Bank Transfer", "Cash"];
const CURRENT_YEAR = new Date().getFullYear().toString();

const emptyStructureForm = { grade: "", amount: "", year: CURRENT_YEAR, description: "" };
const emptyPaymentForm = {
  studentId: "", studentName: "", admissionNumber: "", grade: "",
  amount: "", method: "", reference: "", date: "", notes: "",
};

export default function Fees() {
  const [activeTab, setActiveTab] = useState("structures");

  // Fee structures
  const [structures, setStructures] = useState([]);
  const [structureForm, setStructureForm] = useState(emptyStructureForm);
  const [editingStructureId, setEditingStructureId] = useState(null);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);

  // Payments
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    setLoading(true);
    try {
      const [structSnap, paySnap, stuSnap] = await Promise.all([
        getDocs(collection(db, "feeStructures")),
        getDocs(collection(db, "feePayments")),
        getDocs(collection(db, "students")),
      ]);
      setStructures(structSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPayments(paySnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  // ── Fee Structure handlers ──────────────────────────────

  function openAddStructureModal() {
    setStructureForm(emptyStructureForm);
    setEditingStructureId(null);
    setShowStructureModal(true);
  }

  function openEditStructureModal(s) {
    setStructureForm({ grade: s.grade, amount: s.amount, year: s.year, description: s.description });
    setEditingStructureId(s.id);
    setShowStructureModal(true);
  }

  async function handleStructureSubmit(e) {
    e.preventDefault();
    setSavingStructure(true);
    try {
      if (editingStructureId) {
        await updateDoc(doc(db, "feeStructures", editingStructureId), structureForm);
      } else {
        await addDoc(collection(db, "feeStructures"), { ...structureForm, createdAt: new Date() });
      }
      await fetchAll();
      setShowStructureModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingStructure(false);
    }
  }

  async function handleDeleteStructure(id) {
    if (!window.confirm("Delete this fee structure?")) return;
    await deleteDoc(doc(db, "feeStructures", id));
    await fetchAll();
  }

  // ── Payment handlers ────────────────────────────────────

  function openAddPaymentModal() {
    setPaymentForm(emptyPaymentForm);
    setSelectedStudent(null);
    setStudentSearch("");
    setShowPaymentModal(true);
  }

  function selectStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    setPaymentForm({
      ...paymentForm,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      grade: student.grade,
    });
  }

  async function handlePaymentSubmit(e) {
    e.preventDefault();
    if (!paymentForm.studentId) return alert("Please select a student.");
    setSavingPayment(true);
    try {
      await addDoc(collection(db, "feePayments"), {
        ...paymentForm,
        amount: Number(paymentForm.amount),
        createdAt: new Date(),
      });
      await fetchAll();
      setShowPaymentModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment(id) {
    if (!window.confirm("Delete this payment record?")) return;
    await deleteDoc(doc(db, "feePayments", id));
    await fetchAll();
  }

  // ── Balance helpers ─────────────────────────────────────

  function getExpectedFee(grade) {
    const structure = structures.find(
      (s) => s.grade === grade && s.year === CURRENT_YEAR
    );
    return structure ? Number(structure.amount) : 0;
  }

  function getTotalPaid(studentId) {
    return payments
      .filter((p) => p.studentId === studentId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function getBalance(student) {
    const expected = getExpectedFee(student.grade);
    const paid = getTotalPaid(student.id);
    return expected - paid;
  }

  // ── Filtered lists ──────────────────────────────────────

  const filteredStudentSearch = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    return (
      s.firstName?.toLowerCase().includes(q) ||
      s.lastName?.toLowerCase().includes(q) ||
      s.admissionNumber?.toLowerCase().includes(q)
    );
  }).slice(0, 6);

  const filteredPayments = payments.filter((p) => {
    const q = paymentSearch.toLowerCase();
    return (
      p.studentName?.toLowerCase().includes(q) ||
      p.admissionNumber?.toLowerCase().includes(q) ||
      p.method?.toLowerCase().includes(q) ||
      p.reference?.toLowerCase().includes(q)
    );
  });

  // ── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fees</h1>
          <p className="text-gray-500 text-sm mt-1">Manage fee structures and payment records</p>
        </div>
        <button
          onClick={activeTab === "structures" ? openAddStructureModal : openAddPaymentModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
        >
          <Plus size={16} />
          {activeTab === "structures" ? "Add Fee Structure" : "Record Payment"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {["structures", "payments", "balances"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "structures" ? "Fee Structures" : tab === "payments" ? "Payment Records" : "Balances"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
      ) : (
        <>
          {/* ── Fee Structures Tab ── */}
          {activeTab === "structures" && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {structures.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  No fee structures yet. Add one to get started.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-left">
                    <tr>
                      <th className="px-6 py-3 font-medium">Grade</th>
                      <th className="px-6 py-3 font-medium">Year</th>
                      <th className="px-6 py-3 font-medium">Annual Fee (KES)</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {structures.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-blue-600">{s.grade}</td>
                        <td className="px-6 py-3">{s.year}</td>
                        <td className="px-6 py-3">KES {Number(s.amount).toLocaleString()}</td>
                        <td className="px-6 py-3 text-gray-500">{s.description || "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditStructureModal(s)} className="text-gray-400 hover:text-blue-600">
                              <Pencil size={15} />
                            </button>
                            <button onClick={() => handleDeleteStructure(s.id)} className="text-gray-400 hover:text-red-500">
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

          {/* ── Payment Records Tab ── */}
          {activeTab === "payments" && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by name, admission no, method or reference..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full sm:w-96 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    {paymentSearch ? "No payments match your search." : "No payment records yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Adm No.</th>
                          <th className="px-6 py-3 font-medium">Grade</th>
                          <th className="px-6 py-3 font-medium">Amount (KES)</th>
                          <th className="px-6 py-3 font-medium">Method</th>
                          <th className="px-6 py-3 font-medium">Reference</th>
                          <th className="px-6 py-3 font-medium">Date</th>
                          <th className="px-6 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium">{p.studentName}</td>
                            <td className="px-6 py-3 text-blue-600">{p.admissionNumber}</td>
                            <td className="px-6 py-3">{p.grade}</td>
                            <td className="px-6 py-3 text-green-600 font-medium">
                              KES {Number(p.amount).toLocaleString()}
                            </td>
                            <td className="px-6 py-3">{p.method}</td>
                            <td className="px-6 py-3 text-gray-500">{p.reference || "—"}</td>
                            <td className="px-6 py-3">{p.date}</td>
                            <td className="px-6 py-3">
                              <button onClick={() => handleDeletePayment(p.id)} className="text-gray-400 hover:text-red-500">
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

          {/* ── Balances Tab ── */}
          {activeTab === "balances" && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {students.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No students found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-left">
                      <tr>
                        <th className="px-6 py-3 font-medium">Student</th>
                        <th className="px-6 py-3 font-medium">Adm No.</th>
                        <th className="px-6 py-3 font-medium">Grade</th>
                        <th className="px-6 py-3 font-medium">Expected (KES)</th>
                        <th className="px-6 py-3 font-medium">Paid (KES)</th>
                        <th className="px-6 py-3 font-medium">Balance (KES)</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.map((student) => {
                        const expected = getExpectedFee(student.grade);
                        const paid = getTotalPaid(student.id);
                        const balance = expected - paid;
                        return (
                          <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium">
                              {student.firstName} {student.lastName}
                            </td>
                            <td className="px-6 py-3 text-blue-600">{student.admissionNumber}</td>
                            <td className="px-6 py-3">{student.grade}</td>
                            <td className="px-6 py-3">
                              {expected ? `KES ${expected.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-6 py-3 text-green-600">
                              KES {paid.toLocaleString()}
                            </td>
                            <td className={`px-6 py-3 font-medium ${balance > 0 ? "text-red-500" : "text-green-600"}`}>
                              {expected ? `KES ${balance.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-6 py-3">
                              {!expected ? (
                                <span className="text-xs text-gray-400">No structure</span>
                              ) : balance <= 0 ? (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Cleared</span>
                              ) : paid > 0 ? (
                                <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">Partial</span>
                              ) : (
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Unpaid</span>
                              )}
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
        </>
      )}

      {/* ── Fee Structure Modal ── */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editingStructureId ? "Edit Fee Structure" : "Add Fee Structure"}
              </h2>
              <button onClick={() => setShowStructureModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleStructureSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select
                    required
                    value={structureForm.grade}
                    onChange={(e) => setStructureForm({ ...structureForm, grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <input
                    required
                    value={structureForm.year}
                    onChange={(e) => setStructureForm({ ...structureForm, year: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Annual Fee Amount (KES)</label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 45000"
                  value={structureForm.amount}
                  onChange={(e) => setStructureForm({ ...structureForm, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <input
                  placeholder="e.g. Includes tuition, boarding"
                  value={structureForm.description}
                  onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStructureModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={savingStructure} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                  {savingStructure ? "Saving..." : editingStructureId ? "Update" : "Add Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">

              {/* Student search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
                <input
                  placeholder="Type name or admission number..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setSelectedStudent(null);
                    setPaymentForm({ ...paymentForm, studentId: "", studentName: "", admissionNumber: "", grade: "" });
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
                  Selected: <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span> — {selectedStudent.grade} —
                  Balance: <span className="font-medium">KES {getBalance(selectedStudent).toLocaleString()}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Amount (KES)</label>
                  <input
                    required
                    type="number"
                    placeholder="e.g. 15000"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                  <select
                    required
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select method</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reference No.</label>
                  <input
                    placeholder="e.g. QJK7TY123"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                  <input
                    required
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                <input
                  placeholder="Any additional notes..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={savingPayment} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                  {savingPayment ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}