import { redirect } from "next/navigation";

/** Auth disabled — send everyone to the app. */
export default function LoginPage() {
  redirect("/");
}
