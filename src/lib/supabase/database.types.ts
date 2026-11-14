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
      building_description: {
        Row: {
          annee_construction: string | null
          annee_construction_etat: string
          created_at: string
          elec: string | null
          elec_etat: string
          fields: Json
          gaz: string | null
          gaz_etat: string
          id: string
          nombre_etages: string | null
          nombre_etages_etat: string
          photo_path: string | null
          photo_paths: string[]
          photo_titles: string[]
          project_id: string
          statut: string
          superficie_brute_totale: string | null
          superficie_brute_totale_etat: string
          type_construction: string | null
          type_construction_etat: string
          updated_at: string
          usage_principal: string | null
          usage_principal_etat: string
        }
        Insert: {
          annee_construction?: string | null
          annee_construction_etat?: string
          created_at?: string
          elec?: string | null
          elec_etat?: string
          fields?: Json
          gaz?: string | null
          gaz_etat?: string
          id?: string
          nombre_etages?: string | null
          nombre_etages_etat?: string
          photo_path?: string | null
          photo_paths?: string[]
          photo_titles?: string[]
          project_id: string
          statut?: string
          superficie_brute_totale?: string | null
          superficie_brute_totale_etat?: string
          type_construction?: string | null
          type_construction_etat?: string
          updated_at?: string
          usage_principal?: string | null
          usage_principal_etat?: string
        }
        Update: {
          annee_construction?: string | null
          annee_construction_etat?: string
          created_at?: string
          elec?: string | null
          elec_etat?: string
          fields?: Json
          gaz?: string | null
          gaz_etat?: string
          id?: string
          nombre_etages?: string | null
          nombre_etages_etat?: string
          photo_path?: string | null
          photo_paths?: string[]
          photo_titles?: string[]
          project_id?: string
          statut?: string
          superficie_brute_totale?: string | null
          superficie_brute_totale_etat?: string
          type_construction?: string | null
          type_construction_etat?: string
          updated_at?: string
          usage_principal?: string | null
          usage_principal_etat?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_description_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      card_photos: {
        Row: {
          card_id: string
          created_at: string
          id: string
          position: number
          storage_path: string
          titre: string | null
        }
        Insert: {
          card_id: string
          created_at?: string
          id?: string
          position?: number
          storage_path: string
          titre?: string | null
        }
        Update: {
          card_id?: string
          created_at?: string
          id?: string
          position?: number
          storage_path?: string
          titre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_photos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "equipment_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_cards: {
        Row: {
          chauffage: string | null
          chauffage_etat: string
          created_at: string
          debit_pcm: string | null
          debit_pcm_estime: boolean
          debit_pcm_etat: string
          description: string | null
          description_etat: string
          fields: Json
          humidificateur: string | null
          humidificateur_etat: string
          id: string
          intro: string | null
          marque_modele: string | null
          marque_modele_etat: string
          nb_unites: number
          note_estime: string | null
          pct_air_frais: string | null
          pct_air_frais_etat: string
          position: number
          project_id: string
          refroidissement: string | null
          refroidissement_etat: string
          statut: string
          t2_chauff_eff: string | null
          t2_chauff_eff_estime: boolean
          t2_chauff_eff_etat: string
          t2_chauff_kw: string | null
          t2_chauff_kw_etat: string
          t2_chauff_kw_manuel: boolean
          t2_chauff_tonnes: string | null
          t2_chauff_type: string | null
          t2_chauff_type_etat: string
          t2_refroid_eff: string | null
          t2_refroid_eff_estime: boolean
          t2_refroid_eff_etat: string
          t2_refroid_kw: string | null
          t2_refroid_kw_etat: string
          t2_refroid_kw_manuel: boolean
          t2_refroid_tonnes: string | null
          t2_refroid_type: string | null
          t2_refroid_type_etat: string
          titre: string | null
          updated_at: string
          ventilateur: string | null
          ventilateur_etat: string
        }
        Insert: {
          chauffage?: string | null
          chauffage_etat?: string
          created_at?: string
          debit_pcm?: string | null
          debit_pcm_estime?: boolean
          debit_pcm_etat?: string
          description?: string | null
          description_etat?: string
          fields?: Json
          humidificateur?: string | null
          humidificateur_etat?: string
          id?: string
          intro?: string | null
          marque_modele?: string | null
          marque_modele_etat?: string
          nb_unites?: number
          note_estime?: string | null
          pct_air_frais?: string | null
          pct_air_frais_etat?: string
          position?: number
          project_id: string
          refroidissement?: string | null
          refroidissement_etat?: string
          statut?: string
          t2_chauff_eff?: string | null
          t2_chauff_eff_estime?: boolean
          t2_chauff_eff_etat?: string
          t2_chauff_kw?: string | null
          t2_chauff_kw_etat?: string
          t2_chauff_kw_manuel?: boolean
          t2_chauff_tonnes?: string | null
          t2_chauff_type?: string | null
          t2_chauff_type_etat?: string
          t2_refroid_eff?: string | null
          t2_refroid_eff_estime?: boolean
          t2_refroid_eff_etat?: string
          t2_refroid_kw?: string | null
          t2_refroid_kw_etat?: string
          t2_refroid_kw_manuel?: boolean
          t2_refroid_tonnes?: string | null
          t2_refroid_type?: string | null
          t2_refroid_type_etat?: string
          titre?: string | null
          updated_at?: string
          ventilateur?: string | null
          ventilateur_etat?: string
        }
        Update: {
          chauffage?: string | null
          chauffage_etat?: string
          created_at?: string
          debit_pcm?: string | null
          debit_pcm_estime?: boolean
          debit_pcm_etat?: string
          description?: string | null
          description_etat?: string
          fields?: Json
          humidificateur?: string | null
          humidificateur_etat?: string
          id?: string
          intro?: string | null
          marque_modele?: string | null
          marque_modele_etat?: string
          nb_unites?: number
          note_estime?: string | null
          pct_air_frais?: string | null
          pct_air_frais_etat?: string
          position?: number
          project_id?: string
          refroidissement?: string | null
          refroidissement_etat?: string
          statut?: string
          t2_chauff_eff?: string | null
          t2_chauff_eff_estime?: boolean
          t2_chauff_eff_etat?: string
          t2_chauff_kw?: string | null
          t2_chauff_kw_etat?: string
          t2_chauff_kw_manuel?: boolean
          t2_chauff_tonnes?: string | null
          t2_chauff_type?: string | null
          t2_chauff_type_etat?: string
          t2_refroid_eff?: string | null
          t2_refroid_eff_estime?: boolean
          t2_refroid_eff_etat?: string
          t2_refroid_kw?: string | null
          t2_refroid_kw_etat?: string
          t2_refroid_kw_manuel?: boolean
          t2_refroid_tonnes?: string | null
          t2_refroid_type?: string | null
          t2_refroid_type_etat?: string
          titre?: string | null
          updated_at?: string
          ventilateur?: string | null
          ventilateur_etat?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_adresse: string | null
          client_nom: string | null
          created_at: string
          created_by: string | null
          id: string
          numero_projet: string | null
          type_service: string | null
          updated_at: string
        }
        Insert: {
          client_adresse?: string | null
          client_nom?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero_projet?: string | null
          type_service?: string | null
          updated_at?: string
        }
        Update: {
          client_adresse?: string | null
          client_nom?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          numero_projet?: string | null
          type_service?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_sections: {
        Row: {
          created_at: string
          id: string
          notes: string
          project_id: string
          section_type_id: string | null
          statut: string
          texte: string
          texte_genere: string | null
          titre: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string
          project_id: string
          section_type_id?: string | null
          statut?: string
          texte?: string
          texte_genere?: string | null
          titre?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string
          project_id?: string
          section_type_id?: string | null
          statut?: string
          texte?: string
          texte_genere?: string | null
          titre?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_sections_section_type_id_fkey"
            columns: ["section_type_id"]
            isOneToOne: false
            referencedRelation: "section_types"
            referencedColumns: ["id"]
          },
        ]
      }
      section_type_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          instructions: string
          section_type_id: string
          titre: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions: string
          section_type_id: string
          titre?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          instructions?: string
          section_type_id?: string
          titre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_type_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_type_versions_section_type_id_fkey"
            columns: ["section_type_id"]
            isOneToOne: false
            referencedRelation: "section_types"
            referencedColumns: ["id"]
          },
        ]
      }
      section_types: {
        Row: {
          actif: boolean
          cle: string
          created_at: string
          id: string
          instructions: string
          notes_actives: boolean
          ordre: number
          requiert_batiment: boolean
          titre: string
          updated_at: string
          zone: string
        }
        Insert: {
          actif?: boolean
          cle: string
          created_at?: string
          id?: string
          instructions?: string
          notes_actives?: boolean
          ordre?: number
          requiert_batiment?: boolean
          titre: string
          updated_at?: string
          zone: string
        }
        Update: {
          actif?: boolean
          cle?: string
          created_at?: string
          id?: string
          instructions?: string
          notes_actives?: boolean
          ordre?: number
          requiert_batiment?: boolean
          titre?: string
          updated_at?: string
          zone?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
