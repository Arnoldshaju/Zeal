import { VerifyEmailClient } from "./verify-email-client";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; uid?: string }>;
}) {
  const params = await searchParams;
  return (
    <VerifyEmailClient
      initialEmail={params.email ?? ""}
      uid={params.uid ?? ""}
      token={params.token ?? ""}
    />
  );
}
