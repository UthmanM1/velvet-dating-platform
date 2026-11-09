import { Logo } from "@/components/logo";
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="hero-art">
      <div className={`container-x py-16 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
        <div className="card p-7 sm:p-10">
          <div className="mb-8 text-center"><Logo className="mb-6" compact /><h1 className="text-4xl">{title}</h1>{subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}</div>
          {children}
        </div>
      </div>
    </div>
  );
}
