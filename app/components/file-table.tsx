import { DownloadIcon, XIcon } from "lucide-react";
import type { FileDropItem } from "react-aria-components";
import { Button, DropZone } from "react-aria-components";
import type { ParsedAgs } from "~/parse/model";
import { fileColor } from "~/util/format";

interface FileTableProps {
  files: Array<ParsedAgs>;
  locationCounts: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDrop: (files: Array<File>) => void;
  onDownload: (id: string) => void;
  onRemove: (id: string) => void;
}

export function FileTable({
  files,
  locationCounts,
  selectedId,
  onSelect,
  onDrop,
  onDownload,
  onRemove,
}: FileTableProps) {
  const handleDrop = async (event: {
    items: ReadonlyArray<{ kind: string }>;
  }) => {
    const items = event.items.filter(
      (item): item is FileDropItem => item.kind === "file",
    );
    onDrop(await Promise.all(items.map((item) => item.getFile())));
  };

  return (
    <DropZone
      className="file-dropzone rounded-sm"
      onDrop={(event) => {
        handleDrop(event).catch((error: unknown) => {
          console.error(error);
        });
      }}
    >
      {files.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          Drop AGS files here
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Edition</th>
              <th className="text-right">Groups</th>
              <th className="text-right">Locations</th>
              <th className="text-right">Issues</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f, index) => (
              <tr
                key={f.id}
                aria-selected={f.id === selectedId}
                className="cursor-pointer"
                onClick={() => {
                  onSelect(f.id);
                }}
              >
                <td>
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: fileColor(index) }}
                  />
                  <span className="align-middle" title={f.filename}>
                    {f.filename}
                  </span>
                </td>
                <td>
                  {f.summary.edition}
                  {f.summary.declared_version
                    ? ` ${f.summary.declared_version}`
                    : ""}
                </td>
                <td className="text-right tabular-nums">
                  {f.summary.groups.length}
                </td>
                <td className="text-right tabular-nums">
                  {locationCounts[f.id] ?? 0}
                </td>
                <td className="text-right tabular-nums">
                  {f.summary.errors > 0 && (
                    <span className="text-red-700">{f.summary.errors} err</span>
                  )}
                  {f.summary.errors > 0 && f.summary.warnings > 0 && " "}
                  {f.summary.warnings > 0 && (
                    <span className="text-amber-700">
                      {f.summary.warnings} warn
                    </span>
                  )}
                  {f.summary.errors === 0 && f.summary.warnings === 0 && (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-0.5">
                    <Button
                      onPress={() => {
                        onDownload(f.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded-sm text-gray-500 hover:text-gray-700"
                      aria-label="Download original file"
                    >
                      <DownloadIcon size={14} />
                    </Button>
                    <Button
                      onPress={() => {
                        onRemove(f.id);
                      }}
                      className="p-1 hover:bg-gray-200 rounded-sm text-gray-500 hover:text-gray-700"
                      aria-label="Remove file"
                    >
                      <XIcon size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DropZone>
  );
}
