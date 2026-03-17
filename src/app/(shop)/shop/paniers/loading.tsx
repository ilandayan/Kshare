export default function PaniersLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 bg-gray-200 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-5">
            <div className="h-40 bg-gray-100 rounded-xl mb-4" />
            <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
            <div className="flex justify-between">
              <div className="h-6 w-16 bg-gray-200 rounded" />
              <div className="h-6 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
