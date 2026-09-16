import { useState } from "react";

export function useAdminRpc<T extends (...args: any[]) => Promise<any>>(fn: T) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<T>> | null>(null);

  const call = async (...args: Parameters<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn(...args);
      setData(result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { call, loading, error, data };
}
