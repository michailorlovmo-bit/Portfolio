import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import { getDictionary } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/dictionary";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { t } = await getDictionary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t.accountPage.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {tr(t.accountPage.signedInAs, {
            name: session.user.name || "",
            email: session.user.email || "",
          })}
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
