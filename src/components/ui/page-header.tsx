type Props = {
  title: string;
  description?: string;
  compact?: boolean;
};

export function PageHeader({ title, description }: Props) {
  return (
    <header className="mb-3">
      <h1 className="text-lg font-bold tracking-tight text-[var(--rm-text,#0f172a)] md:text-xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-0.5 text-xs text-[var(--rm-text-muted,#64748b)]">
          {description}
        </p>
      ) : null}
    </header>
  );
}
