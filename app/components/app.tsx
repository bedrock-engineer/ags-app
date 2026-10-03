import { UploadIcon } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import {
  Button,
  FileTrigger,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "react-aria-components";
import { crsHints, extractLocations, knownPositions, parseAgsFile, type LocationInfo, type ParsedAgs } from "~/parse/model";
import type { CrsIndex, CrsKind, KnownPosition, Point } from "@bedrock-engineer/crs-index";
import { AGS_SHORTLIST_ID, getShortlist, loadCrs, rankByResidual, shortlistPriors, suggestCrs, toLonLat } from "~/util/crs";
import { CrsPanel } from "./crs-panel";
import { downloadFile } from "~/util/download";
import { BoreholeLog } from "./borehole-log";
import { DownloadButtons } from "./download-buttons";
import { FileTable } from "./file-table";
import { GroupViewer } from "./group-viewer";
import { Header } from "./header";
import { IssuesPanel } from "./issues-panel";
import { LocationList } from "./location-list";
import { Overview } from "./overview";

// maplibre-gl is about 1 MB; load it only on the client, only when needed.
const AgsMap = lazy(() =>
  import("./map/ags-map.client").then((m) => ({ default: m.AgsMap })),
);

const SAMPLES = ["kaitak-MCP141.AGS", "royal-victoria-dock-north.ags"];

interface Failed {
  name: string;
  error: string;
}

type TabKey = "overview" | "groups" | "issues" | "log";

/** Grids first, then grid-plus-height systems; latitude and longitude for files that carry degrees. */
const CRS_KINDS: ReadonlyArray<CrsKind> = ["projected", "compound", "geographic"];

export function App() {
  const [files, setFiles] = useState<Array<ParsedAgs>>([]);
  const [failed, setFailed] = useState<Array<Failed>>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    fileId: string;
    locationId: string;
  } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [crsIndex, setCrsIndex] = useState<CrsIndex | null>(null);
  const [crsByFile, setCrsByFile] = useState<Record<string, number | null>>({});
  const [isPending, startTransition] = useTransition();
  // False during server rendering and hydration, true once the client takes over: the map is client only.
  const isClient = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const fileIndex = useMemo(
    () => Object.fromEntries(files.map((f, i) => [f.id, i])),
    [files],
  );

  // Locations without coordinates first; the grid is suggested per file from the raw
  // numbers against every EPSG CRS's extent, and the user can override it per file.
  const rawLocations = useMemo(
    () => files.flatMap((f) => extractLocations(f, null)),
    [files],
  );
  useEffect(() => {
    if (files.length > 0 && !crsIndex) {
      loadCrs()
        .then(setCrsIndex)
        .catch((error: unknown) => {
          console.error(error);
        });
    }
  }, [files.length, crsIndex]);
  const shortlist = useMemo(() => getShortlist(AGS_SHORTLIST_ID) ?? null, []);
  const pointsByFile = useMemo(() => {
    const out: Record<string, Array<Point>> = {};
    for (const f of files) {
      out[f.id] = rawLocations.flatMap((l): Array<Point> =>
        l.fileId === f.id && l.easting !== null && l.northing !== null ? [[l.easting, l.northing]] : [],
      );
    }
    return out;
  }, [files, rawLocations]);
  // What else the file says about its grid: PROJ_LOC and PROJ_NAME, LOCA_GREF codes, and
  // locations that also carry a latitude and longitude.
  const hintsByFile = useMemo(() => Object.fromEntries(files.map((f) => [f.id, crsHints(f)])) as Record<string, Array<string>>, [files]);
  const knownByFile = useMemo(
    () => Object.fromEntries(files.map((f) => [f.id, knownPositions(f)])) as Record<string, Array<KnownPosition>>,
    [files],
  );
  const suggestedByFile = useMemo(() => {
    const out: Record<string, number | null> = {};
    if (!crsIndex) {
      return out;
    }
    const priors = shortlist ? shortlistPriors(shortlist) : undefined;
    for (const f of files) {
      const pts = pointsByFile[f.id] ?? [];
      if (pts.length === 0) {
        out[f.id] = null;
        continue;
      }
      const known = knownByFile[f.id] ?? [];
      const suggestions = suggestCrs(crsIndex, pts, {
        priors,
        kinds: CRS_KINDS,
        hints: hintsByFile[f.id],
        toLonLat,
        limit: known.length > 0 ? 20 : 1,
      });
      const ranked = known.length > 0 ? rankByResidual(suggestions, known) : suggestions;
      out[f.id] = ranked[0]?.crs.code ?? null;
    }
    return out;
  }, [crsIndex, files, pointsByFile, hintsByFile, knownByFile, shortlist]);
  const effectiveCrs = (fileId: string): number | null =>
    fileId in crsByFile ? (crsByFile[fileId] ?? null) : (suggestedByFile[fileId] ?? null);

  const allLocations: Array<LocationInfo> = useMemo(() => {
    if (!crsIndex) {
      return rawLocations;
    }
    return rawLocations.map((l) => {
      const code = l.fileId in crsByFile ? crsByFile[l.fileId] : suggestedByFile[l.fileId];
      const entry = code !== null && code !== undefined ? crsIndex.byCode.get(code) : undefined;
      if (!entry || l.easting === null || l.northing === null) {
        return l;
      }
      const ll = toLonLat(entry, l.easting, l.northing);
      return ll ? { ...l, lon: ll[0], lat: ll[1] } : l;
    });
  }, [rawLocations, crsIndex, crsByFile, suggestedByFile]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of allLocations) {
      counts[l.fileId] = (counts[l.fileId] ?? 0) + 1;
    }
    return counts;
  }, [allLocations]);

  const selectedFile = files.find((f) => f.id === selectedFileId) ?? null;
  const fileLocations = useMemo(
    () => allLocations.filter((l) => l.fileId === selectedFileId),
    [allLocations, selectedFileId],
  );
  const selectedLocationInfo = selectedLocation
    ? allLocations.find(
        (l) =>
          l.fileId === selectedLocation.fileId &&
          l.id === selectedLocation.locationId,
      )
    : undefined;

  async function addFiles(input: Array<File>) {
    const taken = new Set(files.map((f) => f.id));
    const parsed: Array<ParsedAgs> = [];
    const errors: Array<Failed> = [];
    for (const file of input) {
      let id = file.name;
      for (let n = 2; taken.has(id); n++) {
        id = `${file.name} (${n})`;
      }
      taken.add(id);
      try {
        parsed.push(await parseAgsFile(file, id));
      } catch (error) {
        errors.push({
          name: file.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    startTransition(() => {
      setFiles((previous) => [...previous, ...parsed]);
      setFailed((previous) => [...previous, ...errors]);
      if (parsed[0]) {
        setSelectedFileId(parsed[0].id);
        setSelectedLocation(null);
        setSelectedGroup(null);
      }
    });
  }

  async function loadSamples() {
    const fetched = await Promise.all(
      SAMPLES.map(async (name) => {
        const response = await fetch(`/samples/${name}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${name}`);
        }
        return new File([await response.blob()], name);
      }),
    );
    await addFiles(fetched);
  }

  function removeFile(id: string) {
    const file = files.find((f) => f.id === id);
    file?.handle.free();
    startTransition(() => {
      setFiles((previous) => previous.filter((f) => f.id !== id));
      if (selectedFileId === id) {
        setSelectedFileId(files.find((f) => f.id !== id)?.id ?? null);
        setSelectedLocation(null);
      }
    });
  }

  function selectFile(id: string) {
    setSelectedFileId(id);
    if (selectedLocation?.fileId !== id) {
      setSelectedLocation(null);
    }
  }

  function selectLocation(fileId: string, locationId: string) {
    setSelectedFileId(fileId);
    setSelectedLocation({ fileId, locationId });
    setTab("log");
  }

  return (
    <div className="pancake">
      <Header />
      <main className="grid gap-3 p-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <section className="card">
            <FileTrigger
              acceptedFileTypes={[".ags", ".AGS", ".txt"]}
              allowsMultiple
              onSelect={(list) => {
                addFiles([...(list ?? [])]).catch((error: unknown) => {
                  console.error(error);
                });
              }}
            >
              <Button
                isPending={isPending}
                className="btn-primary w-full justify-center py-2"
              >
                <UploadIcon size={14} />{" "}
                {isPending ? "Parsing..." : "Choose AGS files"}
              </Button>
            </FileTrigger>
            <p className="text-xs text-center text-gray-500 mt-1">
              or{" "}
              <Button
                className="text-blue-600 underline hover:text-blue-800"
                onPress={() => {
                  loadSamples().catch((error: unknown) => {
                    console.error(error);
                  });
                }}
              >
                load two sample files
              </Button>{" "}
              (Kai Tak AGS3, Royal Victoria Dock AGS4)
            </p>
            <div className="mt-3">
              <FileTable
                files={files}
                locationCounts={locationCounts}
                selectedId={selectedFileId}
                onSelect={selectFile}
                onDrop={(dropped) => {
                  addFiles(dropped).catch((error: unknown) => {
                    console.error(error);
                  });
                }}
                onDownload={(id) => {
                  const f = files.find((x) => x.id === id);
                  if (f) {
                    downloadFile(f.original, f.filename, "text/plain");
                  }
                }}
                onRemove={removeFile}
              />
            </div>
            {failed.length > 0 && (
              <ul className="mt-2 text-xs text-red-700">
                {failed.map((f, i) => (
                  <li key={i}>
                    {f.name}: {f.error}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2 className="card-title">Coordinates</h2>
            <CrsPanel
              index={crsIndex}
              selectedFile={selectedFile}
              points={selectedFile ? (pointsByFile[selectedFile.id] ?? []) : []}
              hints={selectedFile ? (hintsByFile[selectedFile.id] ?? []) : []}
              known={selectedFile ? (knownByFile[selectedFile.id] ?? []) : []}
              kinds={CRS_KINDS}
              value={selectedFile ? effectiveCrs(selectedFile.id) : null}
              chosen={selectedFile ? selectedFile.id in crsByFile : false}
              shortlist={shortlist}
              onChange={(code) => {
                if (selectedFile) {
                  setCrsByFile((previous) => ({ ...previous, [selectedFile.id]: code }));
                }
              }}
              shown={allLocations.filter((l) => l.lon !== null).length}
              total={allLocations.length}
            />
          </section>

          <section className="card">
            <h2 className="card-title">Download</h2>
            <DownloadButtons
              parsed={selectedFile}
              allLocations={allLocations}
            />
          </section>

          {selectedFile && (
            <section className="card">
              <h2 className="card-title">
                Locations in {selectedFile.filename}
              </h2>
              <LocationList
                locations={fileLocations}
                selectedId={
                  selectedLocation?.fileId === selectedFile.id
                    ? selectedLocation.locationId
                    : null
                }
                onSelect={(id) => {
                  selectLocation(selectedFile.id, id);
                }}
              />
            </section>
          )}
        </aside>

        <div className="flex flex-col gap-3 min-w-0">
          <section className="card">
            {isClient ? (
              <Suspense
                fallback={<div className="h-[420px] bg-gray-100 rounded-sm" />}
              >
                <AgsMap
                  locations={allLocations}
                  fileIndex={fileIndex}
                  selected={selectedLocation}
                  onSelect={selectLocation}
                />
              </Suspense>
            ) : (
              <div className="h-[420px] bg-gray-100 rounded-sm" />
            )}
          </section>

          <section className="card">
            {selectedFile ? (
              <Tabs
                selectedKey={tab}
                onSelectionChange={(key) => {
                  setTab(key as TabKey);
                }}
              >
                <TabList aria-label="File details">
                  <Tab id="overview">Overview</Tab>
                  <Tab id="groups">Groups</Tab>
                  <Tab id="issues">
                    Issues
                    {selectedFile.summary.errors +
                      selectedFile.summary.warnings >
                      0 && (
                      <span className="ml-1 px-1.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                        {selectedFile.summary.errors +
                          selectedFile.summary.warnings}
                      </span>
                    )}
                  </Tab>
                  <Tab id="log">Borehole log</Tab>
                </TabList>
                <TabPanel id="overview">
                  <Overview
                    parsed={selectedFile}
                    onOpenGroup={(name) => {
                      setSelectedGroup(name);
                      setTab("groups");
                    }}
                  />
                </TabPanel>
                <TabPanel id="groups">
                  <GroupViewer
                    parsed={selectedFile}
                    group={selectedGroup}
                    onGroupChange={setSelectedGroup}
                  />
                </TabPanel>
                <TabPanel id="issues">
                  <IssuesPanel parsed={selectedFile} />
                </TabPanel>
                <TabPanel id="log">
                  {selectedLocationInfo?.fileId === selectedFile.id ? (
                    <BoreholeLog
                      parsed={selectedFile}
                      location={selectedLocationInfo}
                    />
                  ) : (
                    <p className="text-sm text-gray-500">
                      Pick a location on the map or in the list.
                    </p>
                  )}
                </TabPanel>
              </Tabs>
            ) : (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Drop an AGS3 or AGS4 file to see its locations on the map,
                  every group as a table, the parse issues and borehole logs.
                </p>
                <p>
                  Parsing runs in your browser with{" "}
                  <a
                    className="underline"
                    href="https://github.com/bedrock-engineer/ags-parse-rs"
                  >
                    ags-parse
                  </a>
                  , compiled to WebAssembly. Files are never uploaded.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
      <footer className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-white">
        Map tiles by{" "}
        <a className="underline" href="https://openfreemap.org">
          OpenFreeMap
        </a>
        , data from OpenStreetMap contributors. Sample AGS4 data from the
        British Geological Survey under the Open Government Licence (contains
        data supplied by UKRI).
      </footer>
    </div>
  );
}
