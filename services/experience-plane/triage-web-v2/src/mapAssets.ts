/**
 * mapAssets.ts — Shared map/globe asset warmup and caching helpers
 *
 * Keeps heavyweight assets off the critical path for first paint while still
 * making the first 3D switch feel responsive.
 */

export const EARTH_TEXTURE_URL = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
export const EARTH_BUMP_URL = "https://unpkg.com/three-globe/example/img/earth-topology.png";

let countriesPromise: Promise<any> | null = null;
let globeModulePromise: Promise<typeof import("./Globe3D")> | null = null;
const warmedImages = new Set<string>();

export function loadCountriesGeoJson(): Promise<any> {
  if (!countriesPromise) {
    countriesPromise = fetch("/countries-110m.geojson", { cache: "force-cache" }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load countries GeoJSON: ${response.status}`);
      }
      return response.json();
    });
  }
  return countriesPromise;
}

export function preloadGlobe3D(): Promise<typeof import("./Globe3D")> {
  if (!globeModulePromise) {
    globeModulePromise = import("./Globe3D");
  }
  return globeModulePromise;
}

function warmImage(url: string): void {
  if (typeof Image === "undefined" || warmedImages.has(url)) return;
  warmedImages.add(url);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

export function warmMapAssets(): void {
  void loadCountriesGeoJson().catch(() => {});
  void preloadGlobe3D().catch(() => {});
  warmImage(EARTH_TEXTURE_URL);
  warmImage(EARTH_BUMP_URL);
}
