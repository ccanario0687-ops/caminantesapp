export default function StatCard({ label, value, icon: Icon, color, loading }) {
  const colors = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    green: "bg-green-100 text-green-700 border-green-200",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    red: "bg-red-100 text-red-700 border-red-200"
  };

  return (
    <div className={`p-4 rounded-xl border shadow-sm ${colors[color] || colors.amber}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 opacity-70" />
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          {loading ?
          <div className="h-7 w-10 bg-current opacity-20 rounded animate-pulse mt-1" /> :

          <p className="text-2xl font-bold">{value}</p>
          }
        </div>
      </div>
    </div>);

}