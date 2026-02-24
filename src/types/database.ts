export type AppRole = "admin" | "client";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";
export type RestrictionType = "sick" | "vacation" | "other";
export type WarningType = "warning" | "ban";

export interface Profile {
  id: string;
  role: AppRole;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  photos_public_by_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface AvailabilityRestriction {
  id: string;
  restriction_date: string;
  restriction_type: RestrictionType;
  note: string | null;
  created_at: string;
  created_by: string | null;
}

export interface LastMinuteOffer {
  id: string;
  offer_date: string;
  start_time: string;
  end_time: string;
  price_czk: number;
  created_at: string;
  created_by: string | null;
}

export interface Appointment {
  id: string;
  client_id: string;
  start_at: string;
  end_at: string;
  status: AppointmentStatus;
  is_last_minute: boolean;
  last_minute_price: number | null;
  note: string | null;
  client_change_reason: string | null;
  client_change_requested_at: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancelled_reason: string | null;
}

export interface Visit {
  id: string;
  appointment_id: string;
  client_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitPhoto {
  id: string;
  visit_id: string | null;
  client_id: string;
  storage_path: string;
  public: boolean;
  created_at: string;
}

export interface PhotoLike {
  id: string;
  photo_id: string;
  user_id: string;
  created_at: string;
}

export interface ClientRating {
  id: string;
  client_id: string;
  appointment_id: string | null;
  rating: number;
  note: string | null;
  created_at: string;
  created_by: string;
}

export interface ClientWarning {
  id: string;
  client_id: string;
  warning_type: WarningType;
  reason: string | null;
  appointment_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}
