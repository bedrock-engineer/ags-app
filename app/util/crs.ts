/**
 * Coordinate reference systems come from @bedrock-engineer/crs-index: every
 * EPSG CRS with its area of use and extent, built from PROJ. The index and the
 * proj4 definitions are fetched once, on the client, the first time a file
 * needs them.
 */
import { loadIndex, loadProj4Defs, type CrsIndex } from "@bedrock-engineer/crs-index";
import { setProj4Defs } from "@bedrock-engineer/crs-index/transform";
import indexUrl from "@bedrock-engineer/crs-index/data/index.json?url";
import proj4Url from "@bedrock-engineer/crs-index/data/proj4.json?url";

let loading: Promise<CrsIndex> | undefined;

export function loadCrs(): Promise<CrsIndex> {
  loading ??= (async () => {
    const [index, defs] = await Promise.all([loadIndex(indexUrl), loadProj4Defs(proj4Url)]);
    setProj4Defs(defs);
    return index;
  })();
  return loading;
}

export { rankByResidual, toLonLat } from "@bedrock-engineer/crs-index/transform";
export { getShortlist, AGS_SHORTLIST_ID, shortlistPriors, suggestCrs } from "@bedrock-engineer/crs-index";
