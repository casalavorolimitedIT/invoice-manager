"use client";

import { useEffect, useRef } from "react";

interface ResponsiveInvoiceFrameProps {
  children: React.ReactNode;
  baseWidth?: number;
}

export function ResponsiveInvoiceFrame({
  children,
  baseWidth = 820,
}: ResponsiveInvoiceFrameProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content) return;

    const updateLayout = () => {
      const nextScale = Math.min(1, container.clientWidth / baseWidth);

      container.style.height = `${content.scrollHeight * nextScale}px`;
      content.style.width = `${baseWidth}px`;
      content.style.transform = `scale(${nextScale})`;
    };

    updateLayout();

    const resizeObserver = new ResizeObserver(() => {
      updateLayout();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [baseWidth]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div ref={contentRef} className="origin-top-left">
        {children}
      </div>
    </div>
  );
}