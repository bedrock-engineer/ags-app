import type { GroupSummary, ParsedAgs } from "~/parse/model";
import { formatBytes } from "~/util/format";

interface OverviewProps {
  parsed: ParsedAgs;
  onOpenGroup: (name: string) => void;
}

/** Facts about the file and its groups as a tree by parent group. */
export function Overview({ parsed, onOpenGroup }: OverviewProps) {
  const s = parsed.summary;
  const byParent = new Map<string | null, Array<GroupSummary>>();
  for (const g of s.groups) {
    const key =
      g.parent && s.groups.some((p) => p.name === g.parent) ? g.parent : null;
    const list = byParent.get(key) ?? [];
    list.push(g);
    byParent.set(key, list);
  }
  const render = (
    parent: string | null,
    depth: number,
  ): Array<React.ReactNode> =>
    (byParent.get(parent) ?? []).flatMap((g) => [
      <tr
        key={g.name}
        className="cursor-pointer"
        onClick={() => {
          onOpenGroup(g.name);
        }}
      >
        <td style={{ paddingLeft: `${8 + depth * 16}px` }}>
          <span className="font-mono font-medium">
            {g.user_defined ? `?${g.name}` : g.name}
          </span>
        </td>
        <td className="text-right tabular-nums">{g.rows}</td>
        <td className="text-right tabular-nums">{g.columns}</td>
        <td className="font-mono text-gray-500">{g.keys.join(", ")}</td>
      </tr>,
      ...(g.name === parent ? [] : render(g.name, depth + 1)),
    ]);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <dl className="text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 content-start">
        <dt className="text-gray-500">Edition</dt>
        <dd>
          {s.edition}
          {s.declared_version ? ` (file says ${s.declared_version})` : ""}
        </dd>
        <dt className="text-gray-500">Size</dt>
        <dd>{formatBytes(s.size)}</dd>
        <dt className="text-gray-500">Encoding</dt>
        <dd>
          {s.encoding}, {s.line_endings} line endings
        </dd>
        <dt className="text-gray-500">SHA-256</dt>
        <dd className="font-mono text-xs break-all">{s.sha256}</dd>
        <dt className="text-gray-500">Groups</dt>
        <dd>
          {s.groups.length}, {s.groups.reduce((n, g) => n + g.rows, 0)} rows in
          total
        </dd>
        <dt className="text-gray-500">Issues</dt>
        <dd>
          {s.errors} errors, {s.warnings} warnings, {s.infos} notes
        </dd>
        <dt className="text-gray-500">Parser</dt>
        <dd>ags-parse {s.parser_version}</dd>
      </dl>
      <div className="max-h-[480px] overflow-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Group</th>
              <th className="text-right">Rows</th>
              <th className="text-right">Cols</th>
              <th>Key headings</th>
            </tr>
          </thead>
          <tbody>{render(null, 0)}</tbody>
        </table>
        <p className="text-xs text-gray-500 mt-1">
          Groups are nested under their parent group. Click a group to open its
          table.
        </p>
      </div>
    </div>
  );
}
