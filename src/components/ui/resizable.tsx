"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "../../lib/utils";

export type ResizablePanelGroupElement =
  ResizablePrimitive.ImperativePanelGroupHandle;

export interface ResizablePanelGroupProps
  extends ResizablePrimitive.PanelGroupProps {}

const ResizablePanelGroup = React.forwardRef<
  ResizablePanelGroupElement,
  ResizablePanelGroupProps
>(
  (
    { className, ...props }: ResizablePanelGroupProps,
    ref: React.ForwardedRef<ResizablePanelGroupElement>
  ): React.JSX.Element => {
    const PanelGroup = ResizablePrimitive.PanelGroup as React.ComponentType<any>;
    return (
      <PanelGroup
        ref={ref}
        data-slot="resizable-panel-group"
        className={cn(
          "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
          className
        )}
        {...props}
      />
    );
  }
);
ResizablePanelGroup.displayName = "ResizablePanelGroup";

export type ResizablePanelElement = ResizablePrimitive.ImperativePanelHandle;

export interface ResizablePanelProps extends ResizablePrimitive.PanelProps {}

const ResizablePanel = React.forwardRef<
  ResizablePanelElement,
  ResizablePanelProps
>(
  (
    { className, ...props }: ResizablePanelProps,
    ref: React.ForwardedRef<ResizablePanelElement>
  ): React.JSX.Element => {
    const Panel = ResizablePrimitive.Panel as React.ComponentType<any>;
    return (
      <Panel
        ref={ref}
        data-slot="resizable-panel"
        className={className}
        {...props}
      />
    );
  }
);
ResizablePanel.displayName = "ResizablePanel";

export type ResizableHandleElement = HTMLDivElement;

export interface ResizableHandleProps
  extends ResizablePrimitive.PanelResizeHandleProps {
  withHandle?: boolean;
}

const ResizableHandle = React.forwardRef<
  ResizableHandleElement,
  ResizableHandleProps
>(
  (
    { withHandle, className, ...props }: ResizableHandleProps,
    ref: React.ForwardedRef<ResizableHandleElement>
  ): React.JSX.Element => {
    const PanelResizeHandle =
      ResizablePrimitive.PanelResizeHandle as React.ComponentType<any>;
    return (
      <PanelResizeHandle
        ref={ref}
        data-slot="resizable-handle"
        className={cn(
          "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
          className
        )}
        {...props}
      >
        {withHandle && (
          <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
            <GripVerticalIcon className="size-2.5" />
          </div>
        )}
      </PanelResizeHandle>
    );
  }
);
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };