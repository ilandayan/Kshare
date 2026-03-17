export default function StatistiquesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 bg-gray-200 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-28 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
        <div className="h-5 w-48 bg-gray-200 rounded mb-4" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
