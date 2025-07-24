export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      Adatbázis: {
        Row: {
          Elkészítés: string | null
          Elkeszitesi_Ido: string | null
          Feherje_g: number | null
          Hozzavalo_1: string | null
          Hozzavalo_10: string | null
          Hozzavalo_11: string | null
          Hozzavalo_12: string | null
          Hozzavalo_13: string | null
          Hozzavalo_14: string | null
          Hozzavalo_15: string | null
          Hozzavalo_16: string | null
          Hozzavalo_17: string | null
          Hozzavalo_18: string | null
          Hozzavalo_2: string | null
          Hozzavalo_3: string | null
          Hozzavalo_4: string | null
          Hozzavalo_5: string | null
          Hozzavalo_6: string | null
          Hozzavalo_7: string | null
          Hozzavalo_8: string | null
          Hozzavalo_9: string | null
          "Kép URL": string | null
          Recept_Neve: string | null
          Szenhidrat_g: number | null
          Zsir_g: number | null
        }
        Insert: {
          Elkészítés?: string | null
          Elkeszitesi_Ido?: string | null
          Feherje_g?: number | null
          Hozzavalo_1?: string | null
          Hozzavalo_10?: string | null
          Hozzavalo_11?: string | null
          Hozzavalo_12?: string | null
          Hozzavalo_13?: string | null
          Hozzavalo_14?: string | null
          Hozzavalo_15?: string | null
          Hozzavalo_16?: string | null
          Hozzavalo_17?: string | null
          Hozzavalo_18?: string | null
          Hozzavalo_2?: string | null
          Hozzavalo_3?: string | null
          Hozzavalo_4?: string | null
          Hozzavalo_5?: string | null
          Hozzavalo_6?: string | null
          Hozzavalo_7?: string | null
          Hozzavalo_8?: string | null
          Hozzavalo_9?: string | null
          "Kép URL"?: string | null
          Recept_Neve?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Update: {
          Elkészítés?: string | null
          Elkeszitesi_Ido?: string | null
          Feherje_g?: number | null
          Hozzavalo_1?: string | null
          Hozzavalo_10?: string | null
          Hozzavalo_11?: string | null
          Hozzavalo_12?: string | null
          Hozzavalo_13?: string | null
          Hozzavalo_14?: string | null
          Hozzavalo_15?: string | null
          Hozzavalo_16?: string | null
          Hozzavalo_17?: string | null
          Hozzavalo_18?: string | null
          Hozzavalo_2?: string | null
          Hozzavalo_3?: string | null
          Hozzavalo_4?: string | null
          Hozzavalo_5?: string | null
          Hozzavalo_6?: string | null
          Hozzavalo_7?: string | null
          Hozzavalo_8?: string | null
          Hozzavalo_9?: string | null
          "Kép URL"?: string | null
          Recept_Neve?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Relationships: []
      }
      alapanyag: {
        Row: {
          Elelmiszer: string | null
          "Fehérje/100g": string | null
          ID: number
          "Kaloria/100g": string | null
          "Szénhidrát/100g": string | null
          "Zsir/100g": string | null
        }
        Insert: {
          Elelmiszer?: string | null
          "Fehérje/100g"?: string | null
          ID: number
          "Kaloria/100g"?: string | null
          "Szénhidrát/100g"?: string | null
          "Zsir/100g"?: string | null
        }
        Update: {
          Elelmiszer?: string | null
          "Fehérje/100g"?: string | null
          ID?: number
          "Kaloria/100g"?: string | null
          "Szénhidrát/100g"?: string | null
          "Zsir/100g"?: string | null
        }
        Relationships: []
      }
      elelmiszer_kategoriak: {
        Row: {
          Kategoria_ID: number
          Kategoriak: string | null
        }
        Insert: {
          Kategoria_ID: number
          Kategoriak?: string | null
        }
        Update: {
          Kategoria_ID?: number
          Kategoriak?: string | null
        }
        Relationships: []
      }
      elelmiszer_kep: {
        Row: {
          Elelmiszer_nev: string
          Hozzarendelt_ID: string | null
          Kategoria_ID: number | null
          Kep: string | null
        }
        Insert: {
          Elelmiszer_nev: string
          Hozzarendelt_ID?: string | null
          Kategoria_ID?: number | null
          Kep?: string | null
        }
        Update: {
          Elelmiszer_nev?: string
          Hozzarendelt_ID?: string | null
          Kategoria_ID?: number | null
          Kep?: string | null
        }
        Relationships: []
      }
      Értékelések: {
        Row: {
          Dátum: string | null
          Értékelés: string | null
          "Recept neve": string | null
          user_id: string | null
        }
        Insert: {
          Dátum?: string | null
          Értékelés?: string | null
          "Recept neve"?: string | null
          user_id?: string | null
        }
        Update: {
          Dátum?: string | null
          Értékelés?: string | null
          "Recept neve"?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Értékelések_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      Ételkategóriák: {
        Row: {
          "Gabonák és Tészták": string | null
          Gyümölcsök: string | null
          Halak: string | null
          Húsfélék: string | null
          id: number
          "Olajok és Magvak": string | null
          Tejtermékek: string | null
          "Zöldségek / Vegetáriánus": string | null
        }
        Insert: {
          "Gabonák és Tészták"?: string | null
          Gyümölcsök?: string | null
          Halak?: string | null
          Húsfélék?: string | null
          id?: number
          "Olajok és Magvak"?: string | null
          Tejtermékek?: string | null
          "Zöldségek / Vegetáriánus"?: string | null
        }
        Update: {
          "Gabonák és Tészták"?: string | null
          Gyümölcsök?: string | null
          Halak?: string | null
          Húsfélék?: string | null
          id?: number
          "Olajok és Magvak"?: string | null
          Tejtermékek?: string | null
          "Zöldségek / Vegetáriánus"?: string | null
        }
        Relationships: []
      }
      Ételkategóriák_Új: {
        Row: {
          "Gabonák és Tészták": string | null
          Gyümölcsök: string | null
          Halak: string | null
          Húsfélék: string | null
          id: number
          "Olajok és Magvak": string | null
          Tejtermékek: string | null
          "Zöldségek / Vegetáriánus": string | null
        }
        Insert: {
          "Gabonák és Tészták"?: string | null
          Gyümölcsök?: string | null
          Halak?: string | null
          Húsfélék?: string | null
          id?: number
          "Olajok és Magvak"?: string | null
          Tejtermékek?: string | null
          "Zöldségek / Vegetáriánus"?: string | null
        }
        Update: {
          "Gabonák és Tészták"?: string | null
          Gyümölcsök?: string | null
          Halak?: string | null
          Húsfélék?: string | null
          id?: number
          "Olajok és Magvak"?: string | null
          Tejtermékek?: string | null
          "Zöldségek / Vegetáriánus"?: string | null
        }
        Relationships: []
      }
      Ételpreferenciák: {
        Row: {
          category: string
          created_at: string
          id: string
          ingredient: string
          preference: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          ingredient: string
          preference: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          ingredient?: string
          preference?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "Ételpreferenciák_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      Étkezések: {
        Row: {
          Desszert: string | null
          Ebéd: string | null
          Előétel: string | null
          Köret: string | null
          Leves: string | null
          "Recept Neve": string | null
          Reggeli: string | null
          Tízórai: string | null
          Uzsonna: string | null
          Vacsora: string | null
        }
        Insert: {
          Desszert?: string | null
          Ebéd?: string | null
          Előétel?: string | null
          Köret?: string | null
          Leves?: string | null
          "Recept Neve"?: string | null
          Reggeli?: string | null
          Tízórai?: string | null
          Uzsonna?: string | null
          Vacsora?: string | null
        }
        Update: {
          Desszert?: string | null
          Ebéd?: string | null
          Előétel?: string | null
          Köret?: string | null
          Leves?: string | null
          "Recept Neve"?: string | null
          Reggeli?: string | null
          Tízórai?: string | null
          Uzsonna?: string | null
          Vacsora?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          recipe_data: Json
          recipe_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_data: Json
          recipe_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_data?: Json
          recipe_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string | null
          age: number | null
          allergies: string[] | null
          avatar_url: string | null
          created_at: string
          dietary_preferences: string[] | null
          full_name: string | null
          height: number | null
          id: string
          updated_at: string
          weight: number | null
          target_protein: number | null
          target_carbs: number | null
          target_fat: number | null
          target_calories: number | null
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string
          dietary_preferences?: string[] | null
          full_name?: string | null
          height?: number | null
          id: string
          updated_at?: string
          weight?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_calories?: number | null
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          allergies?: string[] | null
          avatar_url?: string | null
          created_at?: string
          dietary_preferences?: string[] | null
          full_name?: string | null
          height?: number | null
          id?: string
          updated_at?: string
          weight?: number | null
          target_protein?: number | null
          target_carbs?: number | null
          target_fat?: number | null
          target_calories?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      recept_alapanyag: {
        Row: {
          "Élelmiszer ID": string | null
          Élelmiszerek: string | null
          ID: string
          Mennyiség: number | null
          Mértékegység: string | null
          Recept_ID: number | null
        }
        Insert: {
          "Élelmiszer ID"?: string | null
          Élelmiszerek?: string | null
          ID: string
          Mennyiség?: number | null
          Mértékegység?: string | null
          Recept_ID?: number | null
        }
        Update: {
          "Élelmiszer ID"?: string | null
          Élelmiszerek?: string | null
          ID?: string
          Mennyiség?: number | null
          Mértékegység?: string | null
          Recept_ID?: number | null
        }
        Relationships: []
      }
      receptek: {
        Row: {
          Elkészítése: string | null
          Feherje_g: number | null
          Kép: string | null
          "Recept ID": number
          Receptnév: string | null
          Szenhidrat_g: number | null
          Zsir_g: number | null
        }
        Insert: {
          Elkészítése?: string | null
          Feherje_g?: number | null
          Kép?: string | null
          "Recept ID": number
          Receptnév?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Update: {
          Elkészítése?: string | null
          Feherje_g?: number | null
          Kép?: string | null
          "Recept ID"?: number
          Receptnév?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Relationships: []
      }
      receptek_duplicate: {
        Row: {
          Elkészítése: string | null
          Feherje_g: number | null
          Kép: string | null
          "Recept ID": number
          Receptnév: string | null
          Szenhidrat_g: number | null
          Zsir_g: number | null
        }
        Insert: {
          Elkészítése?: string | null
          Feherje_g?: number | null
          Kép?: string | null
          "Recept ID": number
          Receptnév?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Update: {
          Elkészítése?: string | null
          Feherje_g?: number | null
          Kép?: string | null
          "Recept ID"?: number
          Receptnév?: string | null
          Szenhidrat_g?: number | null
          Zsir_g?: number | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          category: string
          created_at: string
          id: string
          ingredient: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          ingredient: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          ingredient?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      user_health_conditions: {
        Row: {
          condition_type: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          condition_type: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          condition_type?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_health_conditions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_overview"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_user_overview: {
        Row: {
          activity_level: string | null
          age: number | null
          allergies: string[] | null
          avatar_url: string | null
          dietary_preferences: string[] | null
          email: string | null
          favorites_count: number | null
          full_name: string | null
          height: number | null
          id: string | null
          preferences_count: number | null
          ratings_count: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_created_at: string | null
          weight: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "user"
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
      user_role: ["admin", "user"],
    },
  },
} as const
