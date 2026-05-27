import type { Map as LeafletMap } from "leaflet";

const GMAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
const STATIC_MAP_MAX_SIZE = 640;

export type SnapshotResult = {
  snapshotBase64: string;
  width: number;
  height: number;
};

function getMapType(map: LeafletMap): "satellite" | "roadmap" {
  const tiles = map.getContainer().querySelectorAll("img.leaflet-tile");
  for (const tile of tiles) {
    const src = (tile as HTMLImageElement).src;
    if (src.includes("lyrs=y") || src.includes("lyrs=s") || src.includes("lyrs=h")) {
      return "satellite";
    }
  }
  return "roadmap";
}

function fitSize(width: number, height: number, max: number) {
  if (width <= max && height <= max) {
    return { width, height };
  }
  if (width >= height) {
    return { width: max, height: Math.round((height / width) * max) };
  }
  return { width: Math.round((width / height) * max), height: max };
}

export async function captureMapSnapshot(container: HTMLDivElement, map?: LeafletMap): Promise<SnapshotResult> {
  const rect = container.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) {
    throw new Error("Unable to capture map snapshot from current view. Ensure satellite map is visible.");
  }

  if (!map) {
    throw new Error("Map reference required for Google Maps snapshot.");
  }

  const center = map.getCenter();
  const zoom = Math.round(map.getZoom());
  const maptype = getMapType(map);
  const { width, height } = fitSize(Math.round(rect.width), Math.round(rect.height), STATIC_MAP_MAX_SIZE);

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&maptype=${maptype}&key=${GMAPS_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Maps Static API returned ${response.status}. Check API key and usage limits.`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to encode snapshot."));
    reader.readAsDataURL(blob);
  });

  const snapshotBase64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] ?? "" : dataUrl;

  return { snapshotBase64, width, height };
}
