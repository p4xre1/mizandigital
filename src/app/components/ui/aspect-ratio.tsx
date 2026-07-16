"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

import { cn } from "./utils";

/* ==========================================================================
   TYPE DEFINITIONS & INTERFACES (التحديد الصريح للأنواع والواجهات)
   ========================================================================== */

/**
 * 🎯 التحديد الصريح لنوع عنصر الـ DOM المرجعي للمكون الجذري
 */
export type AspectRatioElement = React.ElementRef<typeof AspectRatioPrimitive.Root>;

/**
 * 📑 الواجهة البرمجية الصريحة والشاملة لخصائص مكوّن نسبة الارتفاع
 */
export interface AspectRatioProps
  extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {
  /**
   * تفعيل حالة التحميل لعرض هيكل عظمي متحرك (Skeleton) خلف المحتوى
   * @default false
   */
  isLoading?: boolean;
  /**
   * تنسيق كلاسات مخصص للهيكل العظمي عند التحميل
   */
  fallbackClassName?: string;
}

/* ==========================================================================
   MAIN COMPONENT BLOCK (كتلة بناء المكوّن الأساسي)
   ========================================================================== */

/**
 * مكوّن نسبة الارتفاع المحصن والموجه للأنظمة الضخمة (Strict Enterprise AspectRatio)
 */
const AspectRatio = React.forwardRef<AspectRatioElement, AspectRatioProps>((
  { 
    className, 
    isLoading = false, 
    fallbackClassName, 
    children, 
    ...props 
  }: AspectRatioProps,
  ref: React.ForwardedRef<AspectRatioElement>
): React.JSX.Element => {
  // التحديد الصارم لنوع الـ State لمنع التخمين الضمني
  const [isLoaded, setIsLoaded] = React.useState<boolean>(!isLoading);

  // تحديث ومزامنة الحالة البرمجية عند تغير الخصائص العلوية بشكل صارم ومباشر
  React.useEffect(() => {
    if (!isLoading) {
      setIsLoaded(true);
    }
  }, [isLoading]);

  return (
    <AspectRatioPrimitive.Root
      ref={ref}
      data-slot="aspect-ratio"
      className={cn(
        "relative w-full overflow-hidden bg-muted transition-colors duration-300",
        className
      )}
      {...props}
    >
      {/* 1. هيكل التحميل الذكي الصارم (Strict Skeleton Shimmer) */}
      {!isLoaded && (
        <div 
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-muted-foreground/10 animate-pulse",
            "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 dark:before:via-black/5 before:to-transparent",
            fallbackClassName
          )}
          aria-hidden="true"
        />
      )}

      {/* 2. حاوية المحتوى الفعلي مع معالجة الشفافية التدريجية */}
      <div
        className={cn(
          "w-full h-full transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        {children ? (
          React.Children.map(children, (child: React.ReactNode): React.ReactNode => {
            if (React.isValidElement(child)) {
              // استخراج الخصائص بشكل كائن معرف المفاتيح بدلاً من Casting الأعمى بـ any
              const childProps = child.props as Record<string, unknown>;
              
              // الفحص الدقيق ما إذا كان العنصر هو صورة أساسية أو مكوّن يحمل مسار صورة
              if (child.type === "img" || typeof childProps.src === "string") {
                return React.cloneElement(child, {
                  onLoad: (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
                    setIsLoaded(true);
                    
                    // استدعاء الحدث الأصلي الممرر من المطور بأعلى درجات الأمان النوعي
                    if (typeof childProps.onLoad === "function") {
                      (childProps.onLoad as (e: React.SyntheticEvent<HTMLImageElement, Event>) => void)(event);
                    }
                  },
                } as React.Attributes);
              }
            }
            return child;
          })
        ) : (
          /* حماية بصرية صارمة لمنع انهيار الهيكل عند غياب الأبناء */
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40 italic select-none">
            No Preview
          </div>
        )}
      </div>
    </AspectRatioPrimitive.Root>
  );
});

// إشهار الاسم البرمجي بشكل صارم ومحصن لبيئة الإنتاج والتصحيح (Production DevTools)
AspectRatio.displayName = AspectRatioPrimitive.Root.displayName ?? "AspectRatio";

export { AspectRatio };