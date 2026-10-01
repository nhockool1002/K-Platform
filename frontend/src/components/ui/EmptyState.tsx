export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-line bg-paper-raised border border-dashed px-6 py-10 text-center">
      <p className="text-ink font-medium">{title}</p>
      <p className="text-ink-muted mx-auto mt-1 max-w-sm text-sm">{body}</p>
    </div>
  );
}
