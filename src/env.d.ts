/// <reference types="vite/client" />

declare global {
  interface MathJaxStatic {
    typesetPromise?: (elements?: Element[]) => Promise<void>;
  }

  var MathJax: MathJaxStatic | undefined;
}

export {};
