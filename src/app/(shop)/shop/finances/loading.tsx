export default function FinancesLoading() {
  return (
    <div className="space-y-6 p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="h-6 w-48 bg-gray-200 rounded-full" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-4 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-40 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Summary card skeleton */}
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <div className="h-5 w-36 bg-gray-300 rounded" />
            <div className="h-6 w-24 bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
