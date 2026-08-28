"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "../../auth";

export async function authenticate(
  _state: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return "The email or password is incorrect.";
    throw error;
  }
  redirect("/");
}
