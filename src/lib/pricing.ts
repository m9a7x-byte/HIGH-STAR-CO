import { AgentDetails, Product } from '../types';

export const getAgentPriceIncreasePercent = (agentDetails?: Pick<AgentDetails, 'priceIncreasePercent'> | null) => {
  const value = Number(agentDetails?.priceIncreasePercent || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

export const applyPriceIncrease = (price: number, increasePercent?: number) => {
  const basePrice = Number(price || 0);
  const percent = Number(increasePercent || 0);
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return basePrice;
  return Math.round(basePrice * (1 + percent / 100) * 100) / 100;
};

export const getAdjustedProductPrices = (product: Product | undefined, agentDetails?: AgentDetails | null) => {
  const basePrices = product && agentDetails ? product.prices?.[agentDetails.type] : undefined;
  const increasePercent = getAgentPriceIncreasePercent(agentDetails);

  return {
    pricePerCarton: applyPriceIncrease(basePrices?.pricePerCarton || 0, increasePercent),
    pricePerMeter: applyPriceIncrease(basePrices?.pricePerMeter || 0, increasePercent),
    increasePercent
  };
};
