import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onChange: (page: number) => void;
  className?: string;
};

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  className,
}: Props) {
  if (totalPages <= 1 && !total) return null;
  const pages = buildPages(page, Math.max(1, totalPages));
  const from = total && pageSize ? Math.min(total, (page - 1) * pageSize + 1) : 0;
  const to = total && pageSize ? Math.min(total, page * pageSize) : 0;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-outline-variant",
        className,
      )}
    >
      <p className="text-xs text-on-surface-variant tabular-nums">
        {total !== undefined && pageSize !== undefined && total > 0
          ? `Menampilkan ${from}–${to} dari ${total}`
          : `Halaman ${page} dari ${Math.max(1, totalPages)}`}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-8 px-2 inline-flex items-center justify-center rounded-md text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Halaman sebelumnya"
          >
            <span className="material-symbols-outlined !text-[18px]">chevron_left</span>
          </button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span
                key={`e-${i}`}
                className="h-8 w-8 inline-flex items-center justify-center text-xs text-on-surface-variant"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-md text-sm font-medium tabular-nums transition-colors",
                  p === page
                    ? "bg-primary text-primary-foreground"
                    : "text-on-surface hover:bg-surface-container",
                )}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="h-8 px-2 inline-flex items-center justify-center rounded-md text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Halaman berikutnya"
          >
            <span className="material-symbols-outlined !text-[18px]">chevron_right</span>
          </button>
        </nav>
      )}
    </div>
  );
}
