/**
 * Central tooltip and onboarding text config.
 *
 * Product reason:
 * - Copy can evolve without touching page logic.
 * - Supports future localization and policy review.
 */

export interface TooltipItem {
  key: string;
  title: string;
  body: string;
}

export interface TourStep {
  title: string;
  content: string;
}

export const helpContent: Record<string, { intro: string; tooltips: TooltipItem[]; tour: TourStep[] }> = {
  global: {
    intro: "This prototype uses synthetic training data and role-based visibility rules.",
    tooltips: [
      {
        key: "protected",
        title: "Protected Data",
        body: "Protected values are masked for roles without explicit permission.",
      },
      {
        key: "confidence",
        title: "Confidence",
        body: "Confidence scores (0-1) express reliability of the current evidence set.",
      },
    ],
    tour: [
      { title: "Welcome", content: "Use the top navigation to move between the case workflow pages." },
      { title: "Help", content: "Use the Help button at bottom-right on any page to revisit guidance." },
    ],
  },
  cases: {
    intro: "Case Workspace is where analysts organize investigation context and priorities.",
    tooltips: [
      { key: "priority", title: "Priority", body: "High priority cases should be reviewed first in leadership workflows." },
      { key: "review", title: "Review Date", body: "Review date helps supervisors keep the case lifecycle current." },
    ],
    tour: [
      { title: "Case List", content: "Choose one case to drive all linked pages in this prototype." },
      { title: "Tags", content: "Tags help quick filtering for mission domains and operational themes." },
    ],
  },
  reports: {
    intro: "Report Entry captures structured observations with location, narrative, and source type.",
    tooltips: [
      { key: "sourceType", title: "Source Type", body: "Source type clarifies origin and affects confidence weighting later." },
      { key: "related", title: "Related Entities", body: "Link reports to known entities so they appear in graph and timeline contexts." },
    ],
    tour: [
      { title: "Entry Form", content: "Use this form for quick structured capture from field or partner notes." },
      { title: "Chronology", content: "Reports display newest first to support immediate review." },
    ],
  },
  operator: {
    intro: "Operator View prioritizes rapid field awareness and quick report submission.",
    tooltips: [
      { key: "watch", title: "Watch Items", body: "Watch items are ranked using confidence and recent reporting frequency." },
      { key: "ai-brief", title: "AI Situation Brief", body: "AI summarizes recent patterns and predicts likely next event window and location." },
      { key: "ai-actions", title: "AI Recommended Actions", body: "Recommendations include evidence report IDs and should always be validated by operators." },
      { key: "field-form", title: "Field Reporting", body: "Use this form for immediate operational updates tied to known entities." },
      { key: "entity-cards", title: "Entity Cards", body: "Entity cards provide quick glance details and map address context." },
    ],
    tour: [
      { title: "Case Picture", content: "The top cards summarize current case scope and report activity." },
      { title: "AI Layer", content: "Use AI brief for prediction windows, location focus, and evidence-backed actions." },
      { title: "Map + Form", content: "Select map markers and submit field reports from one screen." },
      { title: "Entity Cards", content: "Use cards to review and select entities without opening deeper pages." },
    ],
  },
  "link-analysis": {
    intro: "Cork Board visualizes relationship patterns and evidence-backed connection strength.",
    tooltips: [
      { key: "strength", title: "Strength", body: "Strength reflects corroboration level: low, medium, high." },
      { key: "why", title: "Why Linked", body: "Use source count and confidence to explain why entities are connected." },
      { key: "filter", title: "Filter Behavior", body: "Filters hide nodes and edges that do not meet current criteria." },
    ],
    tour: [
      { title: "Graph Canvas", content: "Click a node or edge to open details in the right panel." },
      { title: "Toolbar", content: "Search and confidence filters refine noisy graphs for analyst focus." },
      { title: "Protected Indicators", content: "Badge markers show where protected identity controls apply." },
    ],
  },
};
