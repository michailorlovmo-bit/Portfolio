// Building a CSV file from user-entered strings (building names, staff/
// subcontractor names, notes, checklist labels...) has to defend against
// CSV/formula injection: a cell starting with =, +, -, @ (or a tab/CR) is
// read as a formula by Excel/Sheets/LibreOffice when the file is opened —
// which can exfiltrate data via HYPERLINK() or, in older Excel versions,
// run commands via DDE. Prefixing such a cell with a single quote forces
// text interpretation without changing what's displayed.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let s = String(cell ?? "");
          if (FORMULA_TRIGGER.test(s)) s = `'${s}`;
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
}
