export type MemberStatus = "active" | "inactive";

export type Member = {
  id: string;
  name: string;
  email: string;
  phone: string;
  planId: string | null;
  plan: string;
  planPrice: number | null;
  status: MemberStatus;
  joinedAt: string;
  nextDue: string;
};

export type PaymentStatus = "due" | "overdue" | "paid";

export type Payment = {
  id: string;
  memberId: string;
  memberName: string;
  membershipPlanName: string;
  type: "membership" | "admission";
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: PaymentStatus;
};

export type GymContext = { id: string; name: string; role: string; admissionFee: number; logoPath: string | null; logoUrl: string | null };

export type MembershipPlan = {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: string;
};

export type GymSubscription = {
  planKey: string;
  status: string;
  currentPeriodEnd: string;
};