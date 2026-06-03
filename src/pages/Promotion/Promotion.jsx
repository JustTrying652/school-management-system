import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";
import { TrendingUp, AlertTriangle, X } from "lucide-react";

const GRADE_ORDER = ["Grade 10", "Grade 11", "Grade 12"];

export default function Promotion() {
  const { toast } = useToast();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    message: "",
    confirmLabel: "Confirm",
    confirmColor: "bg-blue-600 hover:bg-blue-700",
    onConfirm: null,
  });
  const [promotionLog, setPromotionLog] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [classSnap, stuSnap, logSnap] = await Promise.all([
        getDocs(collection(db, "classes")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "promotionLog")),
      ]);
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setPromotionLog(
        logSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  function getNextGrade(currentGrade) {
    const index = GRADE_ORDER.indexOf(currentGrade);
    if (index === -1 || index === GRADE_ORDER.length - 1) return null;
    return GRADE_ORDER[index + 1];
  }

  function getNextClass(currentClass) {
    if (!currentClass) return null;
    const nextGrade = getNextGrade(currentClass.grade);
    if (!nextGrade) return null;
    return classes.find(
      (c) => c.grade === nextGrade && c.stream === currentClass.stream
    ) || null;
  }

  const nextGrade = selectedClass ? getNextGrade(selectedClass.grade) : null;
  const nextClass = selectedClass ? getNextClass(selectedClass) : null;
  const isGrade12 = selectedClass?.grade === "Grade 12";

  function handlePromote() {
    if (!selectedClassId || classStudents.length === 0) return;

    const action = isGrade12 ? "graduate" : "promote";
    const destination = isGrade12
      ? "graduated (removed from active students)"
      : nextClass
      ? `${nextClass.name} (${nextGrade})`
      : `${nextGrade} (no matching class found — grade will be updated, class unassigned)`;

    setConfirmModal({
      open: true,
      message: `This will ${action} ${classStudents.length} student${classStudents.length !== 1 ? "s" : ""} from ${selectedClass.name}. They will be moved to ${destination}. This cannot be undone.`,
      confirmLabel: isGrade12 ? "Graduate" : "Promote",
      confirmColor: isGrade12 ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700",
      onConfirm: async () => {
        setPromoting(true);
        try {
          if (isGrade12) {
            await Promise.all(
              classStudents.map((student) =>
                updateDoc(doc(db, "students", student.id), {
                  status: "Graduated",
                  graduatedAt: new Date(),
                  classId: "",
                  grade: "Grade 12",
                })
              )
            );
          } else {
            await Promise.all(
              classStudents.map((student) =>
                updateDoc(doc(db, "students", student.id), {
                  grade: nextGrade,
                  classId: nextClass ? nextClass.id : "",
                  stream: nextClass ? nextClass.stream : student.stream,
                })
              )
            );
          }

          await addDoc(collection(db, "promotionLog"), {
            fromClass: selectedClass.name,
            fromGrade: selectedClass.grade,
            toGrade: isGrade12 ? "Graduated" : nextGrade,
            toClass: nextClass?.name || (isGrade12 ? "Graduated" : "Unassigned"),
            studentCount: classStudents.length,
            students: classStudents.map((s) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              admissionNumber: s.admissionNumber,
            })),
            promotedBy: "Principal",
            createdAt: new Date(),
          });

          await fetchData();
          setSelectedClassId("");
          toast({
            message: isGrade12
              ? `${classStudents.length} students graduated successfully.`
              : `${classStudents.length} students promoted to ${nextGrade}.`,
          });
        } catch (err) {
          console.error(err);
          toast({ message: "Failed to promote students.", type: "error" });
        } finally {
          setPromoting(false);
          setConfirmModal({ open: false, message: "", confirmLabel: "Confirm", confirmColor: "bg-blue-600 hover:bg-blue-700", onConfirm: null });
        }
      },
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Student Promotion</h1>
        <p className="text-gray-500 text-sm mt-1">Promote students to the next grade at end of year</p>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : (
        <div className="space-y-6">

          {/* Promotion card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Promote a Class</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Class to Promote</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.grade}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClass && (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 flex items-start gap-3 ${
                    isGrade12
                      ? "bg-purple-50 border border-purple-100"
                      : "bg-blue-50 border border-blue-100"
                  }`}>
                    <TrendingUp size={18} className={isGrade12 ? "text-purple-500 shrink-0 mt-0.5" : "text-blue-500 shrink-0 mt-0.5"} />
                    <div>
                      {isGrade12 ? (
                        <>
                          <p className="text-sm font-medium text-purple-700">Grade 12 — Graduation</p>
                          <p className="text-xs text-purple-600 mt-0.5">
                            These students will be marked as graduated and removed from active class lists.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-blue-700">
                            {selectedClass.name} → {nextGrade}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            {nextClass
                              ? `Students will be moved to ${nextClass.name}.`
                              : `No matching class found in ${nextGrade} with stream "${selectedClass.stream}". Students' grade will be updated but class will be unassigned — reassign manually after.`
                            }
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {!isGrade12 && !nextClass && (
                    <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-yellow-700">
                        No class found in {nextGrade} with stream "{selectedClass.stream}". Consider creating it first, or students will need to be manually assigned to a class after promotion.
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      {classStudents.length} student{classStudents.length !== 1 ? "s" : ""} will be affected
                    </p>
                    {classStudents.length === 0 ? (
                      <p className="text-sm text-gray-400">No students in this class.</p>
                    ) : (
                      <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                            <tr>
                              <th className="px-4 py-2.5 font-medium">Adm No.</th>
                              <th className="px-4 py-2.5 font-medium">Name</th>
                              <th className="px-4 py-2.5 font-medium">Current Grade</th>
                              <th className="px-4 py-2.5 font-medium">After Promotion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {classStudents.map((s) => (
                              <tr key={s.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 text-blue-600">{s.admissionNumber}</td>
                                <td className="px-4 py-2.5">{s.firstName} {s.lastName}</td>
                                <td className="px-4 py-2.5">{s.grade}</td>
                                <td className="px-4 py-2.5 font-medium">
                                  {isGrade12 ? (
                                    <span className="text-purple-600">Graduated</span>
                                  ) : (
                                    <span className="text-green-600">{nextGrade}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {classStudents.length > 0 && (
                    <button
                      onClick={handlePromote}
                      disabled={promoting}
                      className={`flex items-center gap-2 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50 ${
                        isGrade12
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      <TrendingUp size={16} />
                      {promoting
                        ? "Processing..."
                        : isGrade12
                        ? `Graduate ${classStudents.length} Students`
                        : `Promote ${classStudents.length} Students to ${nextGrade}`
                      }
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Promotion log */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Promotion History</h2>
            </div>
            {promotionLog.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                No promotions recorded yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-left">
                  <tr>
                    <th className="px-6 py-3 font-medium">From</th>
                    <th className="px-6 py-3 font-medium">To</th>
                    <th className="px-6 py-3 font-medium">Students</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promotionLog.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:underline"
                        >
                          {log.fromClass}
                        </button>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          log.toGrade === "Graduated"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {log.toClass}
                        </span>
                      </td>
                      <td className="px-6 py-3">{log.studentCount} students</td>
                      <td className="px-6 py-3 text-gray-500">
                        {log.createdAt?.seconds
                          ? new Date(log.createdAt.seconds * 1000).toLocaleDateString("en-KE", {
                              year: "numeric", month: "short", day: "numeric"
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Log detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-800">{selectedLog.fromClass}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedLog.toGrade === "Graduated" ? "Graduated" : `Promoted to ${selectedLog.toGrade}`} ·{" "}
                  {selectedLog.createdAt?.seconds
                    ? new Date(selectedLog.createdAt.seconds * 1000).toLocaleDateString("en-KE", {
                        year: "numeric", month: "short", day: "numeric"
                      })
                    : "—"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-xs font-medium text-gray-500 mb-3">
                {selectedLog.students?.length || 0} student{selectedLog.students?.length !== 1 ? "s" : ""}
              </p>
              {!selectedLog.students || selectedLog.students.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No student details recorded.</p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-gray-100 max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-left sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">#</th>
                        <th className="px-4 py-2.5 font-medium">Adm No.</th>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedLog.students.map((s, i) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 text-blue-600 font-medium">{s.admissionNumber}</td>
                          <td className="px-4 py-2.5">{s.name}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              selectedLog.toGrade === "Graduated"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-green-100 text-green-700"
                            }`}>
                              {selectedLog.toGrade === "Graduated" ? "Graduated" : `→ ${selectedLog.toGrade}`}
                            </span>
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

      {confirmModal.open && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ open: false, message: "", confirmLabel: "Confirm", confirmColor: "bg-blue-600 hover:bg-blue-700", onConfirm: null })}
          confirmLabel={confirmModal.confirmLabel || "Confirm"}
          confirmColor={confirmModal.confirmColor || "bg-blue-600 hover:bg-blue-700"}
        />
      )}
    </div>
  );
}