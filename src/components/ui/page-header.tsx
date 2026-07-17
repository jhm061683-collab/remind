type Props = {
  title: string;
  description?: string;
  /** @deprecated 기본이 이미 타이트함. 호환용으로 유지 */
  compact?: boolean;
};

export function PageHeader({ title, description }: Props) {
  return (
    <header className="mb-4">
      <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-xs text-slate-500 md:text-sm">{description}</p>
      ) : null}
    </header>
  );
}
