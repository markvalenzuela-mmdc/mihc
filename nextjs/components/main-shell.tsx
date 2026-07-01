interface MainShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function MainShell({ children, title, subtitle }: MainShellProps) {
  return (
    <div className="py-5 mx-auto flex w-full max-w-7xl flex-col gap-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">
            {subtitle}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
