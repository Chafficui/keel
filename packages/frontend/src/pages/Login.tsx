import LoginForm from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src="/images/logo.png" alt="Keel" className="h-12 w-12" />
          <h1 className="text-xl font-semibold text-white">Sign in to Keel</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
