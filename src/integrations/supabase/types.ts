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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_records: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          collection: string
          criado_em: string
          data: Json
          id: string
          version: number
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          collection: string
          criado_em?: string
          data: Json
          id: string
          version?: number
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          collection?: string
          criado_em?: string
          data?: Json
          id?: string
          version?: number
        }
        Relationships: []
      }
      email_inbox_config: {
        Row: {
          ativo: boolean
          atualizado_em: string
          dias_retroativos: number
          filtro_remetente: string
          host: string
          id: number
          intervalo_min: number
          pasta: string
          port: number
          secure: boolean
          senha: string
          ultima_sync: string | null
          ultimo_status: string | null
          usuario: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          dias_retroativos?: number
          filtro_remetente?: string
          host?: string
          id?: number
          intervalo_min?: number
          pasta?: string
          port?: number
          secure?: boolean
          senha?: string
          ultima_sync?: string | null
          ultimo_status?: string | null
          usuario?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          dias_retroativos?: number
          filtro_remetente?: string
          host?: string
          id?: number
          intervalo_min?: number
          pasta?: string
          port?: number
          secure?: boolean
          senha?: string
          ultima_sync?: string | null
          ultimo_status?: string | null
          usuario?: string
        }
        Relationships: []
      }
      email_xml_inbox: {
        Row: {
          arquivo: string
          assunto: string
          chave: string
          criado_em: string
          id: string
          importado_em: string | null
          motivo_pendencia: string | null
          recebido_em: string | null
          remetente: string
          status: string
          tipo: string
          xml: string
        }
        Insert: {
          arquivo?: string
          assunto?: string
          chave: string
          criado_em?: string
          id?: string
          importado_em?: string | null
          motivo_pendencia?: string | null
          recebido_em?: string | null
          remetente?: string
          status?: string
          tipo: string
          xml: string
        }
        Update: {
          arquivo?: string
          assunto?: string
          chave?: string
          criado_em?: string
          id?: string
          importado_em?: string | null
          motivo_pendencia?: string | null
          recebido_em?: string | null
          remetente?: string
          status?: string
          tipo?: string
          xml?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id: string
          nome?: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tms_audit: {
        Row: {
          author: string
          collection: string
          id: number
          new_version: number | null
          occurred_at: string
          previous_version: number | null
          reason: string
          record_id: string
        }
        Insert: {
          author: string
          collection: string
          id?: never
          new_version?: number | null
          occurred_at?: string
          previous_version?: number | null
          reason: string
          record_id: string
        }
        Update: {
          author?: string
          collection?: string
          id?: never
          new_version?: number | null
          occurred_at?: string
          previous_version?: number | null
          reason?: string
          record_id?: string
        }
        Relationships: []
      }
      tms_fiscal_keys: {
        Row: {
          created_at: string
          fiscal_key: string
          kind: string
          record_id: string
        }
        Insert: {
          created_at?: string
          fiscal_key: string
          kind: string
          record_id: string
        }
        Update: {
          created_at?: string
          fiscal_key?: string
          kind?: string
          record_id?: string
        }
        Relationships: []
      }
      tms_job_runs: {
        Row: {
          attempt: number
          error: string | null
          finished_at: string | null
          id: string
          job_key: string
          next_run_at: string | null
          result: Json | null
          started_at: string
          status: string
          task: string
        }
        Insert: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key: string
          next_run_at?: string | null
          result?: Json | null
          started_at?: string
          status?: string
          task: string
        }
        Update: {
          attempt?: number
          error?: string | null
          finished_at?: string | null
          id?: string
          job_key?: string
          next_run_at?: string | null
          result?: Json | null
          started_at?: string
          status?: string
          task?: string
        }
        Relationships: []
      }
      user_modules: {
        Row: {
          criado_em: string
          id: string
          module: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          module: string
          user_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          module?: string
          user_id?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tms_access_selftest: { Args: never; Returns: Json }
      tms_active: { Args: never; Returns: boolean }
      tms_claim_job: {
        Args: { p_interval: number; p_task: string }
        Returns: string
      }
      tms_collection: { Args: { c: string; op?: string }; Returns: boolean }
      tms_extended_selftest: { Args: never; Returns: Json }
      tms_import_cte: { Args: { xml_text: string }; Returns: Json }
      tms_import_nfe_worker: { Args: { payload: Json }; Returns: Json }
      tms_module: { Args: { module_name: string }; Returns: boolean }
      tms_records_commit: {
        Args: { changes: Json; reason?: string }
        Returns: Json
      }
      tms_records_read: { Args: never; Returns: Json }
      tms_reliability_selftest: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "comercial" | "operacao" | "financeiro"
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
      app_role: ["admin", "comercial", "operacao", "financeiro"],
    },
  },
} as const
