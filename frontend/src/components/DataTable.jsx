import Icon from './Icons.jsx';

/**
 * Generic table with optional pagination.
 * columns: [{ key, header, render?(row), className?, width?, wrap? }]
 *
 * - width:  any CSS width (e.g. '200px', '20%', 'auto')
 * - wrap:   false => whitespace-nowrap (use for date, status, buttons)
 *           true  => break-words (default)
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
        <table className="min-w-full divide-y divide-slate-200 table-fixed">
          {/* ---------- HEADER ---------- */}
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap ${
                    col.className || ''
                  }`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ---------- BODY ---------- */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td
                  className="px-3 py-10 text-center text-slate-400"
                  colSpan={columns.length}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon name="spinner" className="w-4 h-4 animate-spin" />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-10 text-center text-slate-400"
                  colSpan={columns.length}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={`${
                    onRowClick ? 'cursor-pointer' : ''
                  } hover:bg-slate-50 transition-colors`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const wrapClass =
                      col.wrap === false ? 'whitespace-nowrap' : 'break-words';
                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 align-middle text-sm text-slate-700 ${wrapClass} ${
                          col.className || ''
                        }`}
                      >
                        <div className="max-w-full">
                          {col.render ? col.render(row) : row[col.key]}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---------- PAGINATION ---------- */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 text-sm">
          <p className="text-slate-500">
            {pagination.total.toLocaleString()} record
            {pagination.total === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 inline-flex items-center gap-1"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <Icon name="chevronLeft" className="w-4 h-4" />
              Prev
            </button>
            <span className="text-slate-600 px-1 whitespace-nowrap">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 inline-flex items-center gap-1"
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