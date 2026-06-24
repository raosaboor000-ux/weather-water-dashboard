export type StorageStatus =
  | "below_dead"
  | "low"
  | "medium"
  | "high";

export type SpillStatus =
  | "none"
  | "watch"
  | "anytime"
  | "spilling";

export type TrendDirection = "rising" | "falling" | "stable";

export type DamMetadata = {
  location: string;
  heightFt?: number;
  completionCost?: number;
  grossStorageAft?: number;
  liveStorageAft?: number;
  ccaAcres?: number;
  channelCapacityCfs?: number;
  canalLengthFt?: number;
  dslFt?: number;
  nplFt?: number;
  hflFt?: number;
  river?: string;
  yearCompleted?: number;
  catchmentSqKm?: number;
  latitude?: number;
  longitude?: number;
};

export type DamReading = {
  date: string;
  location: string;
  waterLevelFt: number;
};

export type DamSnapshot = DamMetadata & {
  date: string;
  waterLevelFt: number;
  fillPct: number | null;
  storageStatus: StorageStatus;
  spillStatus: SpillStatus;
  trend7d: TrendDirection;
};

export type DamsDataset = {
  dams: DamMetadata[];
  readings: DamReading[];
  dates: string[];
  latestDate: string;
};
