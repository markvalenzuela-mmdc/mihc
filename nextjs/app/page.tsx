import { LoginForm } from "./_components/login-form";
import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/smoke-testing");
  }

  return <LoginForm />;
}
