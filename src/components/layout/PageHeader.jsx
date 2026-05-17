import Link from "next/link";

export default function PageHeader({ title, description, breadcrumbs = [], action }) {
  return (
    <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <nav className="mb-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link className="text-dinkes-800 hover:text-dinkes-700" href="/dashboard">Beranda</Link></li>
            {breadcrumbs.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className="text-slate-300">/</span>
                {item.href ? <Link className="hover:text-dinkes-700" href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="app-heading text-2xl sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">{description}</p> : null}
      </div>
      {action ? <div className="w-full lg:w-auto">{action}</div> : null}
    </header>
  );
}
