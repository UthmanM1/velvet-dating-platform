import { Alert } from "@/components/ui";
export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-16">
      <p className="eyebrow mb-3">Legal</p>
      <h1 className="text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-6"><Alert>This document is a good-faith template for a demonstration build. It must be reviewed and adapted by a qualified solicitor before VELVET operates commercially.</Alert></div>
      <div className="prose-legal mt-8">{children}</div>
    </div>
  );
}
