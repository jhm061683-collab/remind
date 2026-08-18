type Props = {
  title: string;
  description?: string;
  compact?: boolean;
};

export function PageHeader({ title, description, compact = false }: Props) {
  return (
    <header className={compact ? "mb-3" : "mb-4 md:mb-5"}>
      <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[var(--rm-text,#0f172a)] md:text-[28px]">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--rm-text-muted,#64748b)] md:text-sm">
          {description}
        </p>
      ) : null}
    </header>
  );
}
