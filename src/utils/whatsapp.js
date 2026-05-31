export function formatPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("7") || cleaned.startsWith("1")) return "254" + cleaned;
  return cleaned;
}

export function openWhatsApp(phone, message) {
  const formatted = formatPhone(phone);
  if (!formatted) return;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${formatted}?text=${encoded}`, "_blank");
}

export function feeReminderMessage(studentName, balance, grade) {
  return `Dear Parent/Guardian,

This is a reminder that *${studentName}* (${grade}) has an outstanding fee balance of *KES ${balance.toLocaleString()}*.

Kindly make arrangements to clear this balance at your earliest convenience.

Thank you.
School Administration`;
}

export function feeClearedMessage(studentName, grade) {
  return `Dear Parent/Guardian,

We are pleased to inform you that *${studentName}* (${grade}) has cleared all outstanding fee balances for this year.

Thank you for your prompt payment.

School Administration`;
}

export function absenceMessage(studentName, grade, date) {
  return `Dear Parent/Guardian,

This is to inform you that *${studentName}* (${grade}) was marked *absent* on ${date}.

Please contact the school if you have any concerns.

School Administration`;
}

export function reportCardMessage(student, results, exam) {
  const average = results.length
    ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
    : null;

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

  const subjectLines = results
    .map((r) => `  • ${r.subject}: ${r.score}% (${getGrade(r.score)})`)
    .join("\n");

  return `Dear Parent/Guardian,

Here is the academic report for *${student.firstName} ${student.lastName}* (${student.admissionNumber}).

*Grade:* ${student.grade}
*Pathway:* ${student.pathway || "—"}
*Exam:* ${exam || "All Exams"}

*Subject Results:*
${subjectLines}

*Average Score:* ${average !== null ? `${average}% (${getGrade(average)})` : "—"}

For the full report card, please contact the school.

School Administration`;
}