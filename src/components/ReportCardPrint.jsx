const GRADE_REMARKS = {
  "A": "Excellent", "A-": "Excellent",
  "B+": "Very Good", "B": "Very Good", "B-": "Good",
  "C+": "Average", "C": "Average", "C-": "Below Average",
  "D+": "Poor", "D": "Poor", "D-": "Very Poor",
  "E": "Fail",
};

function getGrade(score) {
  if (score >= 80) return "A";
  if (score >= 75) return "A-";
  if (score >= 70) return "B+";
  if (score >= 65) return "B";
  if (score >= 60) return "B-";
  if (score >= 55) return "C+";
  if (score >= 50) return "C";
  if (score >= 45) return "C-";
  if (score >= 40) return "D+";
  if (score >= 35) return "D";
  if (score >= 30) return "D-";
  return "E";
}

export default function ReportCardPrint({ student, results, exam, onClose }) {
  const average = results.length
    ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
    : null;

  const averageGrade = average !== null ? getGrade(average) : null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Action buttons — hidden on print */}
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-semibold text-gray-800">Report Card Preview</h2>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition"
            >
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable content */}
        <div className="p-8 print:p-6" id="report-card">

          {/* School header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">
              S
            </div>
            <h1 className="text-xl font-bold text-gray-800 uppercase tracking-wide">
              School Management System
            </h1>
            <p className="text-sm text-gray-500 mt-1">Academic Report Card</p>
          </div>

          {/* Student info */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-500">Student Name</p>
              <p className="font-semibold text-gray-800">
                {student.firstName} {student.lastName}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Admission Number</p>
              <p className="font-semibold text-gray-800">{student.admissionNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Grade</p>
              <p className="font-semibold text-gray-800">{student.grade}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pathway</p>
              <p className="font-semibold text-gray-800">{student.pathway || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Exam</p>
              <p className="font-semibold text-gray-800">{exam || "All Exams"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Year</p>
              <p className="font-semibold text-gray-800">{new Date().getFullYear()}</p>
            </div>
          </div>

          {/* Results table */}
          <table className="w-full text-sm mb-6 border border-gray-200 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                <th className="px-4 py-2.5 text-left font-medium">Exam</th>
                <th className="px-4 py-2.5 text-center font-medium">Score (%)</th>
                <th className="px-4 py-2.5 text-center font-medium">Grade</th>
                <th className="px-4 py-2.5 text-left font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r, i) => {
                const grade = getGrade(r.score);
                return (
                  <tr key={r.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-2.5 font-medium">{r.subject}</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.exam}</td>
                    <td className="px-4 py-2.5 text-center font-semibold">{r.score}</td>
                    <td className="px-4 py-2.5 text-center font-bold">{grade}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {r.remarks || GRADE_REMARKS[grade] || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary */}
          {average !== null && (
            <div className="flex items-center justify-between bg-blue-50 rounded-xl px-6 py-4 mb-6">
              <div>
                <p className="text-xs text-gray-500">Total Subjects</p>
                <p className="text-lg font-bold text-gray-800">{results.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Average Score</p>
                <p className="text-lg font-bold text-blue-600">{average}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Overall Grade</p>
                <p className="text-lg font-bold text-blue-600">{averageGrade}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remarks</p>
                <p className="text-lg font-bold text-gray-800">
                  {GRADE_REMARKS[averageGrade] || "—"}
                </p>
              </div>
            </div>
          )}

          {/* Signature section */}
          <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t border-gray-200">
            {["Class Teacher", "Principal", "Parent/Guardian"].map((label) => (
              <div key={label} className="text-center">
                <div className="border-b border-gray-400 mb-1 h-8" />
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Generated on {new Date().toLocaleDateString("en-KE", {
              year: "numeric", month: "long", day: "numeric"
            })}
          </p>
        </div>
      </div>
    </div>
  );
}