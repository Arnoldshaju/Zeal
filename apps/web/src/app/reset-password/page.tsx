import { ResetPasswordClient } from "./reset-password-client";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; uid?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordClient uid={params.uid ?? ""} token={params.token ?? ""} />;
}
