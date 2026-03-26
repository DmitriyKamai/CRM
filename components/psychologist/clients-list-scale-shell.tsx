"use client";

import type { ReactNode, RefObject } from "react";

export function ClientsListScaleShell(props: {
  listScaled: boolean;
  minListWidth: number;
  listScale: number;
  listInnerHeight: number;
  containerRef: RefObject<HTMLDivElement | null>;
  innerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const {
    listScaled,
    minListWidth,
    listScale,
    listInnerHeight,
    containerRef,
    innerRef,
    children
  } = props;

  return (
    <div ref={containerRef} className="w-full min-w-0 space-y-4">
      <div
        style={{
          overflow: listScaled ? "hidden" : undefined,
          width: listScaled ? minListWidth * listScale : undefined,
          height: listScaled && listInnerHeight > 0 ? listInnerHeight * listScale : undefined,
          maxWidth: "100%",
          margin: listScaled ? "0 auto" : undefined
        }}
      >
        <div
          ref={innerRef}
          className="space-y-4"
          style={{
            width: listScaled ? minListWidth : undefined,
            transform: listScaled ? `scale(${listScale})` : undefined,
            transformOrigin: "0 0"
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

