import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Pagination } from '@/lib/types';

interface PaginationControlsProps {
  pagination: Pagination | undefined;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages } = pagination;

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1 py-6" aria-label="分页">
      <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="上一页">
        <ChevronLeft className="size-4" />
      </Button>
      {start > 1 && (
        <>
          <Button variant="ghost" size="sm" onClick={() => onPageChange(1)}>
            1
          </Button>
          {start > 2 && <span className="text-muted-foreground px-1 text-sm">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Button key={p} variant={p === page ? 'default' : 'ghost'} size="sm" onClick={() => onPageChange(p)}>
          {p}
        </Button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-muted-foreground px-1 text-sm">…</span>}
          <Button variant="ghost" size="sm" onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </Button>
        </>
      )}
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="下一页"
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
