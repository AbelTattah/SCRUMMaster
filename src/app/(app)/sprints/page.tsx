import type { Metadata } from "next";

import SprintsPageClient from "./SprintsPageClient";

export const metadata: Metadata = { title: "Sprints" };

export default function SprintsPage() {
  return <SprintsPageClient />;
}
