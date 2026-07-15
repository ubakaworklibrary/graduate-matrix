import GraduateMatrixApp from "../components/graduate-matrix/GraduateMatrixApp";
import LoginForm from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <LoginForm />;
  }

  return <GraduateMatrixApp />;
}
