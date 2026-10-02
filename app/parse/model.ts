/**
 * The pure core of the app: parsed files, their Arrow tables and the facts
 * the UI needs from them (locations, strata, SPT and CPT series). Nothing in
 * here imports React.
 */
import type { AgsFile } from "@bedrock-engineer/ags-parse";
import { DataType, tableFromIPC, type Table, type Vector } from "apache-arrow";
import type { FeatureCollection } from "geojson";
import { loadAgsParse } from "./ags-parse";

export type Edition = "AGS3" | "AGS4";
export type Severity = "error" | "warning" | "info";

export interface Issue {
  severity: Severity;
  code: string;
  line: number | null;
  group: string | null;
  heading: string | null;
  row: number | null;
  value: string | null;
  message: string;
}

export interface GroupSummary {
  name: string;
  rows: number;
  columns: number;
  parent: string | null;
  keys: Array<string>;
  user_defined: boolean;
  line: number;
  headings: Array<string>;
}

export interface IssueCount {
  code: string;
  ags4_rule: string | null;
  severity: Severity;
  count: number;
}

export interface Summary {
  edition: Edition;
  declared_version: string | null;
  filename: string | null;
  size: number;
  sha256: string;
  encoding: string;
  line_endings: string;
  parser_version: string;
  groups: Array<GroupSummary>;
  errors: number;
  warnings: number;
  infos: number;
  issue_counts: Array<IssueCount>;
}

export interface ColumnMeta {
  group: string;
  heading: {
    name: string;
    unit: string;
    ags_type: string;
    user_defined: boolean;
  };
  unit: string;
  unit_source: string;
  ags_type: string;
  type_source: string;
  column_type: { type: string; format?: string };
  status: string | null;
  in_dictionary: boolean;
}

export interface ParsedAgs {
  /** Unique within the session; the file name, suffixed when it repeats. */
  id: string;
  filename: string;
  original: Blob;
  handle: AgsFile;
  summary: Summary;
  issues: Array<Issue>;
  columns: Array<ColumnMeta>;
  /** Arrow tables, decoded from IPC on first use. */
  tables: Map<string, Table>;
}

export async function parseAgsFile(file: File, id: string): Promise<ParsedAgs> {
  const mod = await loadAgsParse();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const handle = mod.parse(bytes, file.name, true, true);
  return {
    id,
    filename: file.name,
    original: file,
    handle,
    summary: handle.summary() as Summary,
    issues: handle.issues() as Array<Issue>,
    columns: handle.sourceColumns() as Array<ColumnMeta>,
    tables: new Map(),
  };
}

export function groupTable(parsed: ParsedAgs, name: string): Table | null {
  if (!parsed.handle.hasGroup(name)) {
    return null;
  }
  let table = parsed.tables.get(name);
  if (!table) {
    table = tableFromIPC(parsed.handle.groupIpc(name));
    parsed.tables.set(name, table);
  }
  return table;
}

export function columnsOf(parsed: ParsedAgs, group: string): Array<ColumnMeta> {
  return parsed.columns.filter((c) => c.group === group);
}

