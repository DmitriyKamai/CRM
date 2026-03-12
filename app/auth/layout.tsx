import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center px-6 py-3">
          <Link href="/" className="tangerine-bold text-5xl text-foreground leading-none">
            Empatix
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
