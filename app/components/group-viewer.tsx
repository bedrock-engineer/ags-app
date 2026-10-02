import { DownloadIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "react-aria-components";
import {
  columnsOf,
  formatCell,
  groupTable,
  type ParsedAgs,
} from "~/parse/model";
import { downloadFile, stripExtension } from "~/util/download";

interface GroupViewerProps {
  parsed: ParsedAgs;
  group: string | null;
  onGroupChange: (name: string) => void;
}

const PAGE = 200;

/** One group as a table: headings, units and types on top, then the rows. */
export function GroupViewer({
  parsed,
  group,
  onGroupChange,
}: GroupViewerProps) {
  const [limit, setLimit] = useState(PAGE);
  const [filter, setFilter] = useState("");
  const name =
    group && parsed.handle.hasGroup(group)
      ? group
      : (parsed.summary.groups[0]?.name ?? null);
  const table = name ? groupTable(parsed, name) : null;
  const columns = name ? columnsOf(parsed, name) : [];
  const headings = useMemo(
    () => (table ? table.schema.fields.map((f) => f.name) : []),
    [table],
  );

  const rows = useMemo(() => {
    if (!table) {
      return [];
    }
    const all = Array.from({ length: table.numRows }, (_, i) => i);
    if (!filter.trim()) {
      return all;
    }
    const needle = filter.trim().toLowerCase();
    return all.filter((r) =>
      headings.some((h) =>
        formatCell(table, h, r).toLowerCase().includes(needle),
      ),
    );
  }, [table, headings, filter]);

  if (!name || !table) {
    return <p className="text-sm text-gray-500">This file has no groups.</p>;
  }
  const meta = (h: string) => columns.find((c) => c.heading.name === h);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <label className="text-sm">
          Group{" "}
          <select
            className="border border-gray-300 rounded-sm px-1 py-0.5 text-sm font-mono"
            value={name}
            onChange={(e) => {
              onGroupChange(e.target.value);
              setLimit(PAGE);
            }}
          >
            {parsed.summary.groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name} ({g.rows})
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          placeholder="Filter rows"
          className="border border-gray-300 rounded-sm px-2 py-0.5 text-sm"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setLimit(PAGE);
          }}
        />
        <span className="text-xs text-gray-500">
          {rows.length === table.numRows
            ? `${table.numRows} rows`
            : `${rows.length} of ${table.numRows} rows`}
        </span>
        <Button
          className="btn-secondary ml-auto"
          onPress={() => {
            downloadFile(
              parsed.handle.groupIpc(name),
              `${stripExtension(parsed.filename)}_${name}.arrow`,
              "application/vnd.apache.arrow.stream",
            );
          }}
        >
          <DownloadIcon size={14} /> Arrow
        </Button>
      </div>
      <div className="max-h-[560px] overflow-auto border border-gray-200 rounded-sm">
        <table className="data-table">
          <thead>
            <tr>
              {headings.map((h) => (
                <th key={h} className="font-mono">
                  {h}
                </th>
              ))}
            </tr>
            <tr>
              {headings.map((h) => (
                <th key={h} className="font-normal text-gray-500 top-[25px]">
                  {meta(h)?.unit ?? ""}
                </th>
              ))}
            </tr>
            <tr>
              {headings.map((h) => (
                <th
                  key={h}
                  className="font-normal text-gray-500 top-[50px]"
                  title={
                    meta(h)
                      ? `${meta(h)?.column_type.type} (${meta(h)?.type_source})`
                      : ""
                  }
                >
                  {meta(h)?.ags_type ?? ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r}>
                {headings.map((h) => (
                  <td
                    key={h}
                    className="max-w-[28rem] overflow-hidden text-ellipsis"
                  >
                    {formatCell(table, h, r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <Button
          className="btn-secondary mt-2"
          onPress={() => {
            setLimit((l) => l + PAGE * 5);
          }}
        >
          Show more ({rows.length - limit} rows left)
        </Button>
      )}
    </div>
  );
}
