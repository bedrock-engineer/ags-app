import {
  interpolateBlues,
  interpolateGreens,
  interpolateReds,
} from "https://cdn.jsdelivr.net/npm/d3-scale-chromatic@3/+esm";
import {
  scaleOrdinal,
  scaleSequential,
} from "https://cdn.jsdelivr.net/npm/d3-scale/+esm";
import { agsHoleTypeConfig, geologicalConfig } from "./config.js";

// Your access token can be found at: https://ion.cesium.com/tokens.
// Replace `your_access_token` with your Cesium ion access token.
// Cesium.Ion.defaultAccessToken = null;

// Initialize the Cesium Viewer in the HTML element with the `map` ID.
const viewer = new Cesium.Viewer("map", {
  terrain: Cesium.Terrain.fromWorldTerrain(), // https://cesium.com/platform/cesium-ion/content/#cesium-world-terrain
  animation: false,
  timeline: false,
  fullscreenButton: false,
  vrButton: false,
  sceneModePicker: false,
  baseLayerPicker: false,
  navigationHelpButton: false,
  geocoder: false,
  homeButton: false,
});

const osmBuildings = await Cesium.createOsmBuildingsAsync();
viewer.scene.primitives.add(osmBuildings);

// Enable underground visualization
// https://cesium.com/blog/2020/06/16/visualizing-underground/
const initAlpha = 0.7;

viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

const { globe } = viewer.scene;

// Configure globe for underground visualization
globe.translucency.enabled = true;
globe.translucency.frontFaceAlphaByDistance = new Cesium.NearFarScalar(
  400.0,
  0.1, // Minimum alpha at close distance
  800.0,
  initAlpha // Maximum alpha at far distance
);
globe.translucency.backFaceAlpha = 1.0; // Keep back face opaque
globe.undergroundColor = Cesium.Color.WHITE;
globe.lighting = false;

viewer.scene.verticalExaggeration = 1;
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(114.20685352, 22.23496, 1325),
  orientation: {
    heading: 0.0319,
    pitch: -0.19935,
    roll: 6.28318,
  },
});

const terrainProvider = new Cesium.UrlTemplateImageryProvider({
  url: "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png",
  // url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png",
  maximumLevel: 18,
  credit:
    '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
});
const imageryLayer = viewer.imageryLayers.addImageryProvider(terrainProvider);


const geologicalColors = Object.fromEntries(
  Object.entries(geologicalConfig).map(([key, config]) => [key, config.color])
);

// This I to VI grade scale is a little funky but that's the way it is in the source data
const weatheringGrades = [
  "I",
  "II",
  "II/III",
  "III/II",
  "III",
  "III/IV",
  "IV/III",
  "IV",
  "IV/V",
  "V",
  "V/IV",
  "VI",
];
// Make a green color scheme
const greens = Array.from({ length: weatheringGrades.length }).map((_d, i, a) =>
  interpolateGreens(i / (a.length - 1))
);

// https://observablehq.com/@d3/sequential-scales
const fractionIndexScale = scaleSequential(interpolateBlues).domain([0, 5]);

const rqdColorScale = scaleSequential(interpolateReds).domain([0, 100]);

// https://observablehq.com/@d3/d3-scaleordinal
const holeTypeColorScale = scaleOrdinal()
  .domain(Object.keys(agsHoleTypeConfig))
  .range(Object.values(agsHoleTypeConfig).map((config) => config.color));

const geologyColorScale = scaleOrdinal()
  .domain(Object.keys(geologicalColors))
  .range(Object.values(geologicalColors));

const weatheringGradeColorScale = scaleOrdinal()
  .domain(weatheringGrades)
  .range(greens);

// Legend generation functions
// Adapted from https://observablehq.com/@d3/color-legend
function createSequentialLegend(
  scale,
  title,
  domain,
  width = 200,
  height = 20
) {
  const container = document.createElement("section");
  container.classList.add("legend-section");
  container.id = `legend-${title.toLowerCase().replace(/\s+/g, "-")}`;

  const titleEl = document.createElement("h4");
  titleEl.textContent = title;
  container.appendChild(titleEl);

  const canvas = document.createElement("canvas");
  canvas.classList.add("sequential-colors");
  canvas.width = width;
  canvas.height = height;
  canvas.style.display = "block";
  canvas.style.marginBottom = "4px";
  const context = canvas.getContext("2d");

  for (let i = 0; i < width; ++i) {
    const value = domain[0] + ((domain[1] - domain[0]) * i) / (width - 1);
    context.fillStyle = scale(value);
    context.fillRect(i, 0, 1, height);
  }

  // Add min/max labels
  const labelsDiv = document.createElement("div");
  labelsDiv.style.display = "flex";
  labelsDiv.style.justifyContent = "space-between";
  labelsDiv.style.fontSize = "10px";
  labelsDiv.innerHTML = `<span>${domain[0]}</span><span>${domain[1]}</span>`;

  container.appendChild(canvas);
  container.appendChild(labelsDiv);

  return container;
}

