export default function ProfilLoading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto">
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 bg-gray-200 rounded-full" />
          <div>
            <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-28 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-10 w-full bg-gray-100 rounded-lg" />
          <div className="h-10 w-full bg-gray-100 rounded-lg" />
          <div className="h-10 w-full bg-gray-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
