"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

import { cn } from "./utils";

interface AspectRatioProps
  extends React.ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root> {
  /**
   * تفعيل حالة التحميل لعرض هيكل عظمي متحرك (Skeleton) خلف المحتوى
   */
  isLoading?: boolean;
  /**
   * لون مخصص للهيكل العظمي عند التحميل
   */
  fallbackClassName?: string;
}

const AspectRatio = React.forwardRef<
  React.ElementRef<typeof AspectRatioPrimitive.Root>,
  AspectRatioProps
>(({ className, isLoading = false, fallbackClassName, children, ...props }, ref) => {
  const [isLoaded, setIsLoaded] = React.useState(!isLoading);

  // إذا تم تغيير حالة التحميل ديناميكياً من الأعلى
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
      {/* 1. هيكل التحميل الذكي (Skeleton Shimmer) */}
      {!isLoaded && (
        <div 
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-muted-foreground/10 animate-pulse",
            // تأثير لمعان (Shimmer Effect) متحرك بالخلفية لجمالية بصرية فائقة
            "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 dark:before:via-black/5 before:to-transparent",
            fallbackClassName
          )}
          aria-hidden="true"
        />
      )}

      {/* 2. المحتوى الفعلي مع تتبع اكتمال التحميل */}
      <div
        className={cn(
          "w-full h-full transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
      >
        {/* فحص دفاعي للتأكد من وجود محتوى لتجنب الأخطاء البرمجية */}
        {children ? (
          // نقوم بحقن حدث التتبع للتأكد من اختفاء الـ Skeleton فور تحميل الصورة فعلياً
          React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              // إذا كان العنصر صورة، نقوم بربط حدث onLoad الخاص بها ذكياً
              if (child.type === "img" || (child.props as any).src) {
                return React.cloneElement(child, {
                  onLoad: (e: any) => {
                    setIsLoaded(true);
                    if (child.props.onLoad) child.props.onLoad(e);
                  },
                } as any);
              }
            }
            return child;
          })
        ) : (
          // حماية بصرية في حال عدم تمرير أي عنصر
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground/40 italic">
            No Preview
          </div>
        )}
      </div>
    </AspectRatioPrimitive.Root>
  );
});

AspectRatio.displayName = AspectRatioPrimitive.Root.displayName;

export { AspectRatio };