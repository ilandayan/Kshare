export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-10 w-10 bg-gray-100 rounded-xl" />
            </div>
            <div className="h-8 w-28 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-36 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-6">
          <div className="h-5 w-36 bg-gray-200 rounded mb-4" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
