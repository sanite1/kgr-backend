import { BatteryLocation } from "../interfaces/helper.interface";

// The physical places a battery can sit. Kept here as a small list so a new
// site is a one-line change; promote to its own collection if it ever needs
// to be edited from the console.
export const BATTERY_LOCATIONS: { value: BatteryLocation; label: string }[] = [
  { value: "main_yard", label: "Main Yard" },
  { value: "muhd_house", label: "MUH'D House" },
  { value: "kamila_house", label: "Kamila House" },
  { value: "ubs", label: "UBS" },
];

export const BATTERY_LOCATION_VALUES = BATTERY_LOCATIONS.map((l) => l.value);

export const BATTERY_LOCATION_LABEL: Record<BatteryLocation, string> =
  BATTERY_LOCATIONS.reduce(
    (acc, l) => ({ ...acc, [l.value]: l.label }),
    {} as Record<BatteryLocation, string>,
  );
