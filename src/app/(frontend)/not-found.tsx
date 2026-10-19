import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-h1">Page not found</h1>
      <p className="text-muted">That page doesn&apos;t exist or was moved.</p>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  );
}
