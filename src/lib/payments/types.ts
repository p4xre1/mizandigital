export type CreditPackage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  credits: number;
  price_mad: number;
  price_usd: number | null;
  bonus_credits: number;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
};

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | "cancelled";
export type PaymentProvider = "manual" | "stripe" | "paypal" | "mopay" | "wafacash" | "cmi" | "other";

export type Payment = {
  id: string;
  user_ref: string | null;
  clerk_user_id: string | null;
  package_id: string | null;
  amount_mad: number;
  amount_usd: number | null;
  credits_purchased: number;
  bonus_credits: number;
  provider: PaymentProvider;
  provider_payment_id: string | null;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

export type CreditTransactionType = "earn" | "spend" | "purchase" | "refund" | "bonus" | "admin_grant" | "admin_revoke";

export type CreditTransaction = {
  id: string;
  user_ref: string;
  clerk_user_id: string | null;
  type: CreditTransactionType;
  amount: number;
  balance_after: number | null;
  reason: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
