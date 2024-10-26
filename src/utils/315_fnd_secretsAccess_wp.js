"use strict";

/**
 * @file - 315_fnd_secretsAccess_wp.js
 * @author - Tom Barrington, Nov 2023
 * @copyright Fourdotzero Software Ltd
 */

////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * @namespace A_DEPENDENCIES
 */
import { Logger } from "./320_fnu_logHandler_wp.js";
import { getEnvVars } from "./350_fnu_environmentVariables_wp.js";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

/**
 * @namespace A_VARIABLES
 */

/**
 * Environment variables.
 * @memberof A_VARIABLES
 * @const {object}
 */
const environment = getEnvVars();

/**
 * A client for accessing the AWS Secrets Manager service
 * @memberof A_VARIABLES
 * @const {SecretsManagerClient}
 */
const client = new SecretsManagerClient(environment.awsClientConfig);


/**
 * @namespace B_SHARED_FUNCTIONS
 */

/**
 * Get a secret from the AWS Secrets Manager service
 * @memberof B_SHARED_FUNCTIONS
 * @param {string} secretId - The name of the secret to retrieve
 * @returns {string|null} - The secret value or null if not found
 */
export async function getSecret(secretId) {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretId });
    const response = await client.send(command);
    // Parse and return the secret value
    const secretString = JSON.parse(response.SecretString);
    if (secretString) {
      return secretString;
    }
    return null;
  } catch (error) {
    Logger.error(`Error getting secret '${secretId}'`);
    return null;
  }
}
