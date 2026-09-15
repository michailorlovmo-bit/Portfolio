import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORIES } from "@/lib/categories";
import ChecklistTemplateEditor from "@/components/ChecklistTemplateEditor";
import { getDictionary } from "@/lib/i18n/server";

export default async function ChecklistSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "MANAGER") redirect("/buildings");
  const { t } = await getDictionary();

  const items = await prisma.checklistTemplateItem.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t.checklistSettings.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{t.checklistSettings.description}</p>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((c) => (
          <ChecklistTemplateEditor
            key={c.key}
            category={c.key}
            labelEl={c.labelEl}
            labelEn={c.labelEn}
            items={items.filter((i) => i.category === c.key).map((i) => ({ id: i.id, label: i.label }))}
          />
        ))}
      </div>
    </div>
  );
}