function createOrdinalLegend(scale, title) {
  const container = document.createElement("section");
  container.classList.add("legend-section");
  container.id = `legend-${title.toLowerCase().replace(/\s+/g, "-")}`;

  const titleEl = document.createElement("h4");
  titleEl.textContent = title;
  container.appendChild(titleEl);

  const itemsDiv = document.createElement("div");
  scale.domain().forEach((value) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.innerHTML = `
      <div class="legend-circle" style="background-color: ${scale(
        value
      )}"></div>
      <span>${value}</span>
    `;
    itemsDiv.appendChild(item);
  });

  container.appendChild(itemsDiv);
  return container;
}

const datasets = [
  {
    id: "locations",
    label: "Borehole Locations",
    file: "locations.geojson",
    enabled: true,
    dataSource: null,
    legend: {
      type: "ordinal",
      scale: holeTypeColorScale,
      title: "Hole Types",
      element: null,
    },
    onLoad: (dataSource) => {
      console.log("Loaded location data", dataSource.entities.values.length);

      dataSource.entities.values.forEach((entity) => {
        const holeType = entity.properties.HOLE_TYPE.getValue();
        const holeId = entity.properties.HOLE_ID.getValue();

        const coordinates =
          entity.polyline && entity.polyline.positions
            ? entity.polyline.positions.getValue()
            : null;

        // Remove the default polyline rendering
        if (entity.polyline) {
          entity.polyline = undefined;
        }

        if (entity.marker) {
          entity.marker = undefined;
        }

        if (!coordinates || coordinates.length < 2) {
          console.warn(`No valid coordinates for hole ${holeId}`);
          return;
        }

        const [top, bottom] = coordinates;
        const topCartographic = Cesium.Cartographic.fromCartesian(top);
        const bottomCartographic = Cesium.Cartographic.fromCartesian(bottom);

        const lon = topCartographic.longitude * Cesium.Math.DEGREES_PER_RADIAN;
        const lat = topCartographic.latitude * Cesium.Math.DEGREES_PER_RADIAN;
        const topElevation = topCartographic.height;
        const bottomElevation = bottomCartographic.height;

        const length = Math.abs(topElevation - bottomElevation);
        const centerElevation = (topElevation + bottomElevation) / 2;

        const color = Cesium.Color.fromCssColorString(
          agsHoleTypeConfig[holeType]?.color || "#999999"
        );

        dataSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, centerElevation),
          cylinder: new Cesium.CylinderGraphics({
            topRadius: 3,
            bottomRadius: 3,
            length: length,
            fill: false,
            outline: true,
            outlineColor: color,
            outlineWidth: 1,
            outlineOpacity: 0.5,
          }),
          properties: entity.properties,
          name: holeId,
        });
      });
    },
  },
  {
    id: "geol",
    label: "Geology",
    file: "geol.geojson",
    enabled: false,
    dataSource: null,
    legend: {
      type: "ordinal",
      scale: geologyColorScale,
      title: "Geology",
      element: null,
    },
    onLoad: (dataSource) => {
      console.log(
        "Loaded geology data:",
        dataSource.entities.values.length,
        "linestrings"
      );

      dataSource.entities.values.forEach((entity) => {
        if (entity.polyline) {
          const geologicalLeg = entity.properties?.GEOL_LEG?.getValue();
          const color = geologicalColors[geologicalLeg] || "grey";

          entity.polyline.material = Cesium.Color.fromCssColorString(color);
          entity.polyline.width = 7;
          entity.polyline.clampToGround = false;
        }
      });
    },
  },
  {
    id: "core",
    label: "Core Data",
    file: "core.geojson",
    enabled: false,
    dataSource: null,
    legend: {
      type: "sequential",
      scale: rqdColorScale,
      title: "RQD (Rock Quality designation)",
      domain: [0, 100],
      element: null,
    },
    onLoad: (dataSource) => {
      console.log("Loaded core data:", dataSource.entities.values.length);

      dataSource.entities.values.forEach((entity) => {
        const rqd = entity.properties?.CORE_RQD?.getValue();
        const color = rqdColorScale(Number(rqd));

        if (entity.polyline) {
          entity.polyline.material = Cesium.Color.fromCssColorString(color);
          entity.polyline.width = 7;
          entity.polyline.clampToGround = false;
        }
      });
    },
  },
  {
    id: "fracture",
    label: "Fractures",
    file: "fracture.geojson",
    enabled: false,
    dataSource: null,
    legend: {
      type: "sequential",
      scale: fractionIndexScale,
      title: "Fracture Index",
      domain: [0, 5],
      element: null,
    },
    onLoad: (dataSource) => {
      console.log("Loaded fracture data:", dataSource.entities.values.length);

      dataSource.entities.values.forEach((entity) => {
        let fractureIndex = entity.properties?.FRAC_FI?.getValue();

        if (fractureIndex === ">20.0") {
          fractureIndex = 21;
        }

        if (Number.isNaN(Number(fractureIndex))) {
          return;
        }

        const color = fractionIndexScale(Number(fractureIndex));

        if (entity.polyline) {
          entity.polyline.material = Cesium.Color.fromCssColorString(color);
          entity.polyline.width = 7;
          entity.polyline.clampToGround = false;
        }
      });
    },
  },
  {
    id: "weathering",
    label: "Weathering",
    file: "weathering.geojson",
    enabled: false,
    dataSource: null,
    legend: {
      type: "ordinal",
      scale: weatheringGradeColorScale,
      title: "Weathering Grade",
      element: null,
    },
    onLoad: (dataSource) => {
      console.log("Loaded weathering data:", dataSource.entities.values.length);

      dataSource.entities.values.forEach((entity) => {
        const wetheringGrade = entity.properties?.WETH_GRAD?.getValue();
        const color = weatheringGradeColorScale(wetheringGrade);

        if (entity.billboard) {
          entity.billboard = undefined;
          // Add a point for point geometries
          entity.point = new Cesium.PointGraphics({
            pixelSize: 4,
            color: Cesium.Color.fromCssColorString(color),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          });
        }

        if (entity.polyline) {
          entity.polyline.material = Cesium.Color.fromCssColorString(color);
          entity.polyline.width = 7;
          entity.polyline.clampToGround = false;
        }
      });
    },
  },
];

