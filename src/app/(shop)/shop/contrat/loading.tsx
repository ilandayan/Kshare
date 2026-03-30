export default function ContratLoading() {
  return (
    <div className="animate-pulse max-w-3xl mx-auto">
      <div className="h-8 w-56 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-8">
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-4 w-4/6 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
        </div>
        <div className="mt-8 h-12 w-48 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
