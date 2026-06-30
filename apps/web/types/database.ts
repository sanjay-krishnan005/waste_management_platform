export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      bins: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          device_id: string;
          serial_number: string;
          bin_type: "one" | "two" | "three" | "four";
          status: "active" | "maintenance" | "offline" | "decommissioned";
          latitude: number | null;
          longitude: number | null;
          latest_fill_level: number | null;
          [key: string]: unknown;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          role: "admin" | "customer";
          organization_id: string | null;
          customer_id: string | null;
          full_name: string | null;
          fcm_token: string | null;
          phone: string | null;
          telegram_chat_id: string | null;
          notify_email: boolean;
          notify_telegram: boolean;
        };
      };
    };
  };
}