function generateDatasetControls() {
  const controlsSection = document.getElementById("datasets");

  const controlsHTML = datasets
    .map(
      (dataset) => `
  <div class="checkbox-item">
    <input type="checkbox" id="${dataset.id}-toggle" ${
        dataset.enabled ? "checked" : ""
      }>
    <label for="${dataset.id}-toggle">${dataset.label}</label>
  </div>
`
    )
    .join("");

  controlsSection.innerHTML = controlsSection.innerHTML + controlsHTML;

  // Add event listeners to checkboxes
  datasets.forEach((dataset) => {
    const checkbox = document.getElementById(`${dataset.id}-toggle`);
    checkbox.addEventListener("change", (e) => {
      dataset.enabled = e.target.checked;
      toggleDatasetVisibility(dataset);
    });
  });
}

function toggleDatasetVisibility(dataset) {
  if (dataset.dataSource) {
    dataset.dataSource.show = dataset.enabled;
  }
  updateLegendDisplay();
}

function loadDataset(dataset) {
  return Cesium.GeoJsonDataSource.load(dataset.file, {
    clampToGround: false,
  })
    .then((dataSource) => {
      dataset.dataSource = dataSource;

      dataset.onLoad(dataSource);

      dataSource.show = dataset.enabled;

      viewer.dataSources.add(dataSource);

      return dataSource;
    })
    .catch((error) => {
      console.error(`Error loading ${dataset.file}:`, error);
    });
}

function loadAllDatasets() {
  return Promise.all(datasets.map((dataset) => loadDataset(dataset)));
}

// Dynamic legend management
function generateDatasetLegends() {
  for (const dataset of datasets) {
    if (dataset.legend.type === "sequential") {
      dataset.legend.element = createSequentialLegend(
        dataset.legend.scale,
        dataset.legend.title,
        dataset.legend.domain
      );
    } else if (dataset.legend.type === "ordinal") {
      dataset.legend.element = createOrdinalLegend(
        dataset.legend.scale,
        dataset.legend.title
      );
    }
  }
}

function updateLegendDisplay() {
  const legendEl = document.querySelector("#legend");

  // Remove all dataset legends first
  legendEl.querySelectorAll(".legend-section").forEach((el) => el.remove());

  // Add legends for enabled datasets
  datasets.forEach((dataset) => {
    if (dataset.enabled && dataset.legend.element) {
      legendEl.appendChild(dataset.legend.element);
    }
  });
}

generateDatasetControls();
generateDatasetLegends();
updateLegendDisplay();
loadAllDatasets();

document.querySelector("#alpha").addEventListener("input", (e) => {
  const alpha = e.target.valueAsNumber;

  // Update translucency using distance-based approach
  globe.translucency.frontFaceAlphaByDistance.nearValue = alpha;
  globe.translucency.frontFaceAlphaByDistance.farValue = alpha;
});

// Add 3D buildings toggle
document.querySelector("#buildings-toggle").addEventListener("change", (e) => {
  osmBuildings.show = e.target.checked;
});
