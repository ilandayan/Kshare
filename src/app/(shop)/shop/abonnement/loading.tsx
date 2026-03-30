export default function AbonnementLoading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto">
      <div className="h-8 w-48 bg-gray-200 rounded mb-6" />
      <div className="bg-white rounded-2xl border border-[#e2e5f0] shadow-sm p-8">
        <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
        <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
