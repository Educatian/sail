interface LocationPoint {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface LocationMapProps {
  center?: LocationPoint;
  points?: LocationPoint[];
  live?: boolean;
  label?: string;
  className?: string;
}

const TILE_SIZE = 256;
const EARTH_METERS = 40075016.686;
const VIEW_WIDTH = 360;
const VIEW_HEIGHT = 176;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function zoomForAccuracy(accuracy?: number) {
  if (!accuracy) return 16;
  if (accuracy > 180) return 14;
  if (accuracy > 80) return 15;
  return 16;
}

function project(lat: number, lng: number, zoom: number) {
  const world = TILE_SIZE * 2 ** zoom;
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * world,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world,
  };
}

function metersPerPixel(lat: number, zoom: number) {
  return (Math.cos((lat * Math.PI) / 180) * EARTH_METERS) / (TILE_SIZE * 2 ** zoom);
}

function tileUrl(zoom: number, x: number, y: number) {
  const max = 2 ** zoom;
  const wrappedX = ((x % max) + max) % max;
  const clampedY = clamp(y, 0, max - 1);
  return `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
}

export function LocationMap({ center, points = [], live = false, label = 'Map location', className = '' }: LocationMapProps) {
  const latest = points.at(-1) ?? center;

  if (!latest) {
    return (
      <div className={`grid h-44 place-items-center rounded border border-black/10 bg-[#eef2ef] text-center ${className}`}>
        <div>
          <div className="label-mono">Map unavailable</div>
          <p className="mt-1 text-xs text-ink/50">Location permission has not produced a map point yet.</p>
        </div>
      </div>
    );
  }

  const zoom = zoomForAccuracy(latest.accuracy);
  const centerPx = project(latest.lat, latest.lng, zoom);
  const centerTileX = Math.floor(centerPx.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPx.y / TILE_SIZE);
  const tileRange = [-1, 0, 1];
  const screenPoint = (point: LocationPoint) => {
    const px = project(point.lat, point.lng, zoom);
    return {
      x: px.x - centerPx.x + VIEW_WIDTH / 2,
      y: px.y - centerPx.y + VIEW_HEIGHT / 2,
    };
  };
  const route = points.slice(-80).map(screenPoint);
  const routePoints = route.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const marker = screenPoint(latest);
  const accuracyRadius = latest.accuracy
    ? clamp(latest.accuracy / metersPerPixel(latest.lat, zoom), 10, 92)
    : 16;

  return (
    <div className={`relative h-44 overflow-hidden rounded border border-black/10 bg-[#dce7e2] ${className}`}>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="h-full w-full" role="img" aria-label={label}>
        {tileRange.flatMap((dx) => tileRange.map((dy) => {
          const tx = centerTileX + dx;
          const ty = centerTileY + dy;
          return (
            <image
              key={`${tx}-${ty}`}
              href={tileUrl(zoom, tx, ty)}
              x={tx * TILE_SIZE - centerPx.x + VIEW_WIDTH / 2}
              y={ty * TILE_SIZE - centerPx.y + VIEW_HEIGHT / 2}
              width={TILE_SIZE}
              height={TILE_SIZE}
              preserveAspectRatio="none"
            />
          );
        }))}
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="rgba(255,255,255,0.14)" />
        {route.length > 1 && (
          <polyline points={routePoints} fill="none" stroke="var(--color-accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        )}
        <circle cx={marker.x} cy={marker.y} r={accuracyRadius} fill="var(--color-accent)" opacity="0.12" />
        {live && <circle cx={marker.x} cy={marker.y} r="14" fill="var(--color-accent)" opacity="0.2" className="animate-ping" />}
        <circle cx={marker.x} cy={marker.y} r="7" fill="var(--color-accent)" />
        <circle cx={marker.x} cy={marker.y} r="2.5" fill="#fff" />
      </svg>
      <div className="absolute left-3 top-3 rounded-full border border-black/10 bg-white/90 px-2 py-1 text-[10px] font-semibold tracking-wide text-ink shadow-sm">
        {live ? 'LIVE MAP' : 'MAP'}
      </div>
      <div className="absolute bottom-3 left-3 rounded-full border border-black/10 bg-white/90 px-2 py-1 text-[10px] text-ink/65 shadow-sm">
        {latest.accuracy ? `accuracy ~${Math.round(latest.accuracy)}m` : `zoom ${zoom}`}
      </div>
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 rounded bg-white/80 px-1.5 py-0.5 text-[9px] text-ink/45"
      >
        OSM
      </a>
    </div>
  );
}
