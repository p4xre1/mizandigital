if (typeof HTMLCanvasElement !== "undefined") {
  const prototype = HTMLCanvasElement.prototype as {
    getContext?: (contextId: string, options?: unknown) => unknown;
  };
  const current = prototype.getContext;
  if (typeof current === "function") {
    prototype.getContext = function getContext(contextId: string, options?: unknown) {
      if (contextId === "2d") return null;
      return current.call(this, contextId, options);
    };
  }
}
