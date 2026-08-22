/**
 * Extra dam profile fields and photos from "Small Dams talagang.pptx".
 * Live water level / spill still come from the dashboard snapshot.
 */

export type DamSlideProfile = {
  location: string;
  slideTitle: string;
  district: string;
  tehsil: string;
  grossStorageAft: number;
  ccaAcres: number;
  waterSupply: string;
  imageSrc: string;
};

const PROFILES: DamSlideProfile[] = [
  {
    location: "Dharabi",
    slideTitle: "Dharabi Dam",
    district: "Chakwal",
    tehsil: "Chakwal",
    grossStorageAft: 37000,
    ccaAcres: 6600,
    waterSupply: "1.0 Mgd",
    imageSrc: "/dams/dharabi.jpeg",
  },
  {
    location: "U-Lakhwal",
    slideTitle: "Uthwal Lakhwa Dam",
    district: "Chakwal",
    tehsil: "Chakwal",
    grossStorageAft: 18000,
    ccaAcres: 3500,
    waterSupply: "Nil",
    imageSrc: "/dams/uthwal-lakhwal.jpeg",
  },
  {
    location: "Pira",
    slideTitle: "Pira Fatehal Dam",
    district: "Talagang",
    tehsil: "Talagang",
    grossStorageAft: 7400,
    ccaAcres: 750,
    waterSupply: "Nil",
    imageSrc: "/dams/pira.jpeg",
  },
  {
    location: "Gurabh",
    slideTitle: "Garubh Dam",
    district: "Talagang",
    tehsil: "Talagang",
    grossStorageAft: 972,
    ccaAcres: 1346,
    waterSupply: "Nil",
    imageSrc: "/dams/gurabh.jpeg",
  },
  {
    location: "Dhok Hum",
    slideTitle: "Dhoke Hum Dam",
    district: "Talagang",
    tehsil: "Talagang",
    grossStorageAft: 8000,
    ccaAcres: 1230,
    waterSupply: "Nil",
    imageSrc: "/dams/dhok-hum.jpeg",
  },
  {
    location: "Bhugtal",
    slideTitle: "Bhugtal Dam",
    district: "Talagang",
    tehsil: "Talagang",
    grossStorageAft: 1140,
    ccaAcres: 680,
    waterSupply: "Nil",
    imageSrc: "/dams/bhugtal.jpeg",
  },
  {
    location: "Mial",
    slideTitle: "Mial Dam",
    district: "Talagang",
    tehsil: "Talagang",
    grossStorageAft: 3200,
    ccaAcres: 935,
    waterSupply: "Nil",
    imageSrc: "/dams/mial.jpeg",
  },
  {
    location: "Dhurnal",
    slideTitle: "Dhurnal Dam",
    district: "Talagang",
    tehsil: "Lawa",
    grossStorageAft: 1570,
    ccaAcres: 700,
    waterSupply: "Nil",
    imageSrc: "/dams/dhurnal.jpg",
  },
];

function normalizeDamKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const ALIASES: Record<string, string> = {
  dharabi: "Dharabi",
  dharabidam: "Dharabi",
  ulakhwal: "U-Lakhwal",
  uthwallakhwa: "U-Lakhwal",
  uthwallakhwadam: "U-Lakhwal",
  uthwallakhwal: "U-Lakhwal",
  pira: "Pira",
  piradam: "Pira",
  pirafatehal: "Pira",
  pirafatehaldam: "Pira",
  gurabh: "Gurabh",
  gurabhdam: "Gurabh",
  garubh: "Gurabh",
  garubhdam: "Gurabh",
  dhokhum: "Dhok Hum",
  dhokhumdam: "Dhok Hum",
  dhokehum: "Dhok Hum",
  dhokehumdam: "Dhok Hum",
  bhugtal: "Bhugtal",
  bhugtaldam: "Bhugtal",
  mial: "Mial",
  mialdam: "Mial",
  dhurnal: "Dhurnal",
  dhurnaldam: "Dhurnal",
};

const BY_LOCATION = new Map(
  PROFILES.map((p) => [p.location, p] as const)
);

export function getDamSlideProfile(
  location: string
): DamSlideProfile | undefined {
  const direct = BY_LOCATION.get(location);
  if (direct) return direct;
  const key = normalizeDamKey(location);
  const alias = ALIASES[key];
  if (alias) {
    const fromAlias = BY_LOCATION.get(alias);
    if (fromAlias) return fromAlias;
  }
  return PROFILES.find((p) => normalizeDamKey(p.location) === key);
}

export function formatAft(n: number): string {
  return `${n.toLocaleString()} Aft`;
}

export function formatAcres(n: number): string {
  return `${n.toLocaleString()} acre`;
}
