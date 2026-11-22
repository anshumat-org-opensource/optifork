export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      className={`block rounded bg-surface-2 ${className}`}
      style={{ animation: "of-skeleton 1.2s ease-in-out infinite" }}
      aria-hidden
    />
  );
}

/** A block of skeleton table rows for loads over ~300ms. */
export function SkeletonRows({ rows = 8, rowHeight = 48 }: { rows?: number; rowHeight?: number }) {
  return (
    <div role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-default px-4" style={{ height: rowHeight }}>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="ml-auto h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
