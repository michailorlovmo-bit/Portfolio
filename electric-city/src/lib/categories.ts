export type CategoryKey =
  | "SURVEY"
  | "EARTHWORKS"
  | "CONSTRUCTION"
  | "BLOWING"
  | "SPLICING";

export interface CategoryDef {
  key: CategoryKey;
  order: number;
  labelEl: string;
  labelEn: string;
  requiresTelekomApproval: boolean;
}

// Fixed pipeline, in order. EARTHWORKS is additionally gated on the
// building's manual Telekom clearance, on top of the previous phase being DONE.
export const CATEGORIES: CategoryDef[] = [
  { key: "SURVEY", order: 1, labelEl: "Αυτοψίες", labelEn: "Site Survey", requiresTelekomApproval: false },
  { key: "EARTHWORKS", order: 2, labelEl: "Χωματουργοί", labelEn: "Earthworks", requiresTelekomApproval: true },
  { key: "CONSTRUCTION", order: 3, labelEl: "Κατασκευαστές", labelEn: "Construction", requiresTelekomApproval: false },
  { key: "BLOWING", order: 4, labelEl: "Εμφυσητές", labelEn: "Fiber Blowing", requiresTelekomApproval: false },
  { key: "SPLICING", order: 5, labelEl: "Κολλητές", labelEn: "Splicing", requiresTelekomApproval: false },
];

export function categoryDef(key: string): CategoryDef {
  const def = CATEGORIES.find((c) => c.key === key);
  if (!def) throw new Error(`Unknown category: ${key}`);
  return def;
}

export function categoryLabel(key: string): string {
  const def = CATEGORIES.find((c) => c.key === key);
  return def ? `${def.labelEl} (${def.labelEn})` : key;
}
