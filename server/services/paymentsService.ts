import { Payments, EnvironmentName } from "@nevermined-io/payments";
import { PlanDDOHelper } from "./planDDOHelper";
import {
  hasSufficientERC20Balance,
  findMintEvent,
  getCurrentBlockNumber,
  findBurnEvent,
} from "./blockchainService";

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
export async function getUserCredits(nvmApiKey: string): Promise<number> {
  const environment = process.env.NVM_ENVIRONMENT || "testing";
  const planDid = process.env.PLAN_DID;
  if (!nvmApiKey || !planDid) {
    throw new Error("Missing Nevermined API key or plan DID");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const balanceResult = await payments.getPlanBalance(planDid);
  const credit = parseInt(balanceResult.balance.toString());
  return credit;
}

/**
 * Create a task in the orchestrator using the payments library and return the task_id.
 * @param {string} input_query - The user's message
 * @param {string} nvmApiKey - Nevermined API key
 * @returns {Promise<string>} - The created task_id
 */
export async function createTask(
  input_query: string,
  nvmApiKey: string
): Promise<string> {
  const environment = process.env.NVM_ENVIRONMENT || "testing";
  const planDid = process.env.PLAN_DID;
  const agentDid = process.env.AGENT_DID;
  if (!nvmApiKey || !planDid || !agentDid) {
    throw new Error("Missing config");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const accessConfig = await payments.query.getServiceAccessConfig(agentDid);
  const result = await payments.query.createTask(
    agentDid,
    {
      input_query,
    },
    accessConfig
  );
  if (!result.data || !result.data.task.task_id) {
    throw new Error("No task_id returned from orchestrator");
  }
  return result.data.task.task_id;
}

/**
 * Orders credits for a plan, checks balance, and returns the mint transaction.
 * @param {string} planDid - Plan DID
 * @param {string} nvmApiKey - Nevermined API key
 * @returns {Promise<{ success: boolean, txHash?: string, credits?: string, message: string }>}
 */
export async function orderPlanCredits(
  planDid: string,
  nvmApiKey: string
): Promise<{
  success: boolean;
  txHash?: string;
  credits?: string;
  message: string;
}> {
  const environment = process.env.NVM_ENVIRONMENT;
  if (!nvmApiKey || !environment) {
    throw new Error("Missing Nevermined API key or environment");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const planHelper = new PlanDDOHelper(payments, planDid);
  await planHelper.loadDDO();

  // 1. Get plan price and token address
  const planPrice = await planHelper.getPlanPrice();
  const tokenAddress = await planHelper.getTokenAddress();
  if (!tokenAddress) {
    return { success: false, message: "Token address not found in plan DDO" };
  }

  // 2. Get our wallet address
  const ourWallet = payments.accountAddress || "";
  if (!ourWallet) {
    return { success: false, message: "Wallet address not found" };
  }

  // 3. Check if we have enough USDC
  const hasBalance = await hasSufficientERC20Balance(
    tokenAddress,
    ourWallet,
    planPrice
  );
  if (!hasBalance) {
    return {
      success: false,
      message: "Insufficient USDC balance to purchase credits",
    };
  }

  // 4. Call orderPlan
  const fromBlock = await getCurrentBlockNumber();
  const orderResult = await payments.orderPlan(planDid);
  if (!orderResult.success) {
    return { success: false, message: "Failed to order credits for plan" };
  }

  // 5. Find mint event
  const contractAddress = await planHelper.get1155ContractAddress();
  const tokenId = await planHelper.getTokenId();
  const mintEvent = contractAddress
    ? await findMintEvent(contractAddress, ourWallet, tokenId, fromBlock)
    : null;

  // 6. Return result
  if (mintEvent) {
    return {
      success: true,
      txHash: mintEvent.txHash,
      credits: mintEvent.value,
      message: `Credits purchased and added to your balance. (tx: ${mintEvent.txHash})`,
    };
  }
  return {
    success: true,
    message: "Credits purchased and added to your balance.",
  };
}

/**
 * Gets the burn transaction info for the current plan and wallet from a given block.
 * @param {number} fromBlock - The block number to start searching from
 * @param {string} nvmApiKey - Nevermined API key
 * @returns {Promise<{ txHash: string, credits: string, planDid: string } | null>}
 */
export async function getBurnTransactionInfo(
  fromBlock: number,
  nvmApiKey: string
): Promise<{ txHash: string; credits: string; planDid: string } | null> {
  const environment = process.env.NVM_ENVIRONMENT || "testing";
  const planDid = process.env.PLAN_DID;
  if (!nvmApiKey || !planDid) {
    throw new Error("Missing config");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const planHelper = new PlanDDOHelper(payments, planDid);
  await planHelper.loadDDO();
  const contractAddress = await planHelper.get1155ContractAddress();
  const tokenId = await planHelper.getTokenId();
  const ourWallet = payments.accountAddress || "";
  if (!contractAddress || !tokenId || !ourWallet) {
    throw new Error("Missing contract, tokenId or wallet");
  }
  let burnEvent = null;
  let attempts = 0;
  while (attempts < 10 && !burnEvent) {
    burnEvent = await findBurnEvent(
      contractAddress,
      ourWallet,
      tokenId,
      fromBlock
    );
    if (!burnEvent) {
      attempts++;
      if (attempts < 10) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
  if (burnEvent) {
    return {
      txHash: burnEvent.txHash,
      credits: burnEvent.value,
      planDid: planDid,
    };
  }
  return null;
}

/**
 * Get the details of a task by its task_id.
 * @param {string} task_id - Task ID
 * @param {string} nvmApiKey - Nevermined API key
 * @returns {Promise<any>} - Task details
 */
export async function getTask(
  task_id: string,
  nvmApiKey: string
): Promise<any> {
  const environment = process.env.NVM_ENVIRONMENT || "testing";
  const agentDid = process.env.AGENT_DID;
  if (!nvmApiKey || !agentDid) {
    throw new Error("Missing config");
  }
  const payments = initializePayments(nvmApiKey, environment);
  const queryOpts = await payments.query.getServiceAccessConfig(agentDid);
  const task = await payments.query.getTaskWithSteps(
    agentDid,
    task_id,
    queryOpts
  );
  return task;
}
