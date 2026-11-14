import type { Metadata } from "next";

import SprintDetailClient from "./SprintDetailClient";

export const metadata: Metadata = { title: "Sprint" };

export default async function SprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SprintDetailClient id={id} />;
}