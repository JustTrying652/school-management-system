import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  confirmColor = "bg-red-500 hover:bg-red-600",
  icon,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className={`rounded-full p-3 ${confirmColor.includes("red") ? "bg-red-100 text-red-500" : confirmColor.includes("purple") ? "bg-purple-100 text-purple-500" : "bg-blue-100 text-blue-500"}`}>
            {icon || <AlertTriangle size={22} />}
          </div>
          <h2 className="font-semibold text-gray-800 text-lg">Are you sure?</h2>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition ${confirmColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}