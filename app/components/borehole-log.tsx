import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import {
  cptFor,
  sptFor,
  strataFor,
  type LocationInfo,
  type ParsedAgs,
} from "~/parse/model";
import { formatNumber } from "~/util/format";

interface BoreholeLogProps {
  parsed: ParsedAgs;
  location: LocationInfo;
}

const PLOT_HEIGHT = 520;

function usePlot(
  render: (() => (SVGSVGElement | HTMLElement) | null) | null,
  deps: ReadonlyArray<unknown>,
) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !render) {
      return;
    }
    const el = render();
    if (!el) {
      return;
    }
    host.replaceChildren(el);
    return () => {
      el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Strata column (GEOL), SPT N-values (ISPT) and cone resistance (SCPT/STCN) against depth. */
export function BoreholeLog({ parsed, location }: BoreholeLogProps) {
  const strata = strataFor(parsed, location.id);
  const spt = sptFor(parsed, location.id);
  const cpt = cptFor(parsed, location.id);
  const maxDepth = Math.max(
    location.finalDepth ?? 0,
    ...strata.map((s) => s.base ?? s.top),
    ...spt.map((s) => s.depth),
    ...cpt.readings.map((r) => r.depth),
  );
  const y = {
    reverse: true,
    domain: [0, maxDepth > 0 ? maxDepth : 10],
    label: "Depth (m)",
  };

  const strataRef = usePlot(
    strata.length > 0
      ? () =>
          Plot.plot({
            height: PLOT_HEIGHT,
            width: 220,
            marginLeft: 40,
            y,
            x: { axis: null, domain: [0, 1] },
            color: { legend: false, scheme: "Tableau10" },
            marks: [
              Plot.rect(strata, {
                x1: 0,
                x2: 1,
                y1: "top",
                y2: (d: { base: number | null; top: number }) =>
                  d.base ?? d.top + 0.5,
                fill: "code",
                stroke: "white",
                strokeWidth: 0.5,
                title: (d: { description: string | null }) =>
                  d.description ?? "",
              }),
              Plot.text(strata, {
                x: 0.05,
                y: (d: { base: number | null; top: number }) =>
                  (d.top + (d.base ?? d.top + 0.5)) / 2,
                text: "code",
                textAnchor: "start",
                fontSize: 10,
              }),
            ],
          })
      : null,
    [parsed.id, location.id],
  );

  const sptRef = usePlot(
    spt.length > 0
      ? () =>
          Plot.plot({
            height: PLOT_HEIGHT,
            width: 220,
            marginLeft: 40,
            y,
            x: {
              label: "SPT N",
              domain: [0, Math.max(50, ...spt.map((s) => s.value))],
              grid: true,
            },
            marks: [
              Plot.line(spt, {
                x: "value",
                y: "depth",
                stroke: "#1f77b4",
                curve: "step-before",
              }),
              Plot.dot(spt, {
                x: "value",
                y: "depth",
                fill: "#1f77b4",
                title: (d: { depth: number; value: number }) =>
                  `${d.depth} m: N = ${d.value}`,
              }),
            ],
          })
      : null,
    [parsed.id, location.id],
  );

  const cptRef = usePlot(
    cpt.readings.length > 0
      ? () =>
          Plot.plot({
            height: PLOT_HEIGHT,
            width: 260,
            marginLeft: 40,
            y,
            x: { label: `qc (${cpt.unit || "?"})`, grid: true },
            marks: [
              Plot.line(
                cpt.readings.filter((r) => r.qc !== null),
                { x: "qc", y: "depth", stroke: "#d62728" },
              ),
            ],
          })
      : null,
    [parsed.id, location.id],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-2">
        <span className="font-medium">{location.id}</span>
        {location.type && (
          <span className="text-gray-600">{location.type}</span>
        )}
        <span className="text-gray-600">
          GL {formatNumber(location.groundLevel)} m
        </span>
        <span className="text-gray-600">
          final depth {formatNumber(location.finalDepth)} m
        </span>
        {location.startDate && (
          <span className="text-gray-600">started {location.startDate}</span>
        )}
        {location.easting !== null && location.northing !== null && (
          <span className="text-gray-600 tabular-nums">
            E {formatNumber(location.easting)} N{" "}
            {formatNumber(location.northing)}
          </span>
        )}
      </div>
      {strata.length === 0 && spt.length === 0 && cpt.readings.length === 0 ? (
        <p className="text-sm text-gray-500">
          No GEOL, ISPT or CPT rows for this location.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {strata.length > 0 && (
            <figure>
              <figcaption className="card-title">Strata (GEOL)</figcaption>
              <div ref={strataRef} />
            </figure>
          )}
          {spt.length > 0 && (
            <figure>
              <figcaption className="card-title">SPT (ISPT)</figcaption>
              <div ref={sptRef} />
            </figure>
          )}
          {cpt.readings.length > 0 && (
            <figure>
              <figcaption className="card-title">
                Cone resistance (
                {parsed.summary.edition === "AGS4" ? "SCPT" : "STCN"})
              </figcaption>
              <div ref={cptRef} />
            </figure>
          )}
          {strata.length > 0 && (
            <div className="max-h-[520px] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-right">Top</th>
                    <th className="text-right">Base</th>
                    <th>Code</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {strata.map((s, i) => (
                    <tr key={i}>
                      <td className="text-right tabular-nums">
                        {formatNumber(s.top)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatNumber(s.base)}
                      </td>
                      <td className="font-mono">{s.code ?? ""}</td>
                      <td className="whitespace-normal max-w-[28rem]">
                        {s.description ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