/** A cell as a number, whatever Arrow handed back (number, bigint, string). */
export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatDate(d: Date, withTime: boolean): string {
  const date = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  if (!withTime) {
    return date;
  }
  return `${date} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** apache-arrow types `Vector.get()` as `any`; this is the one place that accepts it. */
function cellValue(vector: Vector, row: number): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return vector.get(row);
}

/** Any value as text; objects become JSON rather than "[object Object]". */
export function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  switch (typeof value) {
    case "string":
      return value;
    case "number":
      return Number.isInteger(value)
        ? String(value)
        : String(Number(value.toPrecision(10)));
    case "bigint":
      return value.toString();
    case "boolean":
      return value ? "Y" : "N";
    default:
      return value instanceof Date
        ? value.toISOString()
        : JSON.stringify(value);
  }
}

/** A cell as display text, using the column's Arrow type for dates and timestamps. */
export function formatCell(table: Table, column: string, row: number): string {
  const vector = table.getChild(column);
  if (!vector) {
    return "";
  }
  const value = cellValue(vector, row);
  if (value === null || value === undefined) {
    return "";
  }
  const type = vector.type;
  if (DataType.isDate(type) || DataType.isTimestamp(type)) {
    const ms = value instanceof Date ? value.getTime() : asNumber(value);
    if (ms !== null) {
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) {
        return formatDate(d, DataType.isTimestamp(type));
      }
    }
  }
  return toText(value);
}

function num(table: Table, column: string, row: number): number | null {
  const v = table.getChild(column);
  return v ? asNumber(cellValue(v, row)) : null;
}

function str(table: Table, column: string, row: number): string | null {
  const v = table.getChild(column);
  if (!v) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const value: unknown = v.get(row);
  return value === null || value === undefined
    ? null
    : formatCell(table, column, row);
}

/** Location (borehole, CPT, pit) facts; AGS4 LOCA or AGS3 HOLE. */
export interface LocationInfo {
  fileId: string;
  id: string;
  type: string | null;
  easting: number | null;
  northing: number | null;
  groundLevel: number | null;
  finalDepth: number | null;
  startDate: string | null;
  lon: number | null;
  lat: number | null;
}

export function locationGroup(edition: Edition): {
  group: string;
  prefix: string;
} {
  return edition === "AGS4"
    ? { group: "LOCA", prefix: "LOCA" }
    : { group: "HOLE", prefix: "HOLE" };
}

export function locationIdColumn(edition: Edition): string {
  return edition === "AGS4" ? "LOCA_ID" : "HOLE_ID";
}

export function extractLocations(
  parsed: ParsedAgs,
  toLonLat:
    ((easting: number, northing: number) => [number, number] | null) | null,
): Array<LocationInfo> {
  const { group, prefix } = locationGroup(parsed.summary.edition);
  const table = groupTable(parsed, group);
  if (!table) {
    return [];
  }
  const out: Array<LocationInfo> = [];
  for (let r = 0; r < table.numRows; r++) {
    const id = str(table, `${prefix}_ID`, r);
    if (!id) {
      continue;
    }
    const easting = num(table, `${prefix}_NATE`, r);
    const northing = num(table, `${prefix}_NATN`, r);
    let lon: number | null = null;
    let lat: number | null = null;
    if (toLonLat && easting !== null && northing !== null) {
      const ll = toLonLat(easting, northing);
      if (ll) {
        [lon, lat] = ll;
      }
    }
    out.push({
      fileId: parsed.id,
      id,
      type: str(table, `${prefix}_TYPE`, r),
      easting,
      northing,
      groundLevel: num(table, `${prefix}_GL`, r),
      finalDepth: num(table, `${prefix}_FDEP`, r),
      startDate: str(table, `${prefix}_STAR`, r),
      lon,
      lat,
    });
  }
  return out;
}

export interface Stratum {
  top: number;
  base: number | null;
  description: string | null;
  legend: string | null;
  code: string | null;
}

/** Rows of `group` that belong to one location, as row indices. */
function rowsFor(
  parsed: ParsedAgs,
  group: string,
  locationId: string,
): { table: Table; rows: Array<number> } | null {
  const table = groupTable(parsed, group);
  if (!table) {
    return null;
  }
  const idVector = table.getChild(locationIdColumn(parsed.summary.edition));
  if (!idVector) {
    return null;
  }
  const rows: Array<number> = [];
  for (let r = 0; r < table.numRows; r++) {
    if (idVector.get(r) === locationId) {
      rows.push(r);
    }
  }
  return { table, rows };
}

export function strataFor(
  parsed: ParsedAgs,
  locationId: string,
): Array<Stratum> {
  const found = rowsFor(parsed, "GEOL", locationId);
  if (!found) {
    return [];
  }
  const { table, rows } = found;
  return rows
    .map((r) => ({
      top: num(table, "GEOL_TOP", r),
      base: num(table, "GEOL_BASE", r),
      description: str(table, "GEOL_DESC", r),
      legend: str(table, "GEOL_LEG", r),
      code: str(table, "GEOL_GEOL", r) ?? str(table, "GEOL_LEG", r),
    }))
    .filter((s): s is Stratum => s.top !== null)
    .sort((a, b) => a.top - b.top);
}

export interface DepthValue {
  depth: number;
  value: number;
}

export function sptFor(
  parsed: ParsedAgs,
  locationId: string,
): Array<DepthValue> {
  const found = rowsFor(parsed, "ISPT", locationId);
  if (!found) {
    return [];
  }
  const { table, rows } = found;
  const out: Array<DepthValue> = [];
  for (const r of rows) {
    const depth = num(table, "ISPT_TOP", r);
    const value = num(table, "ISPT_NVAL", r);
    if (depth !== null && value !== null) {
      out.push({ depth, value });
    }
  }
  return out.sort((a, b) => a.depth - b.depth);
}

export interface CptReading {
  depth: number;
  qc: number | null;
  fs: number | null;
}

/** Cone resistance and sleeve friction: AGS4 SCPT, AGS3 STCN. */
export function cptFor(
  parsed: ParsedAgs,
  locationId: string,
): { unit: string; readings: Array<CptReading> } {
  const ags4 = parsed.summary.edition === "AGS4";
  const group = ags4 ? "SCPT" : "STCN";
  const found = rowsFor(parsed, group, locationId);
  if (!found) {
    return { unit: "", readings: [] };
  }
  const { table, rows } = found;
  const depthCol = ags4 ? "SCPT_DPTH" : "STCN_DPTH";
  const qcCol = ags4 ? "SCPT_RES" : "STCN_RES";
  const fsCol = ags4 ? "SCPT_FRES" : "STCN_FRES";
  const unit =
    columnsOf(parsed, group).find((c) => c.heading.name === qcCol)?.unit ?? "";
  const readings: Array<CptReading> = [];
  for (const r of rows) {
    const depth = num(table, depthCol, r);
    if (depth !== null) {
      readings.push({
        depth,
        qc: num(table, qcCol, r),
        fs: num(table, fsCol, r),
      });
    }
  }
  return { unit, readings: readings.sort((a, b) => a.depth - b.depth) };
}

export function locationsToGeoJSON(
  locations: Array<LocationInfo>,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: locations
      .filter(
        (l): l is LocationInfo & { lon: number; lat: number } =>
          l.lon !== null && l.lat !== null,
      )
      .map((l) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [l.lon, l.lat] },
        properties: {
          file: l.fileId,
          location_id: l.id,
          type: l.type,
          easting: l.easting,
          northing: l.northing,
          ground_level: l.groundLevel,
          final_depth: l.finalDepth,
          start_date: l.startDate,
        },
      })),
  };
}

/** Issues as CSV text (for download). */
export function issuesToCsv(parsed: ParsedAgs): string {
  const esc = (v: unknown) => {
    const s = toText(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const header = [
    "filename",
    "severity",
    "code",
    "line",
    "group",
    "heading",
    "row",
    "value",
    "message",
  ];
  const lines = parsed.issues.map((i) =>
    [
      parsed.filename,
      i.severity,
      i.code,
      i.line,
      i.group,
      i.heading,
      i.row,
      i.value,
      i.message,
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
