import { Payments, EnvironmentName } from "@nevermined-io/payments";

/**
 * Initializes the Nevermined Payments library.
 * @param {string} nvmApiKey - Nevermined API key
 * @param {string} environment - testing, staging or production
 * @returns {Payments} - Authenticated Payments instance
 */
export function initializePayments(
  nvmApiKey: string,
  environment: string
): Payments {
  const payments = Payments.getInstance({
    nvmApiKey,
    environment: environment as EnvironmentName,
  });
  if (!payments.isLoggedIn) {
    throw new Error("Failed to log in to the Nevermined Payments Library");
  }
  return payments;
}

/**
 * Gets the available credits for a plan.
 * @param {string} nvmApiKey - Nevermined API key
 * @param {string} environment - testing, staging or production
 * @param {string} planDid - The plan DID
 * @returns {Promise<number>} - The available credits
 */
export async function getCredits(
  nvmApiKey: string,
  environment: string,
  planDid: string
): Promise<number> {
  const payments = initializePayments(nvmApiKey, environment);
  const balanceResult = await payments.getPlanBalance(planDid);
  return parseInt(balanceResult.balance.toString());
}
