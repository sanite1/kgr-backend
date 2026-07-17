// One-off: inserts a handful of demo conversion requests so the
// console's Conversions tab has something to preview. Refuses to run
// in production; skips if any conversion requests already exist.
// Usage: `npm run seed:conversions`.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import ConversionRequest from "../models/ConversionRequest";
import { nextSequence } from "../helpers/sequence";
import { ConversionStatus } from "../interfaces/helper.interface";

const CONVERSION_ID_START = Number(process.env.CONVERSION_ID_START) || 100;

type Seed = {
  name: string;
  email: string;
  phone: string;
  remarks: string;
  status: ConversionStatus;
  sections: { title: string; fields: { label: string; value: string }[] }[];
};

const SEEDS: Seed[] = [
  {
    name: "Aisha Bello",
    email: "aisha.bello@example.com",
    phone: "0803 214 5566",
    status: "new",
    remarks:
      "We run a small logistics fleet in Kaduna and want to pilot one conversion before committing to the rest.",
    sections: [
      {
        title: "Vehicle to be converted",
        fields: [
          { label: "Make", value: "Toyota" },
          { label: "Model", value: "Hiace" },
          { label: "Year", value: "2014" },
          { label: "Current fuel type", value: "Diesel" },
          { label: "Kerb weight (kg)", value: "1980" },
        ],
      },
      {
        title: "Performance & range requirements",
        fields: [
          { label: "Daily distance (km)", value: "120" },
          { label: "Top speed needed (km/h)", value: "100" },
          { label: "Typical load", value: "8 passengers + cargo" },
        ],
      },
      {
        title: "Battery & charging requirements",
        fields: [
          { label: "Charging location", value: "Depot overnight" },
          { label: "Preferred range (km)", value: "200" },
        ],
      },
    ],
  },
  {
    name: "Emeka Okafor",
    email: "emeka.okafor@example.com",
    phone: "0705 889 2211",
    status: "in_review",
    remarks: "Interested in converting my personal SUV. Budget is flexible.",
    sections: [
      {
        title: "Vehicle to be converted",
        fields: [
          { label: "Make", value: "Honda" },
          { label: "Model", value: "CR-V" },
          { label: "Year", value: "2011" },
          { label: "Current fuel type", value: "Petrol" },
        ],
      },
      {
        title: "Motor & drive requirements",
        fields: [
          { label: "Drive type", value: "Front-wheel drive" },
          { label: "Transmission", value: "Automatic" },
          { label: "Power preference", value: "Comfort over performance" },
        ],
      },
    ],
  },
  {
    name: "Fatima Sani",
    email: "fatima.sani@example.com",
    phone: "0812 445 7788",
    status: "contacted",
    remarks:
      "Spoke with the team on the phone, sending vehicle photos this week.",
    sections: [
      {
        title: "Vehicle to be converted",
        fields: [
          { label: "Make", value: "Mercedes-Benz" },
          { label: "Model", value: "Sprinter" },
          { label: "Year", value: "2016" },
          { label: "Current fuel type", value: "Diesel" },
          { label: "Kerb weight (kg)", value: "2600" },
        ],
      },
      {
        title: "Performance & range requirements",
        fields: [
          { label: "Daily distance (km)", value: "180" },
          { label: "Top speed needed (km/h)", value: "110" },
        ],
      },
      {
        title: "Battery & charging requirements",
        fields: [
          { label: "Charging location", value: "Home and depot" },
          { label: "Preferred range (km)", value: "260" },
          { label: "Fast charging needed", value: "Yes" },
        ],
      },
    ],
  },
  {
    name: "Chidi Nwosu",
    email: "chidi.nwosu@example.com",
    phone: "",
    status: "new",
    remarks: "",
    sections: [
      {
        title: "Vehicle to be converted",
        fields: [
          { label: "Make", value: "Nissan" },
          { label: "Model", value: "Almera" },
          { label: "Year", value: "2009" },
          { label: "Current fuel type", value: "Petrol" },
        ],
      },
    ],
  },
  {
    name: "Grace Adeyemi",
    email: "grace.adeyemi@example.com",
    phone: "0909 332 1100",
    status: "closed",
    remarks: "Converted in Q1. Very happy, may refer others.",
    sections: [
      {
        title: "Vehicle to be converted",
        fields: [
          { label: "Make", value: "Toyota" },
          { label: "Model", value: "Corolla" },
          { label: "Year", value: "2013" },
          { label: "Current fuel type", value: "Petrol" },
        ],
      },
      {
        title: "Performance & range requirements",
        fields: [
          { label: "Daily distance (km)", value: "60" },
          { label: "Top speed needed (km/h)", value: "90" },
        ],
      },
    ],
  },
];

const run = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("seed:conversions refuses to run in production.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || "");

  const existing = await ConversionRequest.countDocuments();
  if (existing) {
    console.error(
      `Refusing to seed: ${existing} conversion requests already exist.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  for (const seed of SEEDS) {
    const requestId = await nextSequence("conversion_id", CONVERSION_ID_START);
    await ConversionRequest.create({ requestId, ...seed });
  }

  console.log(`Created ${SEEDS.length} conversion requests.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
