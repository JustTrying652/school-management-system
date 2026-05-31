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