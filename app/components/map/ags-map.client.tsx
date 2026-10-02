import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import {
  LngLatBounds,
  Map as MaplibreMap,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { LocationInfo } from "~/parse/model";
import { fileColor } from "~/util/format";

interface AgsMapProps {
  locations: Array<LocationInfo>;
  fileIndex: Record<string, number>;
  selected: { fileId: string; locationId: string } | null;
  onSelect: (fileId: string, locationId: string) => void;
}

const SOURCE = "locations";
const LAYER = "locations-circles";
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

function toGeoJSON(
  locations: Array<LocationInfo>,
  fileIndex: Record<string, number>,
  selected: AgsMapProps["selected"],
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
          fileId: l.fileId,
          id: l.id,
          type: l.type ?? "",
          depth: l.finalDepth,
          color: fileColor(fileIndex[l.fileId] ?? 0),
          selected:
            selected !== null &&
            selected.fileId === l.fileId &&
            selected.locationId === l.id,
        },
      })),
  };
}

/** The locations of every loaded file, one color per file. Client only. */
export function AgsMap({
  locations,
  fileIndex,
  selected,
  onSelect,
}: AgsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<(() => void) | null>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const map = new MaplibreMap({
      container,
      style: STYLE,
      center: [0, 30],
      zoom: 1.5,
      attributionControl: { compact: true },
    });
    map.addControl(new NavigationControl({ showCompass: false }));
    map.on("load", () => {
      map.addSource(SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: LAYER,
        type: "circle",
        source: SOURCE,
        paint: {
          "circle-radius": ["case", ["get", "selected"], 9, 6],
          "circle-color": ["get", "color"],
          "circle-stroke-color": [
            "case",
            ["get", "selected"],
            "#111111",
            "#ffffff",
          ],
          "circle-stroke-width": ["case", ["get", "selected"], 2.5, 1],
          "circle-opacity": 0.9,
        },
      });
      map.on("click", LAYER, (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f?.properties) {
          onSelectRef.current(
            String(f.properties.fileId),
            String(f.properties.id),
          );
        }
      });
      map.on("mouseenter", LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
      const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 10,
      });
      map.on("mousemove", LAYER, (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f?.properties && f.geometry.type === "Point") {
          const [lon, lat] = f.geometry.coordinates as [number, number];
          popup
            .setLngLat([lon, lat])
            .setHTML(
              `<strong>${String(f.properties.id)}</strong> ${String(f.properties.type)}<br/><span style="color:#666">${String(f.properties.fileId)}</span>`,
            )
            .addTo(map);
        }
      });
      map.on("mouseleave", LAYER, () => {
        popup.remove();
      });
      readyRef.current = true;
      pendingRef.current?.();
      pendingRef.current = null;
    });
    mapRef.current = map;
    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const apply = () => {
      const data = toGeoJSON(locations, fileIndex, selected);
      void map.getSource<GeoJSONSource>(SOURCE)?.setData(data);
      if (data.features.length > 0) {
        const bounds = new LngLatBounds();
        for (const f of data.features) {
          if (f.geometry.type === "Point") {
            bounds.extend(f.geometry.coordinates as [number, number]);
          }
        }
        const current = map.getBounds();
        const allInside = data.features.every(
          (f) =>
            f.geometry.type === "Point" &&
            current.contains(f.geometry.coordinates as [number, number]),
        );
        if (!allInside) {
          map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 500 });
        }
      }
    };
    if (readyRef.current) {
      apply();
    } else {
      pendingRef.current = apply;
    }
  }, [locations, fileIndex, selected]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] rounded-sm border border-gray-300"
    />
  );
}
