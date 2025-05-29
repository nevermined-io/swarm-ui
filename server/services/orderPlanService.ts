import { PlanDDOHelper } from "./planDDOHelper";
import { hasSufficientERC20Balance, findMintEvent } from "./blockchainService";

/**
 * Orders credits for a plan, checks balance, and returns the mint transaction.
 * @param {any} payments - Payments instance
 * @param {string} planDid - Plan DID
 * @returns {Promise<{ success: boolean, txHash?: string, credits?: string, message: string }>}
 */
export async function orderPlanCredits(
  payments: any,
  planDid: string
): Promise<{
  success: boolean;
  txHash?: string;
  credits?: string;
  message: string;
}> {
  const planHelper = new PlanDDOHelper(payments, planDid);
  await planHelper.loadDDO();

  // 1. Get plan price and token address
  const planPrice = await planHelper.getPlanPrice();
  const tokenAddress = await planHelper.getTokenAddress();
  if (!tokenAddress) {
    return { success: false, message: "Token address not found in plan DDO" };
  }

  // 2. Get our wallet address
  // TODO: Implement getOurWalletAddress() to return the wallet associated with our Nevermined API key
  const ourWallet = await getOurWalletAddress();

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
  const fromBlock = await getCurrentBlockNumber(); // TODO: Implement getCurrentBlockNumber() using ethers.js provider
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
