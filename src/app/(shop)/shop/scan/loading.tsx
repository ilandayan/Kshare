export default function ScanLoading() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-72 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
          {/* Tab skeleton */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            <div className="flex-1 py-2.5 rounded-lg bg-white shadow-sm" />
            <div className="flex-1 py-2.5 rounded-lg" />
          </div>
          {/* Scanner area skeleton */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-56 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-[300px] rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
