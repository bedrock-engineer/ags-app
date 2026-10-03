import { CrsPicker } from "@bedrock-engineer/crs-picker";
import type { CrsIndex, CrsKind, KnownPosition, Point, Shortlist } from "@bedrock-engineer/crs-index";
import type { ParsedAgs } from "~/parse/model";

interface CrsPanelProps {
  index: CrsIndex | null;
  selectedFile: ParsedAgs | null;
  /** Coordinates of the selected file's locations, in its unknown grid. */
  points: ReadonlyArray<Point>;
  /** Text from the file that may name the place or the grid. */
  hints: ReadonlyArray<string>;
  /** Locations the file also gives as latitude and longitude. */
  known: ReadonlyArray<KnownPosition>;
  kinds: ReadonlyArray<CrsKind>;
  /** The code in effect for the selected file (chosen or suggested). */
  value: number | null;
  chosen: boolean;
  shortlist: Shortlist | null;
  onChange: (code: number | null) => void;
  shown: number;
  total: number;
}

/** The three-level picker for the selected file, and a note on what the map shows. */
export function CrsPanel({ index, selectedFile, points, hints, known, kinds, value, chosen, shortlist, onChange, shown, total }: CrsPanelProps) {
  if (!selectedFile) {
    return <p className="text-sm text-gray-500">Pick a file to set the grid of its coordinates.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <CrsPicker
        index={index}
        value={value}
        onChange={(code) => {
          onChange(code);
        }}
        points={points}
        hints={hints}
        known={known}
        shortlist={shortlist}
        kinds={kinds}
        label={`Grid of ${selectedFile.summary.edition === "AGS4" ? "LOCA_NATE / LOCA_NATN" : "HOLE_NATE / HOLE_NATN"} in ${selectedFile.filename}`}
      />
      <p className="text-xs text-gray-500">
        {value === null
          ? "No grid fits these coordinates; pick one to place the file on the map."
          : chosen
            ? "Chosen by you."
            : known.length > 0
              ? `Suggested from the coordinates and ${known.length} location${known.length === 1 ? "" : "s"} with a latitude and longitude; pick another if the file says otherwise.`
              : "Suggested from the coordinates; pick another if the file says otherwise."}{" "}
        The map shows {shown} of {total} locations across all files.
      </p>
    </div>
  );
}
