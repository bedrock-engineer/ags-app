import type { LocationInfo } from "~/parse/model";
import { formatNumber } from "~/util/format";

interface LocationListProps {
  locations: Array<LocationInfo>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LocationList({
  locations,
  selectedId,
  onSelect,
}: LocationListProps) {
  if (locations.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No locations (LOCA or HOLE group) in this file.
      </p>
    );
  }
  return (
    <div className="max-h-[420px] overflow-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Location</th>
            <th>Type</th>
            <th className="text-right">GL</th>
            <th className="text-right">Depth</th>
            <th>Started</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((l) => (
            <tr
              key={l.id}
              aria-selected={l.id === selectedId}
              className="cursor-pointer"
              onClick={() => {
                onSelect(l.id);
              }}
            >
              <td className="font-medium">{l.id}</td>
              <td>{l.type ?? ""}</td>
              <td className="text-right tabular-nums">
                {formatNumber(l.groundLevel)}
              </td>
              <td className="text-right tabular-nums">
                {formatNumber(l.finalDepth)}
              </td>
              <td>{l.startDate ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
