/** Types mirror supabase/migrations/0001_init.sql — the v2 six-table design. */

export type Category =
  | 'Smart Lock' | 'Hotel Lock' | 'Mini Lock' | 'Smart Switch'
  | 'Normal Switch' | 'Plug & Socket' | 'Others';

export type Platform = '1688' | 'Alibaba' | 'Trade Show' | 'Direct' | 'Other';

export type Channel =
  | 'Shopee' | 'Lazada' | 'Facebook' | 'Real Estate Developers'
  | 'Hotels' | 'Commercial Projects' | 'Government Projects';

export type ProductStatus = 'Draft' | 'Under Evaluation' | 'Scored' | 'Decision Pending' | 'Done';

export type DecisionStatus = 'Not Yet Evaluated' | 'Approved' | 'Interested' | 'Waiting' | 'Rejected';

export type Currency = 'CNY' | 'USD' | 'THB';

export type ShippingMethod = 'Sea Freight' | 'Air Freight' | 'Express';

export type CriterionKey =
  | 'factory_price' | 'moq' | 'lead_time'
  | 'design' | 'features' | 'quality'
  | 'shipping_available' | 'agency_required'
  | 'market_potential' | 'competitive_advantage';

export type Scores = Partial<Record<CriterionKey, number>>;
export type CriterionComments = Partial<Record<CriterionKey, string>>;

export interface UserRow {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Factory {
  id: string;
  name: string;
  platform: Platform | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  wechat_or_whatsapp: string | null;
  country: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  factory_id: string;
  name: string;
  model_number: string | null;
  source_url: string | null;
  product_notes: string | null;
  category: Category;
  custom_category_name: string | null;
  functions: string[];
  material: string | null;
  color: string[];
  certification: string[];
  warranty: string | null;
  smart_home_compatibility: string[];
  target_channels: Channel[];
  status: ProductStatus;
  decision_status: DecisionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string; // path within the `product-media` bucket
  is_hero: boolean;
  caption: string | null;
  sort_order: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface ProductCost {
  id: string;
  product_id: string;
  currency: Currency;
  factory_price: number;
  exchange_rate: number;
  shipping_method: ShippingMethod | null;
  shipping_cost: number;
  agency_cost: number;
  import_duty_percent: number;
  vat_percent: number;
  other_costs: number;
  landed_cost: number;
  suggested_selling_price: number | null;
  actual_selling_price: number | null;
  gross_profit: number | null;
  gross_margin: number | null;
  net_profit: number | null;
  roi: number | null;
  created_by: string | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  product_id: string;
  scores: Scores;
  comments: CriterionComments;
  overall_score: number | null;
  decision_status: DecisionStatus;
  decision_reason: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  updated_at: string;
}

/** Product joined with the summary data every list view needs. */
export interface ProductSummary extends Product {
  factory?: Pick<Factory, 'id' | 'name'>;
  hero_url?: string | null;
  latest_cost?: ProductCost | null;
  evaluation?: Evaluation | null;
}
