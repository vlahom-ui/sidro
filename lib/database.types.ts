export type VenueStatus = "draft" | "published";
export type ItemTip = "proizvod" | "usluga";
export type ItemDostupnost = "dostupno" | "nedostupno";
export type ImportSourceType = "pdf" | "docx" | "xlsx" | "csv" | "xml" | "url" | "tekst" | "jpg" | "png";
export type GeneratedFileFormat = "csv" | "xml";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      venues: {
        Row: {
          id: string;
          owner_user_id: string;
          naziv: string;
          slug: string;
          oblik_objekta: string;
          adresa: string;
          oib: string | null;
          status: VenueStatus;
          default_tip: ItemTip | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          naziv: string;
          slug: string;
          oblik_objekta: string;
          adresa: string;
          oib?: string | null;
          status?: VenueStatus;
          default_tip?: ItemTip | null;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
      };
      items: {
        Row: {
          id: string;
          venue_id: string;
          tip: ItemTip;
          naziv: string;
          sifra: string | null;
          marka: string | null;
          jedinica_mjere: string | null;
          cijena_po_jedinici: number | null;
          cijena: number;
          poseban_oblik_prodaje: boolean;
          naziv_posebnog_oblika: string | null;
          sidrena_cijena: number | null;
          barkod: string | null;
          dostupnost: ItemDostupnost | null;
          jezik: string;
          kategorija: string | null;
          redoslijed: number | null;
          url_slike: string | null;
          item_group_id: string | null;
          variant_label: string | null;
          cjenik_id: string | null;
          first_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          tip: ItemTip;
          naziv: string;
          sifra?: string | null;
          marka?: string | null;
          jedinica_mjere?: string | null;
          cijena_po_jedinici?: number | null;
          cijena: number;
          poseban_oblik_prodaje?: boolean;
          naziv_posebnog_oblika?: string | null;
          sidrena_cijena?: number | null;
          barkod?: string | null;
          dostupnost?: ItemDostupnost | null;
          jezik?: string;
          kategorija?: string | null;
          redoslijed?: number | null;
          url_slike?: string | null;
          item_group_id?: string | null;
          variant_label?: string | null;
          cjenik_id?: string | null;
          first_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
      };
      item_groups: {
        Row: {
          id: string;
          venue_id: string;
          tip: ItemTip;
          naziv: string;
          opis: string | null;
          trajanje: string | null;
          cjenik_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          tip: ItemTip;
          naziv: string;
          opis?: string | null;
          trajanje?: string | null;
          cjenik_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["item_groups"]["Insert"]>;
      };
      cjenici: {
        Row: {
          id: string;
          venue_id: string;
          naziv: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          naziv: string;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["cjenici"]["Insert"]>;
      };
      price_history: {
        Row: {
          id: string;
          item_id: string;
          cijena: number;
          vrijedi_od: string;
          vrijedi_do: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          cijena: number;
          vrijedi_od?: string;
          vrijedi_do?: string | null;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["price_history"]["Insert"]>;
      };
      import_sources: {
        Row: {
          id: string;
          venue_id: string;
          source_type: ImportSourceType;
          status: string;
          method: string;
          item_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          source_type: ImportSourceType;
          status: string;
          method: string;
          item_count?: number;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["import_sources"]["Insert"]>;
      };
      generated_files: {
        Row: {
          id: string;
          venue_id: string;
          format: GeneratedFileFormat;
          tip: ItemTip;
          file_url: string;
          version_number: number;
          generated_at: string;
          expires_at: string;
          is_current: boolean;
        };
        Insert: {
          id?: string;
          venue_id: string;
          format: GeneratedFileFormat;
          tip: ItemTip;
          file_url: string;
          version_number: number;
          generated_at?: string;
          expires_at: string;
          is_current?: boolean;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["generated_files"]["Insert"]>;
      };
      image_candidates: {
        Row: {
          id: string;
          venue_id: string;
          url_slike: string;
          matched_item_id: string | null;
          source_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          venue_id: string;
          url_slike: string;
          matched_item_id?: string | null;
          source_url: string;
          created_at?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["image_candidates"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          venue_id: string | null;
          action: string;
          outcome: string;
          details: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          venue_id?: string | null;
          action: string;
          outcome: string;
          details?: string | null;
          timestamp?: string;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
      };
      consents: {
        Row: {
          id: string;
          user_id: string;
          venue_id: string | null;
          policy_version: string;
          accepted_at: string;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          venue_id?: string | null;
          policy_version: string;
          accepted_at?: string;
          ip_address?: string | null;
        };
        Relationships: [];
        Update: Partial<Database["public"]["Tables"]["consents"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_and_increment_rate_limit: {
        Args: {
          p_action: string;
          p_window_seconds: number;
          p_max_requests: number;
        };
        Returns: boolean;
      };
      email_has_account: {
        Args: {
          p_email: string;
        };
        Returns: boolean;
      };
    };
  };
}
