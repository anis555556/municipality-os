export const roles = ["SUPER_ADMIN", "ADMIN", "EDITOR", "STAFF", "CITIZEN"] as const;
export type Role = typeof roles[number];
export const requestStatuses = ["NEW", "UNDER_REVIEW", "IN_PROGRESS", "WAITING_CITIZEN", "COMPLETED", "REJECTED", "CANCELLED"] as const;
export const complaintStatuses = ["NEW", "RECEIVED", "PROCESSING", "RESOLVED", "REJECTED"] as const;
export type GeoPoint = { longitude: number; latitude: number };

export type MunicipalityProfile = {
  id: string; name: string; slug: string; description: string; phone: string; email: string;
  address: string; latitude: number; longitude: number; logoUrl?: string | null; brandPrimary: string; brandSecondary: string;
  settings?: Record<string, unknown>;
};

export type CityService = {
  id: string; slug: string; name: string; category: string; description: string; duration: string;
  fee: string; status: "ACTIVE" | "INACTIVE"; requirements: string[]; steps: string[]; icon: string;
};

export type MapFeature = { id: string; name: string; category: string; description: string; longitude: number; latitude: number; status?: string; progress?: number };
