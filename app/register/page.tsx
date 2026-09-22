import Link from "next/link";
import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 gap-8">
      <Link href="/" className="text-2xl lowercase font-bold text-navy">
        sidro
      </Link>
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-6">Registracija</h1>
        <RegisterForm />
        <p className="text-sm mt-6">
          Već imate račun?{" "}
          <Link href="/login" className="text-slate underline">
            Prijavite se
          </Link>
        </p>
      </div>
    </main>
  );
}
