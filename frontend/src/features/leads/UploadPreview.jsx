export default function UploadPreview({ preview, onBack, onImport, loading }) {
  const { valid, dupeCount, invalid } = preview
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Review before import</h2>
      <div className="flex gap-3 mb-6">
        <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full">{valid.length} valid</span>
        {dupeCount > 0 && <span className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">{dupeCount} dupes</span>}
        {invalid.length > 0 && <span className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full">{invalid.length} invalid format</span>}
      </div>
      {valid.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Company</th>
              </tr>
            </thead>
            <tbody>
              {valid.slice(0, 5).map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{r.phone}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.company}</td>
                </tr>
              ))}
              {valid.length > 5 && (
                <tr className="border-t border-gray-100">
                  <td colSpan={3} className="px-3 py-2 text-gray-400 text-center">+{valid.length - 5} more</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Back</button>
        <button
          onClick={onImport}
          disabled={loading || valid.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50"
        >
          {loading ? 'Importing…' : `Import ${valid.length} leads →`}
        </button>
      </div>
    </div>
  )
}
