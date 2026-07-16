import logger from "./logger";

interface EnvVariable {
  name: string;
  required: boolean;
  phase: string;
}

const envVariables: EnvVariable[] = [
  { name: "NODE_ENV", required: false, phase: "1" },
  { name: "PORT", required: false, phase: "1" },
  { name: "MONGODB_URI", required: true, phase: "1" },
  { name: "REDIS_URL", required: false, phase: "1" },
  { name: "JWT_SECRET", required: true, phase: "1" },
  { name: "JWT_REFRESH_SECRET", required: false, phase: "1" },
  { name: "CORS_ORIGINS", required: false, phase: "1" },
  // mail: optional until SMTP credentials exist; welcome emails skip silently
  { name: "SMTP_HOST", required: false, phase: "1" },
  { name: "SMTP_PORT", required: false, phase: "1" },
  { name: "SMTP_USER", required: false, phase: "1" },
  { name: "SMTP_PASSWORD", required: false, phase: "1" },
  { name: "DOMAIN_NAME", required: false, phase: "1" },
];

export const validateEnv = (): void => {
  const missing: string[] = [];
  const warnings: string[] = [];
  for (const envVar of envVariables) {
    const value = process.env[envVar.name];
    if (!value || value.trim() === "" || value.trim() === "xxx") {
      if (envVar.required) missing.push(envVar.name);
      else warnings.push(`${envVar.name} (Phase ${envVar.phase})`);
    }
  }
  if (warnings.length > 0)
    logger.warn(
      `Optional env variables not configured: ${warnings.join(", ")}`,
    );
  if (missing.length > 0) {
    logger.error(
      `FATAL: Missing required environment variables: ${missing.join(", ")}`,
    );
    logger.error(
      "Server cannot start. Please check your .env file against .env.example",
    );
    process.exit(1);
  }
  logger.info("Environment variables validated successfully");
};
