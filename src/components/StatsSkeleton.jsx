export default function StatsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-24" />
            <div className="h-5 bg-gray-200 rounded animate-pulse w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}