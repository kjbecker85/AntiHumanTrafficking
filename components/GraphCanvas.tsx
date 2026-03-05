"use client";

import { HudLinkGraph, type HudLinkGraphProps } from "@/components/HudLinkGraph";

export type GraphCanvasProps = HudLinkGraphProps;

export function GraphCanvas(props: GraphCanvasProps) {
  return <HudLinkGraph {...props} />;
}
