import type { FC } from "react";
import { memo, useEffect, useRef } from "react";

declare global {
  interface MathJaxStatic {
    typesetPromise?: (elements?: Element[]) => Promise<void>;
  }

  var MathJax: MathJaxStatic | undefined;
}

interface LatexProps {
  /** LaTeX string content (alternative to children) */
  latex?: string;
  /** LaTeX string content */
  children?: string;
  /** Whether to render as a block element ($$) */
  block?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Text color for the rendered LaTeX */
  color?: string;
}

/**
 * A unified LaTeX component that uses MathJax to render mathematical formulas. Supports both inline
 * and block modes, and custom coloring.
 */
export const Latex: FC<LatexProps> = memo(({ children, latex, block, className, color }) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const content = latex ?? children ?? "";

  useEffect(() => {
    let isMounted = true;
    const el = containerRef.current;

    if (el) {
      const renderMath = async (): Promise<void> => {
        // Wait for MathJax to load if it hasn't yet
        if (!globalThis.MathJax?.typesetPromise) {
          setTimeout(() => {
            if (isMounted) void renderMath();
          }, 200);

          return;
        }

        // Set the content with appropriate delimiters for MathJax
        const delimiter = block ? "$$" : "$";

        el.textContent = `${delimiter}${content}${delimiter}`;
        el.style.visibility = "hidden"; // Hide until rendered to prevent flash

        try {
          await globalThis.MathJax.typesetPromise([el]);

          if (isMounted) {
            el.style.visibility = "visible";

            // Apply color to SVG if provided
            if (color) {
              const svg = el.querySelector("svg");

              if (svg) {
                svg.style.fill = color;
                svg.style.color = color;

                // Override internal path fills to match the requested color
                const paths = svg.querySelectorAll("path, rect, polygon");

                paths.forEach((path) => {
                  (path as SVGElement).style.fill = color;
                });
              }
            }
          }
        } catch (err) {
          // oxlint-disable-next-line no-console
          console.warn("MathJax render error:", err);

          if (isMounted) {
            el.textContent = content; // Fallback to raw text
            el.style.visibility = "visible";
          }
        }
      };

      void renderMath();
    }

    return (): void => {
      isMounted = false;
    };
  }, [content, block, color]);

  return (
    <span
      ref={containerRef}
      className={className}
      style={{
        display: block ? "block" : "inline-block",
        color,
        // Vertical alignment adjustment for inline math
        ...(block ? {} : { verticalAlign: "middle", position: "relative", bottom: "0.125em" }),
      }}
    />
  );
});

Latex.displayName = "Latex";
