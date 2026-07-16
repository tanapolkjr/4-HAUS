import { supabase } from '@/lib/supabase';
import { calculateCosts, type CostInputs } from '@/lib/calculations';
import type { ProductCost } from '@/lib/types';
import { refreshStatus } from './products';

export async function listCosts(productId: string): Promise<ProductCost[]> {
  const { data, error } = await supabase
    .from('product_costs').select('*').eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProductCost[];
}

/** Append-only: every save is a new history row, never an overwrite. */
export async function saveCostEstimate(
  productId: string,
  inputs: CostInputs & { shippingMethod: string | null },
  userId: string,
): Promise<ProductCost> {
  const r = calculateCosts(inputs);
  const { data, error } = await supabase.from('product_costs').insert({
    product_id: productId,
    currency: inputs.currency,
    factory_price: inputs.factoryPrice,
    exchange_rate: inputs.currency === 'THB' ? 1 : inputs.exchangeRate,
    shipping_method: inputs.shippingMethod,
    shipping_cost: inputs.shippingCost,
    agency_cost: inputs.agencyCost,
    import_duty_percent: inputs.importDutyPercent,
    vat_percent: inputs.vatPercent,
    other_costs: inputs.otherCosts,
    landed_cost: r.landedCost,
    suggested_selling_price: inputs.suggestedSellingPrice,
    actual_selling_price: inputs.actualSellingPrice,
    gross_profit: r.grossProfit,
    gross_margin: r.grossMargin,
    net_profit: r.netProfit,
    roi: r.roi,
    created_by: userId,
  }).select().single();
  if (error) throw error;
  await refreshStatus(productId);
  return data as ProductCost;
}
