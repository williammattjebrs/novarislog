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
      tms_delivery_proofs: {
        Row: {
          content_type: string
          created_at: string
          created_by: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          nf_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          created_by?: string
          file_name: string
          file_path: string
          file_size: number
          id?: string
          nf_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          nf_id?: string
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
      tms_master_users: {
        Row: {
          criado_em: string
          user_id: string
        }
        Insert: {
          criado_em?: string
          user_id: string
        }
        Update: {
          criado_em?: string
          user_id?: string
        }
        Relationships: []
      }
      tms_oc_documents: {
        Row: {
          created_at: string
          created_by: string
          id: string
          oc_id: string
          pdf_path: string
          pdf_sha256: string
          send_requested: boolean
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          oc_id: string
          pdf_path: string
          pdf_sha256: string
          send_requested?: boolean
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          oc_id?: string
          pdf_path?: string
          pdf_sha256?: string
          send_requested?: boolean
          snapshot?: Json
          version?: number
        }
        Relationships: []
      }
      tms_oc_email_outbox: {
        Row: {
          accepted_at: string | null
          attempts: number
          created_at: string
          doc_version: number
          email: string
          id: string
          last_error: string | null
          locked_at: string | null
          oc_id: string
          papeis: string[]
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          attempts?: number
          created_at?: string
          doc_version: number
          email: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          oc_id: string
          papeis?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          attempts?: number
          created_at?: string
          doc_version?: number
          email?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          oc_id?: string
          papeis?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tms_oc_nf_active: {
        Row: {
          created_at: string
          nf_id: string
          oc_id: string
        }
        Insert: {
          created_at?: string
          nf_id: string
          oc_id: string
        }
        Update: {
          created_at?: string
          nf_id?: string
          oc_id?: string
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
      whatsapp_config: {
        Row: {
          access_token: string
          ativo: boolean
          atualizado_em: string
          id: number
          phone_number_id: string
          ultima_verificacao: string | null
          ultimo_status: string | null
          waba_id: string
        }
        Insert: {
          access_token?: string
          ativo?: boolean
          atualizado_em?: string
          id?: number
          phone_number_id?: string
          ultima_verificacao?: string | null
          ultimo_status?: string | null
          waba_id?: string
        }
        Update: {
          access_token?: string
          ativo?: boolean
          atualizado_em?: string
          id?: number
          phone_number_id?: string
          ultima_verificacao?: string | null
          ultimo_status?: string | null
          waba_id?: string
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
      tms_delivery_nf_access: {
        Args: { p_nf_id: string; p_write?: boolean }
        Returns: boolean
      }
      tms_extended_selftest: { Args: never; Returns: Json }
      tms_import_cte: { Args: { xml_text: string }; Returns: Json }
      tms_import_cte_worker: {
        Args: { actor: string; xml_text: string }
        Returns: Json
      }
      tms_import_nfe_worker: { Args: { payload: Json }; Returns: Json }
      tms_is_master: { Args: never; Returns: boolean }
      tms_module: { Args: { module_name: string }; Returns: boolean }
      tms_oc_auto_draft: { Args: { p_nf_ids: string[] }; Returns: Json }
      tms_oc_auto_draft_worker: {
        Args: { p_actor?: string; p_nf_id: string }
        Returns: string
      }
      tms_oc_email_claim: {
        Args: { p_limit: number; p_oc_id: string }
        Returns: {
          accepted_at: string | null
          attempts: number
          created_at: string
          doc_version: number
          email: string
          id: string
          last_error: string | null
          locked_at: string | null
          oc_id: string
          papeis: string[]
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tms_oc_email_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      tms_oc_email_finish: {
        Args: { p_error: string; p_id: string; p_status: string }
        Returns: undefined
      }
      tms_oc_email_requeue: {
        Args: { p_doc_version: number; p_oc_id: string }
        Returns: number
      }
      tms_oc_emit_worker: {
        Args: {
          p_actor: string
          p_expected_version: number
          p_oc_id: string
          p_pdf_path: string
          p_pdf_sha: string
          p_send: boolean
          p_snapshot: Json
        }
        Returns: Json
      }
      tms_oc_selftest: { Args: never; Returns: Json }
      tms_records_commit: {
        Args: { changes: Json; reason?: string }
        Returns: Json
      }
      tms_records_read: { Args: never; Returns: Json }
      tms_reliability_selftest: { Args: never; Returns: Json }
      tms_reset_imports: { Args: { confirmacao: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "comercial" | "operacao" | "financeiro" | "master"
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
      app_role: ["admin", "comercial", "operacao", "financeiro", "master"],
    },
  },
} as const
