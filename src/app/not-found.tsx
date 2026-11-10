import Link from "next/link";
export default function NotFound() {
  return (<main className="grid min-h-dvh place-items-center px-6 text-center"><div><p className="eyebrow">404</p><h1 className="mt-3 text-6xl">Not found</h1><p className="mt-3 text-muted">That page or member isn&apos;t available.</p><Link href="/" className="btn btn-primary mt-8">Return home</Link></div></main>);
}
