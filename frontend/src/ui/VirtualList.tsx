import React, { useState } from "react";

interface Props<T> {
  items: T[];
  rowHeight: number;
  height: number;
  overscan?: number;
  renderRow: (item: T, index: number) => React.ReactNode;
}

/**
 * Minimal fixed-height windowing list (no dependency). Only the visible slice of
 * rows is in the DOM, so a 10,000-row table scrolls at 60fps. (Phase 3 perf bar.)
 */
export function VirtualList<T>({ items, rowHeight, height, overscan = 6, renderRow }: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = items.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visible = Math.ceil(height / rowHeight) + overscan * 2;
  const end = Math.min(items.length, start + visible);
  const slice = items.slice(start, end);

  return (
    <div
      style={{ height, overflowY: "auto" }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      role="list"
    >
      <div style={{ height: total, position: "relative" }}>
        {slice.map((item, i) => {
          const index = start + i;
          return (
            <div key={index} role="listitem" style={{ position: "absolute", top: index * rowHeight, left: 0, right: 0, height: rowHeight }}>
              {renderRow(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualList;
