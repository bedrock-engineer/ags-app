/**
 * Coordinate reference systems for AGS national grid coordinates
 * (LOCA_NATE/LOCA_NATN, HOLE_NATE/HOLE_NATN). AGS files rarely say which grid
 * they use, so the app guesses from the coordinate ranges and lets the user
 * override it. proj4 Helmert transforms: metre-level, fine for a map.
 */
import proj4 from "proj4";

interface CrsOption {
  code: string;
  name: string;
  def?: string;
}

export const AUTO = "auto";

export const CRS_OPTIONS: Array<CrsOption> = [
  { code: AUTO, name: "Detect from coordinates" },
  {
    code: "EPSG:27700",
    name: "British National Grid (EPSG:27700)",
    def: "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs",
  },
  {
    code: "EPSG:2326",
    name: "Hong Kong 1980 Grid (EPSG:2326)",
    def: "+proj=tmerc +lat_0=22.3121333333333 +lon_0=114.178555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.09425 +units=m +no_defs",
  },
  {
    code: "EPSG:2157",
    name: "Irish Transverse Mercator (EPSG:2157)",
    def: "+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=0.99982 +x_0=600000 +y_0=750000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  },
  {
    code: "EPSG:29903",
    name: "Irish Grid (EPSG:29903)",
    def: "+proj=tmerc +lat_0=53.5 +lon_0=-8 +k=1.000035 +x_0=200000 +y_0=250000 +ellps=mod_airy +towgs84=482.5,-130.6,564.6,-1.042,-0.214,-0.631,8.15 +units=m +no_defs",
  },
  {
    code: "EPSG:28992",
    name: "RD New, Netherlands (EPSG:28992)",
    def: "+proj=sterea +lat_0=52.1561605555556 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.4171,50.3319,465.5524,1.9342,-1.6677,9.1019,4.0725 +units=m +no_defs",
  },
  {
    code: "EPSG:31370",
    name: "Belgian Lambert 72 (EPSG:31370)",
    def: "+proj=lcc +lat_0=90 +lon_0=4.36748666666667 +lat_1=51.1666672333333 +lat_2=49.8333339 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs",
  },
  {
    code: "EPSG:25831",
    name: "ETRS89 / UTM 31N (EPSG:25831)",
    def: "+proj=utm +zone=31 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  },
  {
    code: "EPSG:25832",
    name: "ETRS89 / UTM 32N (EPSG:25832)",
    def: "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  },
  {
    code: "EPSG:25833",
    name: "ETRS89 / UTM 33N (EPSG:25833)",
    def: "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  },
  {
    code: "EPSG:2193",
    name: "New Zealand Transverse Mercator (EPSG:2193)",
    def: "+proj=tmerc +lat_0=0 +lon_0=173 +k=0.9996 +x_0=1600000 +y_0=10000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
  },
  { code: "EPSG:3857", name: "Web Mercator (EPSG:3857)" },
  { code: "EPSG:4326", name: "Longitude / latitude (EPSG:4326)" },
];

let defined = false;
function defineAll() {
  if (defined) {
    return;
  }
  for (const c of CRS_OPTIONS) {
    if (c.def) {
      proj4.defs(c.code, c.def);
    }
  }
  defined = true;
}

/** Guess the grid from where the coordinates fall. Returns an EPSG code or null. */
export function detectCrs(
  points: Array<{ easting: number | null; northing: number | null }>,
): string | null {
  const pts = points.filter(
    (p) => p.easting !== null && p.northing !== null,
  ) as Array<{ easting: number; northing: number }>;
  if (pts.length === 0) {
    return null;
  }
  const e = median(pts.map((p) => p.easting));
  const n = median(pts.map((p) => p.northing));
  if (Math.abs(e) <= 180 && Math.abs(n) <= 90) {
    return "EPSG:4326";
  }
  if (e > 790_000 && e < 870_000 && n > 790_000 && n < 860_000) {
    return "EPSG:2326"; // Hong Kong
  }
  if (e > 0 && e < 700_000 && n > 0 && n < 1_300_000) {
    if (e < 300_000 && n > 300_000 && n < 625_000 && e > -10) {
      // overlaps Ireland and Scotland; British grid is far more common in AGS
    }
    return "EPSG:27700";
  }
  if (e > -7_000 && e < 300_000 && n > 289_000 && n < 629_000) {
    return "EPSG:28992";
  }
  if (e > 1_000_000 && e < 2_200_000 && n > 4_700_000 && n < 6_300_000) {
    return "EPSG:2193";
  }
  return null;
}

function median(xs: Array<number>): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

export function makeToLonLat(
  code: string,
): ((easting: number, northing: number) => [number, number] | null) | null {
  if (code === AUTO) {
    return null;
  }
  defineAll();
  if (code === "EPSG:4326") {
    return (e, n) => [e, n];
  }
  return (e, n) => {
    try {
      const [lon, lat] = proj4(code, "EPSG:4326", [e, n]);
      if (
        !Number.isFinite(lon) ||
        !Number.isFinite(lat) ||
        Math.abs(lat) > 90
      ) {
        return null;
      }
      return [lon, lat];
    } catch {
      return null;
    }
  };
}
