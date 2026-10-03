import { useMemo, useState } from "react";
import type { ParsedAgs, Severity } from "~/parse/model";

interface IssuesPanelProps {
  parsed: ParsedAgs;
}

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
const BADGE: Record<Severity, string> = {
  error: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-gray-100 text-gray-700",
};

/** Every parse issue, grouped by severity, with the file summary on top. */
export function IssuesPanel({ parsed }: IssuesPanelProps) {
  const [show, setShow] = useState<Record<Severity, boolean>>({
    error: true,
    warning: true,
    info: false,
  });
  const [limit, setLimit] = useState(300);

  const issues = useMemo(
    () =>
      [...parsed.issues]
        .filter((i) => show[i.severity])
        .sort(
          (a, b) =>
            ORDER[a.severity] - ORDER[b.severity] ||
            (a.line ?? 0) - (b.line ?? 0),
        ),
    [parsed.issues, show],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center mb-3 text-sm">
        {(["error", "warning", "info"] as const).map((sev) => (
          <label key={sev} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={show[sev]}
              onChange={(e) => {
                setShow({ ...show, [sev]: e.target.checked });
              }}
            />
            <span className={`px-1.5 rounded-sm text-xs ${BADGE[sev]}`}>
              {sev}
            </span>
            <span className="text-gray-500">
              {parsed.issues.filter((i) => i.severity === sev).length}
            </span>
          </label>
        ))}
      </div>
      {parsed.summary.issue_counts.length > 0 && (
        <table className="data-table mb-3">
          <thead>
            <tr>
              <th>Code</th>
              <th>AGS4 rule</th>
              <th>Severity</th>
              <th className="text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {parsed.summary.issue_counts.map((c) => (
              <tr key={c.code}>
                <td className="font-mono">{c.code}</td>
                <td>{c.ags4_rule ?? "-"}</td>
                <td>
                  <span
                    className={`px-1.5 rounded-sm text-xs ${BADGE[c.severity]}`}
                  >
                    {c.severity}
                  </span>
                </td>
                <td className="text-right tabular-nums">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {issues.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing to show.</p>
      ) : (
        <div className="max-h-[520px] overflow-auto border border-gray-200 rounded-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Line</th>
                <th>Group.heading</th>
                <th>Value</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {issues.slice(0, limit).map((i, idx) => (
                <tr key={idx}>
                  <td>
                    <span
                      className={`px-1.5 rounded-sm text-xs ${BADGE[i.severity]}`}
                    >
                      {i.severity}
                    </span>
                  </td>
                  <td className="tabular-nums">{i.line ?? ""}</td>
                  <td className="font-mono">
                    {[i.group, i.heading].filter(Boolean).join(".")}
                  </td>
                  <td className="font-mono max-w-[16rem] overflow-hidden text-ellipsis">
                    {i.value ?? ""}
                  </td>
                  <td className="whitespace-normal">{i.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {issues.length > limit && (
        <button
          type="button"
          className="btn-secondary mt-2"
          onClick={() => {
            setLimit((l) => l + 1000);
          }}
        >
          Show more ({issues.length - limit} left)
        </button>
      )}
    </div>
  );
}
