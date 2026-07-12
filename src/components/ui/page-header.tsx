type Props = {
  title: string;
  description?: string;
  compact?: boolean;
};

export function PageHeader({ title, description, compact }: Props) {
  return (
    <header className={compact ? "mb-4" : "mb-6"}>
      <h1
        className={
          compact
            ? "text-xl font-bold tracking-tight text-slate-900"
            : "text-2xl font-bold tracking-tight text-slate-900 md:text-3xl"
        }
      >
        {title}
      </h1>
      {description ? (
        <p
          className={
            compact
              ? "mt-1 text-xs text-slate-500"
              : "mt-2 text-sm leading-relaxed text-slate-500 md:text-base"
          }
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
