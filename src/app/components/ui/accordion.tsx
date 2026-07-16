"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "./utils";

/* ==========================================================================
   1. ACCORDION ROOT (المكوّن الجذري للأكورديون)
   ========================================================================== */

export type AccordionElement = React.ElementRef<typeof AccordionPrimitive.Root>;
export interface AccordionProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> {}

const Accordion = React.forwardRef<AccordionElement, AccordionProps>((
  { ...props }: AccordionProps,
  ref: React.ForwardedRef<AccordionElement>
): React.JSX.Element => (
  <AccordionPrimitive.Root ref={ref} data-slot="accordion" {...props} />
));
Accordion.displayName = "Accordion";

/* ==========================================================================
   2. ACCORDION ITEM (مكوّن العنصر الفردي)
   ========================================================================== */

export type AccordionItemElement = React.ElementRef<typeof AccordionPrimitive.Item>;
export interface AccordionItemProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> {}

const AccordionItem = React.forwardRef<AccordionItemElement, AccordionItemProps>((
  { className, ...props }: AccordionItemProps,
  ref: React.ForwardedRef<AccordionItemElement>
): React.JSX.Element => (
  <AccordionPrimitive.Item
    ref={ref}
    data-slot="accordion-item"
    className={cn("border-b last:border-b-0 border-border transition-colors duration-200", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

/* ==========================================================================
   3. ACCORDION TRIGGER (مفتاح الفتح والإغلاق)
   ========================================================================== */

export type AccordionTriggerElement = React.ElementRef<typeof AccordionPrimitive.Trigger>;
export interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {}

const AccordionTrigger = React.forwardRef<AccordionTriggerElement, AccordionTriggerProps>((
  { className, children, ...props }: AccordionTriggerProps,
  ref: React.ForwardedRef<AccordionTriggerElement>
): React.JSX.Element => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      data-slot="accordion-trigger"
      className={cn(
        "flex flex-1 items-center justify-between gap-4 w-full rounded-md py-4 text-start text-sm font-semibold transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 select-none [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 ease-in-out" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

/* ==========================================================================
   4. ACCORDION CONTENT (مكوّن حاوية المحتوى الداخلي الانسيابية)
   ========================================================================== */

export type AccordionContentElement = React.ElementRef<typeof AccordionPrimitive.Content>;
export interface AccordionContentProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content> {}

const AccordionContent = React.forwardRef<AccordionContentElement, AccordionContentProps>((
  { className, children, ...props }: AccordionContentProps,
  ref: React.ForwardedRef<AccordionContentElement>
): React.JSX.Element => (
  <AccordionPrimitive.Content
    ref={ref}
    data-slot="accordion-content"
    // will-change-transform تضمن تشغيل تسريع الـ GPU على الحركة لمنع أي رجفة أو بطء في الحركات الطويلة
    className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm transition-all will-change-[max-height]"
    {...props}
  >
    {/* تم عزل الحشوة الداخلية (Padding) في حاوية div منفصلة برمجياً لضمان سلامة حسابات الارتفاع الديناميكي للمكتبة أثناء الحركة */}
    <div className={cn("pt-0 pb-4 text-muted-foreground leading-relaxed", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };