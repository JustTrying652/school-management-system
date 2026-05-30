export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: cols }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div
                      className={`h-3 bg-gray-100 rounded animate-pulse ${
                        colIndex === 0 ? "w-24" : colIndex === cols - 1 ? "w-12" : "w-32"
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}