import winston from "winston";
import { getEnvVars } from "./350_fnu_environmentVariables_wp.js";

const environment = getEnvVars();

const logger = winston.createLogger({
  level: environment.log_level,
  transports: [
    new winston.transports.Console()
  ]
});

export const Logger = logger;
