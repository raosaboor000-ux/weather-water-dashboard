import { CATCHMENTS, STUDY_BOUNDS } from "@/lib/risk-profile-data";

export type MapLabel = {
  name: string;
  x: number;
  y: number;
  boxW: number;
  boxH: number;
  fontSize: number;
};

export type MapLabelBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export function projectLonLatToImage(
  lon: number,
  lat: number,
  imgW: number,
  imgH: number,
  bounds: MapLabelBounds = STUDY_BOUNDS
): [number, number] {
  const x = ((lon - bounds.west) / (bounds.east - bounds.west)) * imgW;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * imgH;
  return [x, y];
}

/** Same placement logic as the HTML artifact `renderMapLabels`. */
export function buildCatchmentMapLabels(
  imgW: number,
  imgH: number,
  fontSize = 13,
  bounds: MapLabelBounds = STUDY_BOUNDS
): MapLabel[] {
  const charW = fontSize * 0.62;
  const padX = 6;
  const boxH = fontSize + 8;
  const items = CATCHMENTS.map((c) => {
    const [x, y] = projectLonLatToImage(c.lng, c.lat, imgW, imgH, bounds);
    const boxW = c.name.length * charW + padX * 2;
    return { name: c.name, x, y, boxW, boxH, fontSize };
  });

  items.sort((a, b) => a.x - b.x);
  for (let i = 1; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      const a = items[j];
      const b = items[i];
      const overlapX = Math.abs(a.x - b.x) < (a.boxW + b.boxW) / 2;
      const overlapY = Math.abs(a.y - b.y) < (a.boxH + b.boxH) / 2;
      if (overlapX && overlapY) {
        b.y += (b.y >= a.y ? 1 : -1) * (b.boxH * 0.95);
      }
    }
  }
  return items;
}
