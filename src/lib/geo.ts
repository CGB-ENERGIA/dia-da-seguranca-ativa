import { kvGet, kvSet } from "./db";

export interface Local { lat: number; lon: number; prec: number; label: string }

const posicao = (alta: boolean) =>
  new Promise<GeolocationPosition>((ok, no) =>
    navigator.geolocation.getCurrentPosition(ok, no, { enableHighAccuracy: alta, timeout: alta ? 9000 : 6000, maximumAge: 20000 }));

const coord = (lat: number, lon: number) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
const dist = (a: [number, number], b: [number, number]) => {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Localização do aparelho + nome do lugar (online) ou o último nome conhecido por perto / coordenadas (offline). */
export async function obterLocal(): Promise<Local | null> {
  if (!("geolocation" in navigator)) return null;
  let p: GeolocationPosition;
  try { p = await posicao(true); } catch { try { p = await posicao(false); } catch { return null; } }
  const { latitude: lat, longitude: lon, accuracy } = p.coords;
  let label = "";
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 4500);
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=pt-BR&lat=${lat}&lon=${lon}`,
      { signal: c.signal });
    clearTimeout(t);
    const j = await r.json();
    const a = j.address ?? {};
    const rua = a.road ?? a.pedestrian ?? a.neighbourhood ?? "";
    const bairro = a.suburb ?? a.neighbourhood ?? a.quarter ?? "";
    const cidade = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
    label = [rua, bairro !== rua ? bairro : "", cidade].filter(Boolean).join(", ") + (a.state_code ? ` - ${a.state_code}` : "");
    if (label) void kvSet("ultimo-local", { lat, lon, label });
  } catch { /* offline */ }
  if (!label) {
    const u = await kvGet<{ lat: number; lon: number; label: string }>("ultimo-local");
    if (u && dist([lat, lon], [u.lat, u.lon]) < 400) label = `Próx. a ${u.label}`;
  }
  return { lat, lon, prec: Math.round(accuracy), label: label || `GPS ${coord(lat, lon)}` };
}
export const coordTexto = coord;
