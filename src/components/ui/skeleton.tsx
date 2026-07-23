"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

export type SkeletonElement = HTMLDivElement;
export interface SkeletonProps extends React.ComponentPropsWithoutRef<"div"> {}

const Skeleton = React.forwardRef<SkeletonElement, SkeletonProps>(
  (
    { className, ...props }: SkeletonProps,
    ref: React.ForwardedRef<SkeletonElement>
  ): React.JSX.Element => (
    <div
      ref={ref}
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };