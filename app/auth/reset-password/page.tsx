import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-8">
      <Link href="/" className="text-2xl lowercase font-bold text-navy">
        sidro
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6">Postavite novu lozinku</h1>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
