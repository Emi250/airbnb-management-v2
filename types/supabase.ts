// Generated-style typing for the project schema.
// Replace with `supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public > types/supabase.ts`
// once your Supabase project is set up.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ReservationStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type ReservationSource = "airbnb" | "booking" | "direct" | "other";
/** Cómo se arman las camas en los departamentos que las tienen desarmables. */
export type BedSetup = "together" | "separate";
export type ExpenseCategory =
  | "cleaning"
  | "maintenance"
  | "utilities"
  | "supplies"
  | "tax"
  | "other"
  | "fixed";
export type UserRole = "admin" | "caretaker" | "manager";

type PropertyRow = {
  id: string;
  name: string;
  address: string | null;
  base_price_ars: number | null;
  cleaning_fee_ars: number | null;
  color_hex: string | null;
  active: boolean;
  has_split_beds: boolean;
  created_at: string;
};
type PropertyInsert = {
  id?: string;
  name: string;
  address?: string | null;
  base_price_ars?: number | null;
  cleaning_fee_ars?: number | null;
  color_hex?: string | null;
  active?: boolean;
  has_split_beds?: boolean;
  created_at?: string;
};
type PropertyUpdate = Partial<PropertyInsert>;

type GuestRow = {
  version: number;
  merged_into: string | null;
  merged_at: string | null;
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  notes: string | null;
  created_at: string;
};
type GuestInsert = {
  version?: number;
  merged_into?: string | null;
  merged_at?: string | null;
  id?: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  notes?: string | null;
  created_at?: string;
};
type GuestUpdate = Partial<GuestInsert>;

type ReservationRow = {
  version: number;
  id: string;
  property_id: string;
  guest_id: string | null;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount_ars: number;
  amount_paid_ars: number;
  source: ReservationSource;
  platform_fee_ars: number | null;
  cleaning_fee_ars: number | null;
  status: ReservationStatus;
  notes: string | null;
  bed_setup: BedSetup | null;
  nights: number;
  checkin_reminder_sent_at: string | null;
  notion_page_id: string | null;
  created_at: string;
  updated_at: string;
};
type ReservationInsert = {
  version?: number;
  id?: string;
  property_id: string;
  guest_id?: string | null;
  check_in: string;
  check_out: string;
  num_guests?: number;
  total_amount_ars?: number;
  amount_paid_ars?: number;
  source?: ReservationSource;
  platform_fee_ars?: number | null;
  cleaning_fee_ars?: number | null;
  status?: ReservationStatus;
  notes?: string | null;
  bed_setup?: BedSetup | null;
  checkin_reminder_sent_at?: string | null;
  notion_page_id?: string | null;
  created_at?: string;
  updated_at?: string;
};
type ReservationUpdate = Partial<ReservationInsert>;

type ExpenseRow = {
  id: string;
  property_id: string | null;
  date: string;
  category: ExpenseCategory;
  amount_ars: number;
  description: string | null;
  created_at: string;
};
type ExpenseInsert = {
  id?: string;
  property_id?: string | null;
  date: string;
  category: ExpenseCategory;
  amount_ars: number;
  description?: string | null;
  created_at?: string;
};
type ExpenseUpdate = Partial<ExpenseInsert>;

type ExchangeRateRow = {
  id: string;
  ars_per_usd: number;
  ars_per_eur: number;
  updated_at: string;
};
type ExchangeRateInsert = {
  id?: string;
  ars_per_usd: number;
  ars_per_eur: number;
  updated_at?: string;
};
type ExchangeRateUpdate = Partial<ExchangeRateInsert>;

type UserRoleRowDb = {
  user_id: string;
  role: UserRole;
  display_name: string | null;
};
type UserRoleInsert = UserRoleRowDb;
type UserRoleUpdate = Partial<UserRoleRowDb>;

type FixedExpenseItemRow = {
  id: string;
  label: string;
  position: number;
  active: boolean;
  created_at: string;
};
type FixedExpenseItemInsert = {
  id?: string;
  label: string;
  position?: number;
  active?: boolean;
  created_at?: string;
};
type FixedExpenseItemUpdate = Partial<FixedExpenseItemInsert>;

type FixedExpenseCheckRow = {
  id: string;
  item_id: string;
  period: string;
  expense_id: string | null;
  paid_at: string;
};
type FixedExpenseCheckInsert = {
  id?: string;
  item_id: string;
  period: string;
  expense_id?: string | null;
  paid_at?: string;
};
type FixedExpenseCheckUpdate = Partial<FixedExpenseCheckInsert>;

type MonthlyTargetRow = {
  id: string;
  property_id: string;
  month: string;
  target_revenue_ars: number;
  target_occupancy: number | null;
  created_at: string;
  updated_at: string;
};
type MonthlyTargetInsert = {
  id?: string;
  property_id: string;
  month: string;
  target_revenue_ars: number;
  target_occupancy?: number | null;
  created_at?: string;
  updated_at?: string;
};
type MonthlyTargetUpdate = Partial<MonthlyTargetInsert>;

