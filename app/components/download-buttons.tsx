import { DownloadIcon } from "lucide-react";
import { Button } from "react-aria-components";
import {
  issuesToCsv,
  locationsToGeoJSON,
  type LocationInfo,
  type ParsedAgs,
} from "~/parse/model";
import { downloadFile, stripExtension } from "~/util/download";

interface DownloadButtonsProps {
  parsed: ParsedAgs | null;
  allLocations: Array<LocationInfo>;
}

export function DownloadButtons({
  parsed,
  allLocations,
}: DownloadButtonsProps) {
  const base = parsed ? stripExtension(parsed.filename) : "ags";
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="btn-primary"
        isDisabled={!parsed}
        onPress={() => {
          if (parsed) {
            downloadFile(
              parsed.handle.toXlsx(),
              `${base}.xlsx`,
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            );
          }
        }}
      >
        <DownloadIcon size={14} /> Excel, one sheet per group
      </Button>
      <Button
        className="btn-secondary"
        isDisabled={!parsed}
        onPress={() => {
          if (parsed) {
            downloadFile(
              issuesToCsv(parsed),
              `${base}_parse_issues.csv`,
              "text/csv",
            );
          }
        }}
      >
        <DownloadIcon size={14} /> Issues (CSV)
      </Button>
      <Button
        className="btn-secondary"
        isDisabled={allLocations.every((l) => l.lon === null)}
        onPress={() => {
          downloadFile(
            JSON.stringify(locationsToGeoJSON(allLocations), null, 2),
            "ags_locations.geojson",
            "application/geo+json",
          );
        }}
      >
        <DownloadIcon size={14} /> Locations (GeoJSON)
      </Button>
    </div>
  );
}
