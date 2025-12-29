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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      acionamentos_guincho: {
        Row: {
          associado_id: string
          created_at: string
          data_acionamento: string
          destino: string | null
          id: string
          km_utilizado: number
          observacoes: string | null
          origem: string | null
          veiculo_id: string
        }
        Insert: {
          associado_id: string
          created_at?: string
          data_acionamento?: string
          destino?: string | null
          id?: string
          km_utilizado: number
          observacoes?: string | null
          origem?: string | null
          veiculo_id: string
        }
        Update: {
          associado_id?: string
          created_at?: string
          data_acionamento?: string
          destino?: string | null
          id?: string
          km_utilizado?: number
          observacoes?: string | null
          origem?: string | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acionamentos_guincho_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acionamentos_guincho_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      associados: {
        Row: {
          cep: string | null
          cidade: string | null
          consultor_id: string | null
          cpf: string
          created_at: string
          data_nascimento: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          nome_completo: string
          regiao_id: string | null
          rg: string | null
          status: Database["public"]["Enums"]["associate_status"]
          telefone: string
          termos_aceitos: boolean
          termos_aceitos_em: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          consultor_id?: string | null
          cpf: string
          created_at?: string
          data_nascimento?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_completo: string
          regiao_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          telefone: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          consultor_id?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_completo?: string
          regiao_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          telefone?: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "associados_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      ativacoes: {
        Row: {
          associado_id: string
          ativado_em: string | null
          ativado_por: string | null
          cancelado_em: string | null
          cancelado_por: string | null
          categoria: string | null
          cobertura_resumida: string | null
          consultor_id: string | null
          created_at: string
          data_ativacao: string
          data_vencimento: string | null
          id: string
          motivo_cancelamento: string | null
          motivo_suspensao: string | null
          numero_contrato: string
          observacoes: string | null
          plano: string | null
          sede_id: string | null
          status: Database["public"]["Enums"]["ativacao_status"]
          suspenso_em: string | null
          suspenso_por: string | null
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          associado_id: string
          ativado_em?: string | null
          ativado_por?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          categoria?: string | null
          cobertura_resumida?: string | null
          consultor_id?: string | null
          created_at?: string
          data_ativacao?: string
          data_vencimento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_suspensao?: string | null
          numero_contrato: string
          observacoes?: string | null
          plano?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["ativacao_status"]
          suspenso_em?: string | null
          suspenso_por?: string | null
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          associado_id?: string
          ativado_em?: string | null
          ativado_por?: string | null
          cancelado_em?: string | null
          cancelado_por?: string | null
          categoria?: string | null
          cobertura_resumida?: string | null
          consultor_id?: string | null
          created_at?: string
          data_ativacao?: string
          data_vencimento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          motivo_suspensao?: string | null
          numero_contrato?: string
          observacoes?: string | null
          plano?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["ativacao_status"]
          suspenso_em?: string | null
          suspenso_por?: string | null
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ativacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ativacoes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ativacoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          ip_address: string | null
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          ip_address?: string | null
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cotacao_contatos: {
        Row: {
          cotacao_id: string
          created_at: string
          data_contato: string
          descricao: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          usuario_id: string
        }
        Insert: {
          cotacao_id: string
          created_at?: string
          data_contato?: string
          descricao: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          usuario_id: string
        }
        Update: {
          cotacao_id?: string
          created_at?: string
          data_contato?: string
          descricao?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_contatos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes: {
        Row: {
          ano_fabricacao: number
          ano_modelo: number | null
          aprovada_em: string | null
          aprovada_por: string | null
          associado_id: string | null
          carro_reserva_adicional: number | null
          carro_reserva_dias: number | null
          categoria: string | null
          chassi: string | null
          cliente_email: string | null
          cliente_nome: string | null
          cliente_whatsapp: string | null
          codigo_fipe: string | null
          consultor_id: string
          cor: string | null
          cota_id: string | null
          created_at: string
          data_valor_informado: string | null
          id: string
          lead_id: string | null
          marca: string
          mensalidade: number | null
          metodo_valoracao: Database["public"]["Enums"]["metodo_valoracao"]
          modelo: string
          observacoes: string | null
          participacao: number | null
          placa: string | null
          proposta_enviada_em: string | null
          proposta_enviada_por: string | null
          proposta_id: string | null
          regiao_id: string | null
          renavam: string | null
          status: Database["public"]["Enums"]["cotacao_status"]
          tipo_bem: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          url_nota_fiscal: string | null
          usuario_informou_valor: string | null
          valor_bem: number
          valor_fipe: number | null
          veiculo_id: string | null
        }
        Insert: {
          ano_fabricacao: number
          ano_modelo?: number | null
          aprovada_em?: string | null
          aprovada_por?: string | null
          associado_id?: string | null
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number | null
          categoria?: string | null
          chassi?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          codigo_fipe?: string | null
          consultor_id: string
          cor?: string | null
          cota_id?: string | null
          created_at?: string
          data_valor_informado?: string | null
          id?: string
          lead_id?: string | null
          marca: string
          mensalidade?: number | null
          metodo_valoracao?: Database["public"]["Enums"]["metodo_valoracao"]
          modelo: string
          observacoes?: string | null
          participacao?: number | null
          placa?: string | null
          proposta_enviada_em?: string | null
          proposta_enviada_por?: string | null
          proposta_id?: string | null
          regiao_id?: string | null
          renavam?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"]
          tipo_bem: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          url_nota_fiscal?: string | null
          usuario_informou_valor?: string | null
          valor_bem: number
          valor_fipe?: number | null
          veiculo_id?: string | null
        }
        Update: {
          ano_fabricacao?: number
          ano_modelo?: number | null
          aprovada_em?: string | null
          aprovada_por?: string | null
          associado_id?: string | null
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number | null
          categoria?: string | null
          chassi?: string | null
          cliente_email?: string | null
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          codigo_fipe?: string | null
          consultor_id?: string
          cor?: string | null
          cota_id?: string | null
          created_at?: string
          data_valor_informado?: string | null
          id?: string
          lead_id?: string | null
          marca?: string
          mensalidade?: number | null
          metodo_valoracao?: Database["public"]["Enums"]["metodo_valoracao"]
          modelo?: string
          observacoes?: string | null
          participacao?: number | null
          placa?: string | null
          proposta_enviada_em?: string | null
          proposta_enviada_por?: string | null
          proposta_id?: string | null
          regiao_id?: string | null
          renavam?: string | null
          status?: Database["public"]["Enums"]["cotacao_status"]
          tipo_bem?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          url_nota_fiscal?: string | null
          usuario_informou_valor?: string | null
          valor_bem?: number
          valor_fipe?: number | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      cotas: {
        Row: {
          ativo: boolean
          cota_nome: string
          created_at: string
          fipe_max: number
          fipe_min: number
          id: string
          mensalidade_caminhao: number | null
          mensalidade_carreta: number | null
          mensalidade_implemento_agricola: number | null
          mensalidade_maquina_agricola: number | null
          mensalidade_maquina_industrial: number | null
          mensalidade_utilitario: number | null
          percentual_extra: number | null
          percentual_geral: number | null
          updated_at: string
          valor_camionete: number
          valor_carro: number
          valor_moto: number
        }
        Insert: {
          ativo?: boolean
          cota_nome: string
          created_at?: string
          fipe_max: number
          fipe_min?: number
          id?: string
          mensalidade_caminhao?: number | null
          mensalidade_carreta?: number | null
          mensalidade_implemento_agricola?: number | null
          mensalidade_maquina_agricola?: number | null
          mensalidade_maquina_industrial?: number | null
          mensalidade_utilitario?: number | null
          percentual_extra?: number | null
          percentual_geral?: number | null
          updated_at?: string
          valor_camionete: number
          valor_carro: number
          valor_moto: number
        }
        Update: {
          ativo?: boolean
          cota_nome?: string
          created_at?: string
          fipe_max?: number
          fipe_min?: number
          id?: string
          mensalidade_caminhao?: number | null
          mensalidade_carreta?: number | null
          mensalidade_implemento_agricola?: number | null
          mensalidade_maquina_agricola?: number | null
          mensalidade_maquina_industrial?: number | null
          mensalidade_utilitario?: number | null
          percentual_extra?: number | null
          percentual_geral?: number | null
          updated_at?: string
          valor_camionete?: number
          valor_carro?: number
          valor_moto?: number
        }
        Relationships: []
      }
      fipe_cache: {
        Row: {
          ano_id: string
          ano_nome: string
          codigo_fipe: string | null
          combustivel: string | null
          created_at: string
          expires_at: string
          id: string
          marca_id: string
          marca_nome: string
          mes_referencia: string
          modelo_id: string
          modelo_nome: string
          tipo_veiculo: string
          valor: number
        }
        Insert: {
          ano_id: string
          ano_nome: string
          codigo_fipe?: string | null
          combustivel?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          marca_id: string
          marca_nome: string
          mes_referencia: string
          modelo_id: string
          modelo_nome: string
          tipo_veiculo: string
          valor: number
        }
        Update: {
          ano_id?: string
          ano_nome?: string
          codigo_fipe?: string | null
          combustivel?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          marca_id?: string
          marca_nome?: string
          mes_referencia?: string
          modelo_id?: string
          modelo_nome?: string
          tipo_veiculo?: string
          valor?: number
        }
        Relationships: []
      }
      fipe_logs: {
        Row: {
          cache_hit: boolean
          created_at: string
          endpoint: string
          erro: string | null
          id: string
          ip_address: string | null
          origem: string
          parametros: Json
          sucesso: boolean
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          cache_hit?: boolean
          created_at?: string
          endpoint: string
          erro?: string | null
          id?: string
          ip_address?: string | null
          origem?: string
          parametros: Json
          sucesso?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          cache_hit?: boolean
          created_at?: string
          endpoint?: string
          erro?: string | null
          id?: string
          ip_address?: string | null
          origem?: string
          parametros?: Json
          sucesso?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      lead_interacoes: {
        Row: {
          created_at: string
          data_interacao: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_interacao?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_interacao?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cidade: string | null
          consultor_id: string
          convertido: boolean
          created_at: string
          email: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["lead_origem"] | null
          regiao_id: string | null
          sede_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          telefone: string
          tipo_veiculo: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          consultor_id: string
          convertido?: boolean
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          regiao_id?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          telefone: string
          tipo_veiculo?: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          consultor_id?: string
          convertido?: boolean
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"] | null
          regiao_id?: string | null
          sede_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          telefone?: string
          tipo_veiculo?: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          associado_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          referencia: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
          veiculo_id: string | null
        }
        Insert: {
          associado_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          referencia?: string | null
          status?: string
          tipo: string
          updated_at?: string
          valor: number
          veiculo_id?: string | null
        }
        Update: {
          associado_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          referencia?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          cpf: string | null
          created_at: string
          email: string
          id: string
          is_admin_principal: boolean
          nome_completo: string
          regiao_id: string | null
          sede_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          is_admin_principal?: boolean
          nome_completo: string
          regiao_id?: string | null
          sede_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          is_admin_principal?: boolean
          nome_completo?: string
          regiao_id?: string | null
          sede_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          aceita_em: string | null
          associado_id: string | null
          carro_reserva_adicional: number | null
          carro_reserva_dias: number
          consultor_id: string
          cota_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          mensalidade: number
          participacao: number
          status: Database["public"]["Enums"]["proposal_status"]
          updated_at: string
          valor_fipe: number
          veiculo_ano: number
          veiculo_marca: string
          veiculo_modelo: string
          veiculo_tipo: Database["public"]["Enums"]["vehicle_type"]
        }
        Insert: {
          aceita_em?: string | null
          associado_id?: string | null
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number
          consultor_id: string
          cota_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          mensalidade: number
          participacao: number
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          valor_fipe: number
          veiculo_ano: number
          veiculo_marca: string
          veiculo_modelo: string
          veiculo_tipo: Database["public"]["Enums"]["vehicle_type"]
        }
        Update: {
          aceita_em?: string | null
          associado_id?: string | null
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number
          consultor_id?: string
          cota_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          mensalidade?: number
          participacao?: number
          status?: Database["public"]["Enums"]["proposal_status"]
          updated_at?: string
          valor_fipe?: number
          veiculo_ano?: number
          veiculo_marca?: string
          veiculo_modelo?: string
          veiculo_tipo?: Database["public"]["Enums"]["vehicle_type"]
        }
        Relationships: [
          {
            foreignKeyName: "propostas_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      regioes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          sede_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          sede_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          sede_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regioes_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      sedes: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          cor_destaque: string
          cor_primaria: string
          cor_secundaria: string
          cover_1: string | null
          cover_2: string | null
          cover_3: string | null
          cover_4: string | null
          cover_mode: string | null
          created_at: string
          email: string | null
          empresa_logo: string | null
          empresa_logo_branca: string | null
          empresa_nome: string
          esconder_marca_harmony: boolean
          id: string
          modo_white_label: boolean
          pdf_contracapa: string | null
          site: string | null
          telefone: string | null
          texto_institucional: string | null
          updated_at: string
        }
        Insert: {
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_mode?: string | null
          created_at?: string
          email?: string | null
          empresa_logo?: string | null
          empresa_logo_branca?: string | null
          empresa_nome?: string
          esconder_marca_harmony?: boolean
          id?: string
          modo_white_label?: boolean
          pdf_contracapa?: string | null
          site?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string
        }
        Update: {
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_mode?: string | null
          created_at?: string
          email?: string | null
          empresa_logo?: string | null
          empresa_logo_branca?: string | null
          empresa_nome?: string
          esconder_marca_harmony?: boolean
          id?: string
          modo_white_label?: boolean
          pdf_contracapa?: string | null
          site?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano: number
          associado_id: string
          carro_reserva_adicional: number | null
          carro_reserva_dias: number
          chassi: string | null
          codigo_fipe: string | null
          consultor_id: string | null
          cor: string | null
          cota_id: string | null
          cotacao_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          marca: string
          mensalidade: number
          mes_referencia_fipe: string | null
          modelo: string
          placa: string
          protecao_ativa: boolean
          protecao_ativada_em: string | null
          renavam: string | null
          sede_id: string | null
          tipo: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          valor_fipe: number
          veiculo_status: Database["public"]["Enums"]["vehicle_status"] | null
        }
        Insert: {
          ano: number
          associado_id: string
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number
          chassi?: string | null
          codigo_fipe?: string | null
          consultor_id?: string | null
          cor?: string | null
          cota_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          marca: string
          mensalidade: number
          mes_referencia_fipe?: string | null
          modelo: string
          placa: string
          protecao_ativa?: boolean
          protecao_ativada_em?: string | null
          renavam?: string | null
          sede_id?: string | null
          tipo: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          valor_fipe: number
          veiculo_status?: Database["public"]["Enums"]["vehicle_status"] | null
        }
        Update: {
          ano?: number
          associado_id?: string
          carro_reserva_adicional?: number | null
          carro_reserva_dias?: number
          chassi?: string | null
          codigo_fipe?: string | null
          consultor_id?: string | null
          cor?: string | null
          cota_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          marca?: string
          mensalidade?: number
          mes_referencia_fipe?: string | null
          modelo?: string
          placa?: string
          protecao_ativa?: boolean
          protecao_ativada_em?: string | null
          renavam?: string | null
          sede_id?: string | null
          tipo?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          valor_fipe?: number
          veiculo_status?: Database["public"]["Enums"]["vehicle_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
        ]
      }
      vistorias: {
        Row: {
          checklist: Json | null
          consultor_id: string | null
          created_at: string
          data_agendada: string | null
          data_realizada: string | null
          fotos: string[] | null
          id: string
          local_vistoria: string | null
          observacoes: string | null
          parecer_tecnico: string | null
          proposta_id: string | null
          sede_id: string | null
          solicitada_em: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria: Database["public"]["Enums"]["tipo_vistoria"] | null
          updated_at: string
          veiculo_id: string
          vistoriador_id: string | null
        }
        Insert: {
          checklist?: Json | null
          consultor_id?: string | null
          created_at?: string
          data_agendada?: string | null
          data_realizada?: string | null
          fotos?: string[] | null
          id?: string
          local_vistoria?: string | null
          observacoes?: string | null
          parecer_tecnico?: string | null
          proposta_id?: string | null
          sede_id?: string | null
          solicitada_em?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria?: Database["public"]["Enums"]["tipo_vistoria"] | null
          updated_at?: string
          veiculo_id: string
          vistoriador_id?: string | null
        }
        Update: {
          checklist?: Json | null
          consultor_id?: string | null
          created_at?: string
          data_agendada?: string | null
          data_realizada?: string | null
          fotos?: string[] | null
          id?: string
          local_vistoria?: string | null
          observacoes?: string | null
          parecer_tecnico?: string | null
          proposta_id?: string | null
          sede_id?: string | null
          solicitada_em?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria?: Database["public"]["Enums"]["tipo_vistoria"] | null
          updated_at?: string
          veiculo_id?: string
          vistoriador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vistorias_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sedes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_lead: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_regiao: {
        Args: { _regiao_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_sede: {
        Args: { _sede_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_veiculo: {
        Args: { _user_id: string; _veiculo_id: string }
        Returns: boolean
      }
      can_create_lead: { Args: { _user_id: string }; Returns: boolean }
      cleanup_expired_fipe_cache: { Args: never; Returns: number }
      get_user_regiao: { Args: { _user_id: string }; Returns: string }
      get_user_sede: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_principal: { Args: { _user_id: string }; Returns: boolean }
      is_protected_admin: { Args: { _user_id: string }; Returns: boolean }
      log_sensitive_access: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin_principal"
        | "admin_regional"
        | "financeiro"
        | "cadastro"
        | "consultor_vendas"
        | "vistoriador"
        | "associado"
      associate_status: "ativo" | "inadimplente" | "suspenso" | "cancelado"
      ativacao_status:
        | "pendente_financeiro"
        | "ativo"
        | "suspenso"
        | "cancelado"
      cotacao_status:
        | "novo"
        | "em_contato"
        | "interessado"
        | "aguardando_retorno"
        | "aprovado"
        | "perdido"
      inspection_status:
        | "pendente"
        | "agendada"
        | "em_andamento"
        | "aprovada"
        | "reprovada"
      lead_origem:
        | "instagram"
        | "facebook"
        | "indicacao"
        | "site"
        | "whatsapp"
        | "telefone"
        | "presencial"
        | "outro"
      lead_status: "novo" | "em_contato" | "cotado" | "convertido" | "perdido"
      metodo_valoracao: "fipe" | "venal" | "nota_fiscal"
      proposal_status:
        | "rascunho"
        | "enviada"
        | "aceita"
        | "recusada"
        | "cancelada"
      tipo_contato:
        | "ligacao"
        | "whatsapp"
        | "retorno"
        | "reuniao"
        | "email"
        | "visita"
      tipo_vistoria: "pre_adesao" | "renovacao" | "reinspecao"
      vehicle_status:
        | "cadastrado"
        | "aguardando_vistoria"
        | "aprovado"
        | "reprovado"
        | "ativo"
        | "cancelado"
      vehicle_type:
        | "carro"
        | "moto"
        | "pickup"
        | "caminhao"
        | "utilitario"
        | "maquina_agricola"
        | "maquina_industrial"
        | "carreta"
        | "implemento_agricola"
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
      app_role: [
        "admin_principal",
        "admin_regional",
        "financeiro",
        "cadastro",
        "consultor_vendas",
        "vistoriador",
        "associado",
      ],
      associate_status: ["ativo", "inadimplente", "suspenso", "cancelado"],
      ativacao_status: [
        "pendente_financeiro",
        "ativo",
        "suspenso",
        "cancelado",
      ],
      cotacao_status: [
        "novo",
        "em_contato",
        "interessado",
        "aguardando_retorno",
        "aprovado",
        "perdido",
      ],
      inspection_status: [
        "pendente",
        "agendada",
        "em_andamento",
        "aprovada",
        "reprovada",
      ],
      lead_origem: [
        "instagram",
        "facebook",
        "indicacao",
        "site",
        "whatsapp",
        "telefone",
        "presencial",
        "outro",
      ],
      lead_status: ["novo", "em_contato", "cotado", "convertido", "perdido"],
      metodo_valoracao: ["fipe", "venal", "nota_fiscal"],
      proposal_status: [
        "rascunho",
        "enviada",
        "aceita",
        "recusada",
        "cancelada",
      ],
      tipo_contato: [
        "ligacao",
        "whatsapp",
        "retorno",
        "reuniao",
        "email",
        "visita",
      ],
      tipo_vistoria: ["pre_adesao", "renovacao", "reinspecao"],
      vehicle_status: [
        "cadastrado",
        "aguardando_vistoria",
        "aprovado",
        "reprovado",
        "ativo",
        "cancelado",
      ],
      vehicle_type: [
        "carro",
        "moto",
        "pickup",
        "caminhao",
        "utilitario",
        "maquina_agricola",
        "maquina_industrial",
        "carreta",
        "implemento_agricola",
      ],
    },
  },
} as const
