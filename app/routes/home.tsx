import type { Route } from "./+types/home";
import { App } from "~/components/app";

const siteUrl = "https://ags.bedrock.engineer";
const title =
  "AGS file viewer: AGS3 and AGS4 boreholes, SPT, CPT and lab data on a map | Bedrock.engineer";
const description =
  "Free online viewer for AGS3 and AGS4 ground investigation files. Drop a file, see the locations on a map, read every group, check the parse issues, view borehole logs, and download the data as Excel, GeoJSON or Arrow. Nothing leaves your browser.";

export function meta(_: Route.MetaArgs) {
  return [
    { title },
    { name: "description", content: description },
    { property: "og:site_name", content: "Bedrock.engineer AGS viewer" },
    { property: "og:url", content: siteUrl },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
}

export function headers() {
  return {
    "Cache-Control":
      "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  };
}

export default function Home() {
  return <App />;
}
