import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  SortingState,
  flexRender,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, EyeOff, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Select } from './ui/Select';
import { clsx } from 'clsx';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: string | null;
  emptyStateMessage?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = null,
  emptyStateMessage,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const defaultEmptyMsg = emptyStateMessage || t('common.noResults', 'No se encontraron resultados.');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Column Visibility Menu */}
      <div className="flex justify-end relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
          className="text-xs font-semibold flex items-center gap-1"
        >
          <EyeOff className="w-3.5 h-3.5" />
          Columns
        </Button>

        {showVisibilityMenu && (
          <div className="absolute right-0 top-10 z-20 w-48 rounded-lg border border-border bg-card p-3 shadow-lg animate-fade-in text-foreground">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Toggle Columns
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {table
                .getAllLeafColumns()
                .filter((col) => col.getCanHide())
                .map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center space-x-2 text-xs font-medium cursor-pointer hover:bg-muted p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={(e) => column.toggleVisibility(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span className="capitalize">{column.id}</span>
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Table Wrapper */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-foreground">
            <thead className="bg-secondary/40 border-b border-border/80 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sortDirection = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        onClick={
                          canSort ? header.column.getToggleSortingHandler() : undefined
                        }
                        className={clsx(
                          'p-4 font-bold select-none',
                          canSort && 'cursor-pointer hover:text-foreground transition-colors'
                        )}
                      >
                        <div className="flex items-center space-x-1">
                          <span>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                          {canSort && (
                            <span className="text-muted-foreground/60">
                              {sortDirection === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : sortDirection === 'desc' ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="text-sm font-medium">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-rose-500 font-semibold bg-rose-500/5"
                  >
                    Error: {error}
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">{defaultEmptyMsg}</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={clsx(
                      'hover:bg-muted/40 transition-colors duration-150',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 text-foreground/90 font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && !error && data.length > 0 && (
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 text-xs sm:text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span>Show</span>
            <div className="w-16">
              <Select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-8 py-0.5 text-xs"
              >
                {[5, 10, 20, 30, 45].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </div>
            <span>entries</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-between sm:justify-end">
            <span className="text-muted-foreground">
              Page <strong className="text-foreground">{table.getState().pagination.pageIndex + 1}</strong> of{' '}
              <strong className="text-foreground">{table.getPageCount()}</strong>
            </span>

            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 px-2.5 font-semibold text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 px-2.5 font-semibold text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DataTable;
