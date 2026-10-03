export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      inbound: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          isi: number | null
          jenis_penerimaan: string | null
          no_rak: string | null
          no_surat_jalan: string
          penempatan_gudang: string | null
          pic: string | null
          shift: string | null
          thickness: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis_penerimaan?: string | null
          no_rak?: string | null
          no_surat_jalan: string
          penempatan_gudang?: string | null
          pic?: string | null
          shift?: string | null
          thickness?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis_penerimaan?: string | null
          no_rak?: string | null
          no_surat_jalan?: string
          penempatan_gudang?: string | null
          pic?: string | null
          shift?: string | null
          thickness?: string | null
        }
        Relationships: []
      }
      inspeksi_outdoor: {
        Row: {
          created_at: string
          foto_atas: string | null
          foto_belakang: string | null
          foto_depan: string | null
          foto_samping_kanan: string | null
          foto_samping_kiri: string | null
          id: number
          items: Json | null
          lokasi: string | null
          pic: string | null
          shift: string | null
        }
        Insert: {
          created_at?: string
          foto_atas?: string | null
          foto_belakang?: string | null
          foto_depan?: string | null
          foto_samping_kanan?: string | null
          foto_samping_kiri?: string | null
          id?: never
          items?: Json | null
          lokasi?: string | null
          pic?: string | null
          shift?: string | null
        }
        Update: {
          created_at?: string
          foto_atas?: string | null
          foto_belakang?: string | null
          foto_depan?: string | null
          foto_samping_kanan?: string | null
          foto_samping_kiri?: string | null
          id?: never
          items?: Json | null
          lokasi?: string | null
          pic?: string | null
          shift?: string | null
        }
        Relationships: []
      }
      inspeksi_pengiriman: {
        Row: {
          barcode_label: boolean | null
          created_at: string
          description: string | null
          foto: string | null
          id: number
          moisture: boolean | null
          no_barcode: string | null
          no_kontainer: string | null
          packing: boolean | null
          pic: string | null
          shift: string | null
          silica: boolean | null
          steelband: boolean | null
          stopper_steelband: boolean | null
          vinyl: boolean | null
        }
        Insert: {
          barcode_label?: boolean | null
          created_at?: string
          description?: string | null
          foto?: string | null
          id?: never
          moisture?: boolean | null
          no_barcode?: string | null
          no_kontainer?: string | null
          packing?: boolean | null
          pic?: string | null
          shift?: string | null
          silica?: boolean | null
          steelband?: boolean | null
          stopper_steelband?: boolean | null
          vinyl?: boolean | null
        }
        Update: {
          barcode_label?: boolean | null
          created_at?: string
          description?: string | null
          foto?: string | null
          id?: never
          moisture?: boolean | null
          no_barcode?: string | null
          no_kontainer?: string | null
          packing?: boolean | null
          pic?: string | null
          shift?: string | null
          silica?: boolean | null
          steelband?: boolean | null
          stopper_steelband?: boolean | null
          vinyl?: boolean | null
        }
        Relationships: []
      }
      instruksi_kerja: {
        Row: {
          created_at: string
          id: number
          judul: string
          keterangan: string | null
          nama_file: string | null
          pdf_path: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: never
          judul: string
          keterangan?: string | null
          nama_file?: string | null
          pdf_path?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: never
          judul?: string
          keterangan?: string | null
          nama_file?: string | null
          pdf_path?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instruksi_kerja_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      laporan_shift: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          pdf_path: string | null
          pic: string | null
          shift: string | null
          tanggal: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: never
          pdf_path?: string | null
          pic?: string | null
          shift?: string | null
          tanggal?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: never
          pdf_path?: string | null
          pic?: string | null
          shift?: string | null
          tanggal?: string | null
        }
        Relationships: []
      }
      master_data: {
        Row: {
          barcode: string
          keeping_no: string | null
          product_code: string | null
          product_name: string | null
          stock: number | null
          thickness: string | null
        }
        Insert: {
          barcode: string
          keeping_no?: string | null
          product_code?: string | null
          product_name?: string | null
          stock?: number | null
          thickness?: string | null
        }
        Update: {
          barcode?: string
          keeping_no?: string | null
          product_code?: string | null
          product_name?: string | null
          stock?: number | null
          thickness?: string | null
        }
        Relationships: []
      }
      moisture_container: {
        Row: {
          belakang_a: number | null
          belakang_b: number | null
          created_at: string
          depan_d: number | null
          depan_e: number | null
          foto_belakang_a: string | null
          foto_belakang_b: string | null
          foto_depan_d: string | null
          foto_depan_e: string | null
          foto_form: string | null
          foto_tengah_c: string | null
          id: number
          no_kontainer: string | null
          pic: string | null
          rata_rata: number | null
          shift: string | null
          tengah_c: number | null
        }
        Insert: {
          belakang_a?: number | null
          belakang_b?: number | null
          created_at?: string
          depan_d?: number | null
          depan_e?: number | null
          foto_belakang_a?: string | null
          foto_belakang_b?: string | null
          foto_depan_d?: string | null
          foto_depan_e?: string | null
          foto_form?: string | null
          foto_tengah_c?: string | null
          id?: never
          no_kontainer?: string | null
          pic?: string | null
          rata_rata?: number | null
          shift?: string | null
          tengah_c?: number | null
        }
        Update: {
          belakang_a?: number | null
          belakang_b?: number | null
          created_at?: string
          depan_d?: number | null
          depan_e?: number | null
          foto_belakang_a?: string | null
          foto_belakang_b?: string | null
          foto_depan_d?: string | null
          foto_depan_e?: string | null
          foto_form?: string | null
          foto_tengah_c?: string | null
          id?: never
          no_kontainer?: string | null
          pic?: string | null
          rata_rata?: number | null
          shift?: string | null
          tengah_c?: number | null
        }
        Relationships: []
      }
      nearmiss: {
        Row: {
          created_at: string
          description: string | null
          foto: Json | null
          id: number
          jam: string | null
          kronologi: string | null
          manpower: Json | null
          no_barcode: string | null
          pdf_path: string | null
          pic: string | null
          shift: string | null
          tanggal: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          foto?: Json | null
          id?: never
          jam?: string | null
          kronologi?: string | null
          manpower?: Json | null
          no_barcode?: string | null
          pdf_path?: string | null
          pic?: string | null
          shift?: string | null
          tanggal?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          foto?: Json | null
          id?: never
          jam?: string | null
          kronologi?: string | null
          manpower?: Json | null
          no_barcode?: string | null
          pdf_path?: string | null
          pic?: string | null
          shift?: string | null
          tanggal?: string | null
        }
        Relationships: []
      }
      outbound: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          isi: number | null
          jenis: string | null
          kontainer: string | null
          no_surat_jalan: string
          pic: string | null
          shift: string | null
          team: string | null
          thickness: string | null
          tujuan: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis?: string | null
          kontainer?: string | null
          no_surat_jalan: string
          pic?: string | null
          shift?: string | null
          team?: string | null
          thickness?: string | null
          tujuan?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis?: string | null
          kontainer?: string | null
          no_surat_jalan?: string
          pic?: string | null
          shift?: string | null
          team?: string | null
          thickness?: string | null
          tujuan?: string | null
        }
        Relationships: []
      }
      packing: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          isi: number | null
          no_rak: string | null
          pic: string | null
          shift: string | null
          thickness: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          no_rak?: string | null
          pic?: string | null
          shift?: string | null
          thickness?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          no_rak?: string | null
          pic?: string | null
          shift?: string | null
          thickness?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id: string
          nama: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      rak_audit: {
        Row: {
          aktual: number | null
          erp: number | null
          id: number
          keterangan: string | null
          no_rak: string
          updated_at: string
          updated_by: string | null
          warehouse: string
        }
        Insert: {
          aktual?: number | null
          erp?: number | null
          id?: never
          keterangan?: string | null
          no_rak: string
          updated_at?: string
          updated_by?: string | null
          warehouse: string
        }
        Update: {
          aktual?: number | null
          erp?: number | null
          id?: never
          keterangan?: string | null
          no_rak?: string
          updated_at?: string
          updated_by?: string | null
          warehouse?: string
        }
        Relationships: [
          {
            foreignKeyName: "rak_audit_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transfer: {
        Row: {
          barcode: string | null
          created_at: string
          description: string | null
          id: number
          isi: number | null
          jenis: string | null
          kontainer: string | null
          no_surat_jalan: string
          pic: string | null
          shift: string | null
          thickness: string | null
          tujuan: string | null
          warehouse: string | null
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis?: string | null
          kontainer?: string | null
          no_surat_jalan: string
          pic?: string | null
          shift?: string | null
          thickness?: string | null
          tujuan?: string | null
          warehouse?: string | null
        }
        Update: {
          barcode?: string | null
          created_at?: string
          description?: string | null
          id?: never
          isi?: number | null
          jenis?: string | null
          kontainer?: string | null
          no_surat_jalan?: string
          pic?: string | null
          shift?: string | null
          thickness?: string | null
          tujuan?: string | null
          warehouse?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      rak_erp_count: {
        Row: {
          erp: number | null
          no_rak: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _agg_by: {
        Args: {
          _col: string
          _dari: string
          _lim?: number
          _sampai: string
          _tbl: string
        }
        Returns: Json
      }
      cari_barang: {
        Args: { _q: string; _warehouse?: string }
        Returns: {
          barcode: string
          keeping_no: string
          product_code: string
          product_name: string
          stock: number
          thickness: string
          warehouse: string
        }[]
      }
      dashboard_detail: {
        Args: { _dari: string; _jenis: string; _sampai: string }
        Returns: Json
      }
      dashboard_ringkasan: {
        Args: { _dari: string; _sampai: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      rak_list: {
        Args: { _warehouse: string }
        Returns: {
          aktual: number
          erp: number
          id: number
          keterangan: string
          no_rak: string
          updated_at: string
        }[]
      }
      set_rak_aktual: {
        Args: { _aktual: number; _id: number; _keterangan: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "supervisor", "operator"],
    },
  },
} as const
