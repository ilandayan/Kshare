export default function ClientPaniersLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-24 bg-gray-100 rounded-full" />
        <div className="h-8 w-24 bg-gray-100 rounded-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
            <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded mb-4" />
            <div className="flex justify-between items-center">
              <div className="h-6 w-16 bg-gray-200 rounded" />
              <div className="h-9 w-24 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
