export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Dog {
  id: number;
  user_id: number | null;
  name: string;
  breed: string | null;
  weight_kg: number | null;
  created_at: string;
}

export interface Walk {
  id: number;
  dog_id: number;
  date: string;
  duration_minutes: number | null;
  distance_km: number;
  notes: string | null;
  created_at: string;
}

export interface Goal {
  id: number;
  dog_id: number;
  target_distance_weekly: number | null;
  target_walks_per_week: number | null;
  updated_at: string;
}

export interface CreateWalkInput {
  dog_id: number;
  date: string;
  duration_minutes?: number;
  distance_km?: number;
  notes?: string;
}

export interface UpdateWalkInput {
  id: number;
  date: string;
  duration_minutes?: number;
  distance_km: number;
  notes?: string;
}

export interface CreateDogInput {
  name: string;
  breed?: string;
  weight_kg?: number;
  user_id?: number;
}

export interface UpdateDogInput {
  id: number;
  name: string;
  breed?: string;
  weight_kg?: number;
}

export interface DailyStats {
  total_walks_week: number;
  total_distance_week: number;
  streak_days: number;
  avg_distance_week: number;
}
