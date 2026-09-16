"use client";

// A plain <input> inside a <form> submits on Enter via the browser's native
// default behavior, which is solid on desktop but inconsistent across
// mobile soft-keyboards (the "Go"/"Search" key doesn't always map to a
// submit-triggering Enter the same way on every device) — worth being
// explicit about here specifically because field techs use this app mostly
// on phones. Handling it directly removes any dependence on that default.
export default function BuildingsSearchInput({
  defaultValue,
  placeholder,
}: {
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      name="q"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="input pl-9"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.form?.requestSubmit();
        }
      }}
    />
  );
}
