"use client";

import { useEffect, useMemo, useState } from "react";
import { helpContent } from "@/lib/helpContent";

interface HelpOverlayProps {
  pageKey: string;
}

/**
 * Reusable help overlay with first-run tour behavior.
 *
 * Beginner note:
 * - "first-run" state is tracked in localStorage.
 * - Users can always reopen help manually with the Help button.
 */
export function HelpOverlay({ pageKey }: HelpOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const content = useMemo(() => {
    return helpContent[pageKey] ?? helpContent.global;
  }, [pageKey]);

  useEffect(() => {
    // Side effect belongs in useEffect: check first-visit state once per page key.
    const key = `tour:${pageKey}:seen`;
    if (typeof window !== "undefined" && !window.localStorage.getItem(key)) {
      setIsOpen(true);
      window.localStorage.setItem(key, "true");
    }
  }, [pageKey]);

  return (
    <>
      <button
        type="button"
        className="help-fab"
        onClick={() => {
          setTourStep(0);
          setIsOpen(true);
        }}
        aria-label="Open help and tooltips"
        title="Open help and onboarding"
      >
        Help
      </button>

      {isOpen ? (
        <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Onboarding help">
          <div className="help-card">
            <h3>{content.intro}</h3>

            <section>
              <h4>Guided Steps</h4>
              <p>
                <strong>{content.tour[tourStep]?.title}</strong>
              </p>
              <p>{content.tour[tourStep]?.content}</p>
              <div className="row gap-sm">
                <button
                  type="button"
                  onClick={() => setTourStep((prev) => Math.max(0, prev - 1))}
                  disabled={tourStep === 0}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setTourStep((prev) => Math.min(content.tour.length - 1, prev + 1))}
                  disabled={tourStep === content.tour.length - 1}
                >
                  Next
                </button>
              </div>
            </section>

            <section>
              <h4>Tooltips Reference</h4>
              <ul>
                {content.tooltips.map((tip) => (
                  <li key={tip.key}>
                    <strong>{tip.title}:</strong> {tip.body}
                  </li>
                ))}
              </ul>
            </section>

            <button type="button" onClick={() => setIsOpen(false)}>
              Close Help
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}