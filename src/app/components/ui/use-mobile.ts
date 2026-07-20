import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook to detect whether the current viewport width is below a mobile threshold.
 *
 * @param breakpoint - Optional custom breakpoint in pixels (defaults to 768px).
 * @returns `true` if the viewport is below the breakpoint, `false` otherwise.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < breakpoint);

    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return !!isMobile;
}