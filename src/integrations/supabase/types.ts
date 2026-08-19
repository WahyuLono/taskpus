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
      detail_petugas: {
        Row: {
          id_detail: number
          id_lpd: string | null
          id_user_petugas: string | null
        }
        Insert: {
          id_detail?: number
          id_lpd?: string | null
          id_user_petugas?: string | null
        }
        Update: {
          id_detail?: number
          id_lpd?: string | null
          id_user_petugas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_petugas_id_lpd_fkey"
            columns: ["id_lpd"]
            isOneToOne: false
            referencedRelation: "transaksi_lpd"
            referencedColumns: ["id_lpd"]
          },
          {
            foreignKeyName: "detail_petugas_id_user_petugas_fkey"
            columns: ["id_user_petugas"]
            isOneToOne: false
            referencedRelation: "master_user"
            referencedColumns: ["id_user"]
          },
        ]
      }
      master_golongan: {
        Row: {
          id_golongan: number
          nama_golongan: string
        }
        Insert: {
          id_golongan?: number
          nama_golongan: string
        }
        Update: {
          id_golongan?: number
          nama_golongan?: string
        }
        Relationships: []
      }
      master_rangka: {
        Row: {
          id_rangka: number
          nama_rangka: string
        }
        Insert: {
          id_rangka?: number
          nama_rangka: string
        }
        Update: {
          id_rangka?: number
          nama_rangka?: string
        }
        Relationships: []
      }
      master_tempat: {
        Row: {
          id_tempat: number
          nama_tempat: string
        }
        Insert: {
          id_tempat?: number
          nama_tempat: string
        }
        Update: {
          id_tempat?: number
          nama_tempat?: string
        }
        Relationships: []
      }
      master_user: {
        Row: {
          created_at: string | null
          email_internal: string | null
          id_golongan: number | null
          id_user: string
          is_kepala_uptd: boolean | null
          jabatan: string | null
          nama: string
          nip: string | null
          role_user: Database["public"]["Enums"]["role_aplikasi"] | null
          status_kepegawaian: Database["public"]["Enums"]["status_pegawai"]
          unit: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email_internal?: string | null
          id_golongan?: number | null
          id_user: string
          is_kepala_uptd?: boolean | null
          jabatan?: string | null
          nama: string
          nip?: string | null
          role_user?: Database["public"]["Enums"]["role_aplikasi"] | null
          status_kepegawaian: Database["public"]["Enums"]["status_pegawai"]
          unit?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email_internal?: string | null
          id_golongan?: number | null
          id_user?: string
          is_kepala_uptd?: boolean | null
          jabatan?: string | null
          nama?: string
          nip?: string | null
          role_user?: Database["public"]["Enums"]["role_aplikasi"] | null
          status_kepegawaian?: Database["public"]["Enums"]["status_pegawai"]
          unit?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_user_id_golongan_fkey"
            columns: ["id_golongan"]
            isOneToOne: false
            referencedRelation: "master_golongan"
            referencedColumns: ["id_golongan"]
          },
        ]
      }
      nomor_surat_allocation: {
        Row: {
          created_at: string
          id_allocation: number
          last_used_number: number
          range_end: number
          range_start: number
          status: string
          tahun: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id_allocation?: never
          last_used_number: number
          range_end: number
          range_start: number
          status?: string
          tahun: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id_allocation?: never
          last_used_number?: number
          range_end?: number
          range_start?: number
          status?: string
          tahun?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifikasi: {
        Row: {
          created_at: string
          id: string
          id_lpd: string | null
          id_user: string
          is_read: boolean
          judul: string
          pesan: string
          read_at: string | null
          tipe: Database["public"]["Enums"]["notifikasi_tipe"]
        }
        Insert: {
          created_at?: string
          id?: string
          id_lpd?: string | null
          id_user: string
          is_read?: boolean
          judul: string
          pesan: string
          read_at?: string | null
          tipe: Database["public"]["Enums"]["notifikasi_tipe"]
        }
        Update: {
          created_at?: string
          id?: string
          id_lpd?: string | null
          id_user?: string
          is_read?: boolean
          judul?: string
          pesan?: string
          read_at?: string | null
          tipe?: Database["public"]["Enums"]["notifikasi_tipe"]
        }
        Relationships: []
      }
      settings_config: {
        Row: {
          id_config: number
          matrix_access: Json | null
          template_no_surat: string | null
        }
        Insert: {
          id_config: number
          matrix_access?: Json | null
          template_no_surat?: string | null
        }
        Update: {
          id_config?: number
          matrix_access?: Json | null
          template_no_surat?: string | null
        }
        Relationships: []
      }
      transaksi_lpd: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status_lpd"]
          approved_at: string | null
          approved_by: string | null
          catatan_reject: string | null
          created_at: string | null
          deleted_at: string | null
          id_kepala: string | null
          id_lpd: string
          id_rangka: number | null
          id_tempat: number | null
          input_alat: string | null
          input_lama_kegiatan: string | null
          input_metode: string | null
          jenis_perjadin: string
          lama_hari: number
          no_surat: string
          no_surat_slug: string
          output: string | null
          proses_hambatan: string | null
          proses_sasaran: string | null
          status_lpd: Database["public"]["Enums"]["status_surat"] | null
          tgl_buat: string
          tgl_kegiatan: string
          tgl_selesai: string
          tindak_lanjut: string | null
          updated_at: string | null
          url_foto: string | null
          url_foto_2: string | null
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status_lpd"]
          approved_at?: string | null
          approved_by?: string | null
          catatan_reject?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id_kepala?: string | null
          id_lpd?: string
          id_rangka?: number | null
          id_tempat?: number | null
          input_alat?: string | null
          input_lama_kegiatan?: string | null
          input_metode?: string | null
          jenis_perjadin: string
          lama_hari: number
          no_surat: string
          no_surat_slug: string
          output?: string | null
          proses_hambatan?: string | null
          proses_sasaran?: string | null
          status_lpd?: Database["public"]["Enums"]["status_surat"] | null
          tgl_buat: string
          tgl_kegiatan: string
          tgl_selesai: string
          tindak_lanjut?: string | null
          updated_at?: string | null
          url_foto?: string | null
          url_foto_2?: string | null
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status_lpd"]
          approved_at?: string | null
          approved_by?: string | null
          catatan_reject?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id_kepala?: string | null
          id_lpd?: string
          id_rangka?: number | null
          id_tempat?: number | null
          input_alat?: string | null
          input_lama_kegiatan?: string | null
          input_metode?: string | null
          jenis_perjadin?: string
          lama_hari?: number
          no_surat?: string
          no_surat_slug?: string
          output?: string | null
          proses_hambatan?: string | null
          proses_sasaran?: string | null
          status_lpd?: Database["public"]["Enums"]["status_surat"] | null
          tgl_buat?: string
          tgl_kegiatan?: string
          tgl_selesai?: string
          tindak_lanjut?: string | null
          updated_at?: string | null
          url_foto?: string | null
          url_foto_2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaksi_lpd_id_kepala_fkey"
            columns: ["id_kepala"]
            isOneToOne: false
            referencedRelation: "master_user"
            referencedColumns: ["id_user"]
          },
          {
            foreignKeyName: "transaksi_lpd_id_rangka_fkey"
            columns: ["id_rangka"]
            isOneToOne: false
            referencedRelation: "master_rangka"
            referencedColumns: ["id_rangka"]
          },
          {
            foreignKeyName: "transaksi_lpd_id_tempat_fkey"
            columns: ["id_tempat"]
            isOneToOne: false
            referencedRelation: "master_tempat"
            referencedColumns: ["id_tempat"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_lpd: { Args: { p_id_lpd: string }; Returns: undefined }
      create_lpd_baru: {
        Args: {
          p_id_kepala: string
          p_id_rangka: number
          p_id_tempat: number
          p_jenis_perjadin: string
          p_petugas_ids: string[]
          p_tgl_buat: string
          p_tgl_kegiatan: string
          p_tgl_selesai: string
        }
        Returns: Json
      }
      get_db_size: { Args: never; Returns: number }
      get_storage_size: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["role_aplikasi"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_to_lpd: {
        Args: { _id_lpd: string; _user_id: string }
        Returns: boolean
      }
      is_kepala_of_requester_lpd: {
        Args: { _requester: string; _target_user: string }
        Returns: boolean
      }
      reject_lpd: {
        Args: { p_catatan: string; p_id_lpd: string }
        Returns: undefined
      }
      shares_lpd_assignment: {
        Args: { _requester: string; _target_user: string }
        Returns: boolean
      }
      submit_laporan_for_approval: {
        Args: { p_id_lpd: string }
        Returns: Database["public"]["Enums"]["approval_status_lpd"]
      }
      update_lpd_spt: {
        Args: {
          p_id_kepala: string
          p_id_lpd: string
          p_id_rangka: number
          p_id_tempat: number
          p_jenis_perjadin: string
          p_petugas_ids: string[]
          p_tgl_buat: string
          p_tgl_kegiatan: string
          p_tgl_selesai: string
        }
        Returns: Json
      }
      user_can_access_lpd_path: { Args: { _path: string }; Returns: boolean }
      validate_allocation_range: {
        Args: {
          p_end: number
          p_exclude_id?: number
          p_start: number
          p_tahun: number
        }
        Returns: boolean
      }
    }
    Enums: {
      approval_status_lpd: "Draft" | "Menunggu" | "Disetujui" | "Ditolak"
      notifikasi_tipe: "lpd_submitted" | "lpd_approved" | "lpd_rejected"
      role_aplikasi: "Admin" | "Petugas"
      status_pegawai: "ASN" | "NON ASN"
      status_surat: "Belum" | "Sudah" | "Batal"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      approval_status_lpd: ["Draft", "Menunggu", "Disetujui", "Ditolak"],
      notifikasi_tipe: ["lpd_submitted", "lpd_approved", "lpd_rejected"],
      role_aplikasi: ["Admin", "Petugas"],
      status_pegawai: ["ASN", "NON ASN"],
      status_surat: ["Belum", "Sudah", "Batal"],
    },
  },
} as const
