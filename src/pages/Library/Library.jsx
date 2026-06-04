import { useEffect, useState } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  deleteDoc, runTransaction
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useToast } from "../../context/ToastContext";
import { useRole } from "../../hooks/useRole";
import ConfirmModal from "../../components/ConfirmModal";
import TableSkeleton from "../../components/TableSkeleton";
import { Plus, Pencil, Trash2, X, BookOpen, RotateCcw } from "lucide-react";

const GRADES = ["Grade 10", "Grade 11", "Grade 12", "All Grades"];

const emptyBookForm = {
  bookNumber: "",
  title: "",
  subject: "",
  grade: "",
  totalCopies: "",
};

const emptyIssueForm = {
  studentId: "",
  studentName: "",
  admissionNumber: "",
  classId: "",
  className: "",
  grade: "",
  bookId: "",
  bookNumber: "",
  bookTitle: "",
  issuedDate: new Date().toISOString().split("T")[0],
  dueDate: "",
};

export default function Library() {
  const { toast } = useToast();
  const { role } = useRole();
  const isReadOnly = role === "Teacher";

  const [activeTab, setActiveTab] = useState("catalogue");
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [returning, setReturning] = useState(false);
  // Book modal
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookForm, setBookForm] = useState(emptyBookForm);
  const [editingBookId, setEditingBookId] = useState(null);
  const [savingBook, setSavingBook] = useState(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [savingIssue, setSavingIssue] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

  // Filters
  const [filterGrade, setFilterGrade] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchIssues, setSearchIssues] = useState("");

  const [confirmModal, setConfirmModal] = useState({ open: false, message: "", onConfirm: null });

  async function fetchData() {
    setLoading(true);
    try {
      const [bookSnap, issueSnap, stuSnap, classSnap] = await Promise.all([
        getDocs(collection(db, "books")),
        getDocs(collection(db, "bookIssues")),
        getDocs(collection(db, "students")),
        getDocs(collection(db, "classes")),
      ]);
      setBooks(bookSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIssues(issueSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.issuedDate?.localeCompare(a.issuedDate)));
      setStudents(stuSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setClasses(classSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Check overdue on load
  useEffect(() => {
    if (issues.length === 0) return;
    const today = new Date().toISOString().split("T")[0];
    const overdueIssues = issues.filter(
      (i) => i.status === "issued" && i.dueDate < today
    );
    overdueIssues.forEach(async (issue) => {
      await updateDoc(doc(db, "bookIssues", issue.id), { status: "overdue" });
    });
  }, [issues]);

  // ── Book CRUD ───────────────────────────────────────────

  function openAddBookModal() {
    setBookForm(emptyBookForm);
    setEditingBookId(null);
    setShowBookModal(true);
  }

  function openEditBookModal(book) {
    setBookForm({
      bookNumber: book.bookNumber,
      title: book.title,
      subject: book.subject,
      grade: book.grade,
      totalCopies: book.totalCopies,
    });
    setEditingBookId(book.id);
    setShowBookModal(true);
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    setSavingBook(true);
    try {
      if (editingBookId) {
        const book = books.find((b) => b.id === editingBookId);
        const diff = Number(bookForm.totalCopies) - Number(book.totalCopies);
        await updateDoc(doc(db, "books", editingBookId), {
          ...bookForm,
          totalCopies: Number(bookForm.totalCopies),
          availableCopies: Math.max(0, (book.availableCopies || 0) + diff),
        });
        toast({ message: "Book updated successfully." });
      } else {
        await addDoc(collection(db, "books"), {
          ...bookForm,
          totalCopies: Number(bookForm.totalCopies),
          availableCopies: Number(bookForm.totalCopies),
          createdAt: new Date(),
        });
        toast({ message: "Book added successfully." });
      }
      await fetchData();
      setShowBookModal(false);
    } catch (err) {
      console.error(err);
      toast({ message: "Something went wrong.", type: "error" });
    } finally {
      setSavingBook(false);
    }
  }

  function handleDeleteBook(id) {
    const book = books.find((b) => b.id === id);
    const hasActiveIssues = issues.some(
      (i) => i.bookId === id && i.status !== "returned"
    );
    if (hasActiveIssues) {
      toast({ message: "Cannot delete a book with active issues. Return all copies first.", type: "error" });
      return;
    }
    setConfirmModal({
      open: true,
      message: `This will permanently delete "${book.title}" from the catalogue.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "books", id));
          await fetchData();
          toast({ message: "Book deleted.", type: "warning" });
        } catch (err) {
          toast({ message: "Failed to delete book.", type: "error" });
        } finally {
          setConfirmModal({ open: false, message: "", onConfirm: null });
        }
      },
    });
  }

  // ── Issue/Return ────────────────────────────────────────

  function openIssueModal() {
    setIssueForm(emptyIssueForm);
    setSelectedStudent(null);
    setSelectedBook(null);
    setStudentSearch("");
    setBookSearch("");
    setShowIssueModal(true);
  }

  function selectStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    const cls = classes.find((c) => c.id === student.classId);
    setIssueForm({
      ...issueForm,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      classId: student.classId || "",
      className: cls?.name || "",
      grade: student.grade,
    });
  }

  function selectBook(book) {
    setSelectedBook(book);
    setBookSearch(`${book.title} (${book.bookNumber})`);
    setIssueForm({
      ...issueForm,
      bookId: book.id,
      bookNumber: book.bookNumber,
      bookTitle: book.title,
    });
  }

  async function handleIssueSubmit(e) {
    e.preventDefault();
    if (!issueForm.studentId) return alert("Please select a student.");
    if (!issueForm.bookId) return alert("Please select a book.");
    if (!issueForm.dueDate) return alert("Please set a due date.");

    const book = books.find((b) => b.id === issueForm.bookId);
    if (!book || book.availableCopies <= 0) {
      toast({ message: "No copies available for this book.", type: "error" });
      return;
    }

    setSavingIssue(true);
    try {
      await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, "books", issueForm.bookId);
        const bookSnap = await transaction.get(bookRef);
        const currentAvailable = bookSnap.data().availableCopies;
        if (currentAvailable <= 0) throw new Error("No copies available.");
        transaction.update(bookRef, { availableCopies: currentAvailable - 1 });
        const issueRef = doc(collection(db, "bookIssues"));
        transaction.set(issueRef, {
          ...issueForm,
          status: "issued",
          returnedDate: null,
          createdAt: new Date(),
        });
      });
      await fetchData();
      setShowIssueModal(false);
      toast({ message: `"${issueForm.bookTitle}" issued to ${issueForm.studentName}.` });
    } catch (err) {
      console.error(err);
      toast({ message: err.message || "Failed to issue book.", type: "error" });
    } finally {
      setSavingIssue(false);
    }
  }

  async function handleReturn(issue) {
  setConfirmModal({
    open: true,
    message: `Mark "${issue.bookTitle}" as returned by ${issue.studentName}?`,
    confirmLabel: "Return",
    confirmColor: "bg-green-600 hover:bg-green-700",
    onConfirm: async () => {
      setReturning(true);
      try {
        await runTransaction(db, async (transaction) => {
          const bookRef = doc(db, "books", issue.bookId);
          const bookSnap = await transaction.get(bookRef);
          const currentAvailable = bookSnap.data().availableCopies;
          transaction.update(bookRef, { availableCopies: currentAvailable + 1 });
          transaction.update(doc(db, "bookIssues", issue.id), {
            status: "returned",
            returnedDate: new Date().toISOString().split("T")[0],
          });
        });
        await fetchData();
        toast({ message: `"${issue.bookTitle}" returned successfully.` });
      } catch (err) {
        toast({ message: "Failed to process return.", type: "error" });
      } finally {
        setReturning(false);
        setConfirmModal({ open: false, message: "", onConfirm: null });
      }
    },
  });
}

  // ── Filtered data ───────────────────────────────────────

  const filteredBooks = books.filter((b) => {
    const q = bookSearch.toLowerCase();
    return (
      (!filterGrade || b.grade === filterGrade) &&
      (!q || b.title?.toLowerCase().includes(q) || b.bookNumber?.toLowerCase().includes(q))
    );
  });

  const filteredIssues = issues.filter((i) => {
    const q = searchIssues.toLowerCase();
    return (
      (!filterClass || i.classId === filterClass) &&
      (!filterStatus || i.status === filterStatus) &&
      (!q ||
        i.studentName?.toLowerCase().includes(q) ||
        i.admissionNumber?.toLowerCase().includes(q) ||
        i.bookTitle?.toLowerCase().includes(q) ||
        i.bookNumber?.toLowerCase().includes(q))
    );
  });

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

  const filteredBookSearch = books
    .filter((b) => {
      const q = bookSearch.toLowerCase();
      return (
        b.title?.toLowerCase().includes(q) ||
        b.bookNumber?.toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  const overdueCount = issues.filter((i) => i.status === "overdue").length;
  const issuedCount = issues.filter((i) => i.status === "issued" || i.status === "overdue").length;

  function getStatusStyle(status) {
    if (status === "returned") return "bg-green-100 text-green-700";
    if (status === "overdue") return "bg-red-100 text-red-600";
    return "bg-blue-100 text-blue-700";
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Library</h1>
          <p className="text-gray-500 text-sm mt-1">Manage books and student issues</p>
        </div>
        {!isReadOnly && activeTab === "catalogue" && (
          <button
            onClick={openAddBookModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <Plus size={16} />
            Add Book
          </button>
        )}
        {!isReadOnly && activeTab === "issues" && (
          <button
            onClick={openIssueModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
          >
            <BookOpen size={16} />
            Issue Book
          </button>
        )}
      </div>

      {/* Summary badges */}
      {!loading && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="bg-white rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Total Books</span>
            <span className="font-bold text-gray-800">{books.length}</span>
          </div>
          <div className="bg-white rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Currently Issued</span>
            <span className="font-bold text-blue-600">{issuedCount}</span>
          </div>
          {overdueCount > 0 && (
            <div className="bg-red-50 rounded-xl shadow-sm px-4 py-2.5 flex items-center gap-2 text-sm border border-red-100">
              <span className="text-red-500">Overdue</span>
              <span className="font-bold text-red-600">{overdueCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {["catalogue", "issues", "reports"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "catalogue" ? "Book Catalogue" : tab === "issues" ? "Issues & Returns" : "Reports"}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <>
          {/* ── Catalogue Tab ── */}
          {activeTab === "catalogue" && (
            <div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by title or book number..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="w-full sm:w-80 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filteredBooks.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    {bookSearch ? "No books match your search." : "No books in catalogue yet."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Book No.</th>
                          <th className="px-6 py-3 font-medium">Title</th>
                          <th className="px-6 py-3 font-medium">Subject</th>
                          <th className="px-6 py-3 font-medium">Grade</th>
                          <th className="px-6 py-3 font-medium">Total</th>
                          <th className="px-6 py-3 font-medium">Available</th>
                          <th className="px-6 py-3 font-medium">Issued</th>
                          {!isReadOnly && <th className="px-6 py-3 font-medium">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredBooks.map((book) => {
                          const issued = Number(book.totalCopies) - Number(book.availableCopies);
                          return (
                            <tr key={book.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3 font-medium text-blue-600">{book.bookNumber}</td>
                              <td className="px-6 py-3 font-medium">{book.title}</td>
                              <td className="px-6 py-3">{book.subject}</td>
                              <td className="px-6 py-3">{book.grade}</td>
                              <td className="px-6 py-3">{book.totalCopies}</td>
                              <td className="px-6 py-3">
                                <span className={`font-medium ${book.availableCopies === 0 ? "text-red-500" : "text-green-600"}`}>
                                  {book.availableCopies}
                                </span>
                              </td>
                              <td className="px-6 py-3">{issued}</td>
                              {!isReadOnly && (
                                <td className="px-6 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => openEditBookModal(book)}
                                      className="text-gray-400 hover:text-blue-600 transition"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteBook(book.id)}
                                      className="text-gray-400 hover:text-red-500 transition"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              )}
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

          {/* ── Issues & Returns Tab ── */}
          {activeTab === "issues" && (
            <div>
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Search by student, book..."
                  value={searchIssues}
                  onChange={(e) => setSearchIssues(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="issued">Issued</option>
                  <option value="overdue">Overdue</option>
                  <option value="returned">Returned</option>
                </select>
                {(filterClass || filterStatus || searchIssues) && (
                  <button
                    onClick={() => { setFilterClass(""); setFilterStatus(""); setSearchIssues(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {filteredIssues.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No issue records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Class</th>
                          <th className="px-6 py-3 font-medium">Book</th>
                          <th className="px-6 py-3 font-medium">Book No.</th>
                          <th className="px-6 py-3 font-medium">Issued</th>
                          <th className="px-6 py-3 font-medium">Due</th>
                          <th className="px-6 py-3 font-medium">Returned</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                          {!isReadOnly && <th className="px-6 py-3 font-medium">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredIssues.map((issue) => (
                          <tr key={issue.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <p className="font-medium">{issue.studentName}</p>
                              <p className="text-xs text-gray-400">{issue.admissionNumber}</p>
                            </td>
                            <td className="px-6 py-3 text-gray-500">{issue.className || "—"}</td>
                            <td className="px-6 py-3 font-medium">{issue.bookTitle}</td>
                            <td className="px-6 py-3 text-blue-600">{issue.bookNumber}</td>
                            <td className="px-6 py-3">{issue.issuedDate}</td>
                            <td className={`px-6 py-3 ${issue.status === "overdue" ? "text-red-500 font-medium" : ""}`}>
                              {issue.dueDate}
                            </td>
                            <td className="px-6 py-3 text-gray-500">{issue.returnedDate || "—"}</td>
                            <td className="px-6 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusStyle(issue.status)}`}>
                                {issue.status}
                              </span>
                            </td>
                            {!isReadOnly && (
                              <td className="px-6 py-3">
                                {issue.status !== "returned" && (
  <button
    onClick={() => handleReturn(issue)}
    disabled={returning}
    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-green-500 hover:bg-green-600 text-white transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <RotateCcw size={12} />
    {returning ? "..." : "Return"}
  </button>
)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Reports Tab ── */}
          {activeTab === "reports" && (
            <div className="space-y-6">

              {/* Overdue books */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Overdue Books</h2>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                    {overdueCount} overdue
                  </span>
                </div>
                {overdueCount === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">No overdue books.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-left">
                      <tr>
                        <th className="px-6 py-3 font-medium">Student</th>
                        <th className="px-6 py-3 font-medium">Class</th>
                        <th className="px-6 py-3 font-medium">Book</th>
                        <th className="px-6 py-3 font-medium">Due Date</th>
                        <th className="px-6 py-3 font-medium">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {issues
                        .filter((i) => i.status === "overdue")
                        .map((issue) => {
                          const due = new Date(issue.dueDate);
                          const today = new Date();
                          const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));
                          return (
                            <tr key={issue.id} className="hover:bg-gray-50">
                              <td className="px-6 py-3">
                                <p className="font-medium">{issue.studentName}</p>
                                <p className="text-xs text-gray-400">{issue.admissionNumber}</p>
                              </td>
                              <td className="px-6 py-3 text-gray-500">{issue.className || "—"}</td>
                              <td className="px-6 py-3 font-medium">{issue.bookTitle}</td>
                              <td className="px-6 py-3 text-red-500">{issue.dueDate}</td>
                              <td className="px-6 py-3">
                                <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                                  {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Books per class */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">Currently Issued by Class</h2>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {(() => {
                  const activeIssues = issues.filter(
                    (i) => i.status !== "returned" &&
                    (!filterClass || i.classId === filterClass)
                  );
                  return activeIssues.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">No active issues.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-left">
                        <tr>
                          <th className="px-6 py-3 font-medium">Student</th>
                          <th className="px-6 py-3 font-medium">Class</th>
                          <th className="px-6 py-3 font-medium">Book</th>
                          <th className="px-6 py-3 font-medium">Due Date</th>
                          <th className="px-6 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeIssues.map((issue) => (
                          <tr key={issue.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3">
                              <p className="font-medium">{issue.studentName}</p>
                              <p className="text-xs text-gray-400">{issue.admissionNumber}</p>
                            </td>
                            <td className="px-6 py-3 text-gray-500">{issue.className || "—"}</td>
                            <td className="px-6 py-3 font-medium">{issue.bookTitle}</td>
                            <td className={`px-6 py-3 ${issue.status === "overdue" ? "text-red-500 font-medium" : ""}`}>
                              {issue.dueDate}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusStyle(issue.status)}`}>
                                {issue.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Book Modal */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editingBookId ? "Edit Book" : "Add Book"}
              </h2>
              <button onClick={() => setShowBookModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBookSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Book Number</label>
                <input
                  required
                  placeholder="e.g. BK001"
                  value={bookForm.bookNumber}
                  onChange={(e) => setBookForm({ ...bookForm, bookNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  required
                  placeholder="e.g. Mathematics Grade 10"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <input
                    required
                    placeholder="e.g. Mathematics"
                    value={bookForm.subject}
                    onChange={(e) => setBookForm({ ...bookForm, subject: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
                  <select
                    required
                    value={bookForm.grade}
                    onChange={(e) => setBookForm({ ...bookForm, grade: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select grade</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Number of Copies</label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={bookForm.totalCopies}
                  onChange={(e) => setBookForm({ ...bookForm, totalCopies: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBookModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={savingBook} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                  {savingBook ? "Saving..." : editingBookId ? "Update Book" : "Add Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Book Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Issue Book</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">

              {/* Student search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
                <input
                  placeholder="Type name or admission number..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setSelectedStudent(null);
                    setIssueForm({ ...issueForm, studentId: "", studentName: "", admissionNumber: "", grade: "", classId: "", className: "" });
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
                  {" "}— {issueForm.className || selectedStudent.grade}
                </div>
              )}

              {/* Book search */}
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Search Book</label>
                <input
                  placeholder="Type book title or number..."
                  value={bookSearch}
                  onChange={(e) => {
                    setBookSearch(e.target.value);
                    setSelectedBook(null);
                    setIssueForm({ ...issueForm, bookId: "", bookNumber: "", bookTitle: "" });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {bookSearch && !selectedBook && filteredBookSearch.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredBookSearch.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => selectBook(b)}
                        className={`w-full text-left px-4 py-2 text-sm transition ${
                          b.availableCopies <= 0
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-blue-50"
                        }`}
                        disabled={b.availableCopies <= 0}
                      >
                        {b.title} ({b.bookNumber}) —{" "}
                        <span className={b.availableCopies <= 0 ? "text-red-500" : "text-green-600"}>
                          {b.availableCopies} available
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedBook && (
                <div className="bg-green-50 rounded-lg px-4 py-2 text-sm text-green-700">
                  <span className="font-medium">{selectedBook.title}</span>
                  {" "}— {selectedBook.availableCopies} cop{selectedBook.availableCopies !== 1 ? "ies" : "y"} available
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
                  <input
                    required
                    type="date"
                    value={issueForm.issuedDate}
                    onChange={(e) => setIssueForm({ ...issueForm, issuedDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                  <input
                    required
                    type="date"
                    value={issueForm.dueDate}
                    onChange={(e) => setIssueForm({ ...issueForm, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button
                  type="submit"
                  disabled={savingIssue || !selectedStudent || !selectedBook}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
                >
                  {savingIssue ? "Issuing..." : "Issue Book"}
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
          confirmLabel={confirmModal.confirmLabel || "Delete"}
          confirmColor={confirmModal.confirmColor || "bg-red-500 hover:bg-red-600"}
        />
      )}
    </div>
  );
}