type CaretakerAgendaRowDb = {
  id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  notes: string | null;
  property_name: string;
  property_address: string | null;
  property_color: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  bed_setup: BedSetup | null;
};

type GenericRel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};
type Relationships = GenericRel[];

export type Payment = {
  id: string; reservation_id: string; kind: 'payment' | 'refund' | 'opening_balance';
  amount_ars: number; paid_on: string | null; method: string; reference: string | null;
  receipt_url: string | null; notes: string | null; actor_id: string | null; actor_name: string; created_at: string;
};
export type AuditEvent = {
  id: string; entity_type: string; entity_id: string; action: string; actor_id: string | null;
  actor_name: string; occurred_at: string; before_data: Json | null; after_data: Json | null;
};
export type NotionJob = {
  reservation_id: string; generation: number; state: 'pending' | 'processing' | 'synced' | 'error' | 'review_required';
  attempts: number; last_error: string | null; last_attempt_at: string | null; synced_at: string | null;
  next_attempt_at: string; lock_token: string | null; locked_at: string | null; create_started: boolean;
};
type OperationalTable<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: Relationships };

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      reservation_payments: OperationalTable<Payment>;
      audit_events: OperationalTable<AuditEvent>;
      notion_sync_jobs: OperationalTable<NotionJob>;
      properties: {
        Row: PropertyRow;
        Insert: PropertyInsert;
        Update: PropertyUpdate;
        Relationships: Relationships;
      };
      guests: {
        Row: GuestRow;
        Insert: GuestInsert;
        Update: GuestUpdate;
        Relationships: Relationships;
      };
      reservations: {
        Row: ReservationRow;
        Insert: ReservationInsert;
        Update: ReservationUpdate;
        Relationships: [
          {
            foreignKeyName: "reservations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_guest_id_fkey";
            columns: ["guest_id"];
            isOneToOne: false;
            referencedRelation: "guests";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: ExpenseInsert;
        Update: ExpenseUpdate;
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      exchange_rates: {
        Row: ExchangeRateRow;
        Insert: ExchangeRateInsert;
        Update: ExchangeRateUpdate;
        Relationships: Relationships;
      };
      user_roles: {
        Row: UserRoleRowDb;
        Insert: UserRoleInsert;
        Update: UserRoleUpdate;
        Relationships: Relationships;
      };
      fixed_expense_items: {
        Row: FixedExpenseItemRow;
        Insert: FixedExpenseItemInsert;
        Update: FixedExpenseItemUpdate;
        Relationships: Relationships;
      };
      fixed_expense_checks: {
        Row: FixedExpenseCheckRow;
        Insert: FixedExpenseCheckInsert;
        Update: FixedExpenseCheckUpdate;
        Relationships: [
          {
            foreignKeyName: "fixed_expense_checks_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "fixed_expense_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fixed_expense_checks_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          }
        ];
      };
      monthly_targets: {
        Row: MonthlyTargetRow;
        Insert: MonthlyTargetInsert;
        Update: MonthlyTargetUpdate;
        Relationships: [
          {
            foreignKeyName: "monthly_targets_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      caretaker_agenda: {
        Row: CaretakerAgendaRowDb;
        Relationships: Relationships;
      };
    };
    Functions: {
      export_business_backup: { Args: Record<string, never>; Returns: Json };
      update_guest: { Args: { p_id: string; p_version: number; p_input: Json }; Returns: undefined };
      merge_guests: { Args: { p_source: string; p_target: string; p_source_version: number; p_target_version: number }; Returns: string };
      record_payment: { Args: { p_reservation_id: string; p_version: number; p_input: Json }; Returns: string };
      claim_notion_sync: { Args: { p_id: string; p_force?: boolean }; Returns: Json };
      begin_notion_create: { Args: { p_id: string; p_token: string }; Returns: boolean };
      finish_notion_sync: { Args: { p_id: string; p_token: string; p_generation: number; p_state: string; p_error: string | null; p_page_id: string | null }; Returns: boolean };
      reset_notion_creation: { Args: { p_id: string }; Returns: undefined };
      save_reservation: {
        Args: { p_id: string | null; p_input: Json };
        Returns: string;
      };
      mark_fixed_paid: {
        Args: { p_item_id: string; p_period: string; p_amount: number; p_property_id: string | null };
        Returns: undefined;
      };
      unmark_fixed_paid: {
        Args: { p_item_id: string; p_period: string };
        Returns: undefined;
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Property = PropertyRow;
export type Guest = GuestRow;
export type Reservation = ReservationRow;
export type Expense = ExpenseRow;
export type ExchangeRate = ExchangeRateRow;
export type UserRoleRow = UserRoleRowDb;
export type CaretakerAgendaRow = CaretakerAgendaRowDb;
export type FixedExpenseItem = FixedExpenseItemRow;
export type FixedExpenseCheck = FixedExpenseCheckRow;
export type MonthlyTarget = MonthlyTargetRow;
