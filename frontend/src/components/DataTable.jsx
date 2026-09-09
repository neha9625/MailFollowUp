import Icon from './Icons.jsx';

/**
 * Generic table with optional pagination.
 * columns: [{ key, header, render?(row), className? }]
 */
export default function DataTable({
  columns,
  rows = [],
  loading = false,
  emptyMessage = 'No records found.',
  onRowClick,
  pagination,
  onPageChange,
}) {
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`th ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td className="td text-center py-10 text-slate-400" colSpan={columns.length}>
                  <span className="inline-flex items-center gap-2">
                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="td text-center py-10 text-slate-400" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`td ${col.className || ''}`}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-sm">
          <p className="text-slate-500">
            {pagination.total.toLocaleString()} record{pagination.total === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <Icon name="chevronLeft" className="w-4 h-4" />
              Prev
            </button>
            <span className="text-slate-600 px-1">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
              <Icon name="chevronRight" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
