import { appConfig } from "@/lib/config";

export type WeatherDisplayUnits = {
  tempSymbol: string;
  tempLabel: string;
  dewLabel: string;
  windSymbol: string;
  windLabel: string;
  gustLabel: string;
  pressureSymbol: string;
  pressureLabel: string;
  precipSymbol: string;
  precipRateLabel: string;
  precipTotalLabel: string;
  solarSymbol: string;
  solarLabel: string;
  humidityLabel: string;
  legend: string;
};

export function weatherDisplayUnits(): WeatherDisplayUnits {
  const tempSymbol =
    appConfig.display.temperatureUnit === "fahrenheit" ? "°F" : "°C";
  const windSymbol =
    appConfig.display.windSpeedUnit === "mph" ? "mph" : "km/h";
  const pressureSymbol = "hPa";
  const precipSymbol = "mm";
  const solarSymbol = "W/m²";

  return {
    tempSymbol,
    tempLabel: `Temperature (${tempSymbol})`,
    dewLabel: `Dew Point (${tempSymbol})`,
    windSymbol,
    windLabel: `Wind Speed (${windSymbol})`,
    gustLabel: `Wind Gust (${windSymbol})`,
    pressureSymbol,
    pressureLabel: `Pressure (${pressureSymbol})`,
    precipSymbol,
    precipRateLabel: `Precip. rate (${precipSymbol})`,
    precipTotalLabel: `Precip. accum. (${precipSymbol})`,
    solarSymbol,
    solarLabel: `Solar (${solarSymbol})`,
    humidityLabel: "Humidity (%)",
    legend: `Units: ${tempSymbol}, ${windSymbol}, ${pressureSymbol}, ${precipSymbol}, ${solarSymbol}`,
  };
}
