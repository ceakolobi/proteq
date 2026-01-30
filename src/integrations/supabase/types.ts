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
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      acionamentos_guincho: {
        Row: {
          associado_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "acionamentos_guincho_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acionamentos_guincho_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acionamentos_guincho_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
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
      api_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          token: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          token: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      associados: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          company_id: string | null
          complemento: string | null
          comprovante_migracao_url: string | null
          consultor_id: string | null
          cpf: string
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          data_saida_associacao: string | null
          dia_vencimento: number | null
          draft_last_updated: string | null
          draft_payload: Json | null
          draft_step: number | null
          email: string
          endereco: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          nome_associacao_anterior: string | null
          nome_completo: string
          numero: string | null
          profissao: string | null
          regiao_id: string | null
          rg: string | null
          status: Database["public"]["Enums"]["associate_status"]
          telefone: string
          termos_aceitos: boolean
          termos_aceitos_em: string | null
          updated_at: string
          user_id: string | null
          veio_de_outra_associacao: boolean | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          comprovante_migracao_url?: string | null
          consultor_id?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          data_saida_associacao?: string | null
          dia_vencimento?: number | null
          draft_last_updated?: string | null
          draft_payload?: Json | null
          draft_step?: number | null
          email: string
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          nome_associacao_anterior?: string | null
          nome_completo: string
          numero?: string | null
          profissao?: string | null
          regiao_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          telefone: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          updated_at?: string
          user_id?: string | null
          veio_de_outra_associacao?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          complemento?: string | null
          comprovante_migracao_url?: string | null
          consultor_id?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          data_saida_associacao?: string | null
          dia_vencimento?: number | null
          draft_last_updated?: string | null
          draft_payload?: Json | null
          draft_step?: number | null
          email?: string
          endereco?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          nome_associacao_anterior?: string | null
          nome_completo?: string
          numero?: string | null
          profissao?: string | null
          regiao_id?: string | null
          rg?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          telefone?: string
          termos_aceitos?: boolean
          termos_aceitos_em?: string | null
          updated_at?: string
          user_id?: string | null
          veio_de_outra_associacao?: boolean | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "associados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          consultor_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          consultor_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "ativacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ativacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_veiculos_masked"
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      cobrancas: {
        Row: {
          associado_id: string
          codigo_barras: string | null
          codigo_pix: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          link_pagamento: string | null
          mensalidade_id: string | null
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          associado_id: string
          codigo_barras?: string | null
          codigo_pix?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          link_pagamento?: string | null
          mensalidade_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor: number
        }
        Update: {
          associado_id?: string
          codigo_barras?: string | null
          codigo_pix?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          link_pagamento?: string | null
          mensalidade_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_mensalidade_id_fkey"
            columns: ["mensalidade_id"]
            isOneToOne: false
            referencedRelation: "mensalidades"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ativo: boolean | null
          cidade: string | null
          cnpj: string | null
          cor_destaque: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          cover_1: string | null
          cover_2: string | null
          cover_3: string | null
          cover_4: string | null
          cover_fixed_index: number | null
          cover_mode: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          esconder_marca_harmony: boolean | null
          estado: string | null
          id: string
          logo: string | null
          logo_branca: string | null
          logo_escura: string | null
          modo_white_label: boolean | null
          nome: string
          pdf_contracapa: string | null
          site: string | null
          telefone: string | null
          texto_institucional: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          cor_destaque?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_fixed_index?: number | null
          cover_mode?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          esconder_marca_harmony?: boolean | null
          estado?: string | null
          id?: string
          logo?: string | null
          logo_branca?: string | null
          logo_escura?: string | null
          modo_white_label?: boolean | null
          nome: string
          pdf_contracapa?: string | null
          site?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          cor_destaque?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_fixed_index?: number | null
          cover_mode?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          esconder_marca_harmony?: boolean | null
          estado?: string | null
          id?: string
          logo?: string | null
          logo_branca?: string | null
          logo_escura?: string | null
          modo_white_label?: boolean | null
          nome?: string
          pdf_contracapa?: string | null
          site?: string | null
          telefone?: string | null
          texto_institucional?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_covers: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_path: string
          id: string
          public_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_path: string
          id?: string
          public_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_path?: string
          id?: string
          public_url?: string
        }
        Relationships: []
      }
      configuracoes_financeiras: {
        Row: {
          chave_pix: string | null
          company_id: string
          created_at: string
          dia_vencimento_padrao: number | null
          dias_tolerancia: number | null
          enviar_cobranca_apos_dias: number | null
          enviar_lembrete_dias_antes: number | null
          id: string
          percentual_juros_dia: number | null
          percentual_multa: number | null
          tipo_chave_pix: string | null
          updated_at: string
        }
        Insert: {
          chave_pix?: string | null
          company_id: string
          created_at?: string
          dia_vencimento_padrao?: number | null
          dias_tolerancia?: number | null
          enviar_cobranca_apos_dias?: number | null
          enviar_lembrete_dias_antes?: number | null
          id?: string
          percentual_juros_dia?: number | null
          percentual_multa?: number | null
          tipo_chave_pix?: string | null
          updated_at?: string
        }
        Update: {
          chave_pix?: string | null
          company_id?: string
          created_at?: string
          dia_vencimento_padrao?: number | null
          dias_tolerancia?: number | null
          enviar_cobranca_apos_dias?: number | null
          enviar_lembrete_dias_antes?: number | null
          id?: string
          percentual_juros_dia?: number | null
          percentual_multa?: number | null
          tipo_chave_pix?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_financeiras_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_status_logs: {
        Row: {
          changed_at: string
          changed_by: string
          changed_ip: unknown
          changed_user_agent: string | null
          company_id: string
          contract_id: string
          created_at: string
          id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          changed_ip?: unknown
          changed_user_agent?: string | null
          company_id: string
          contract_id: string
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          changed_ip?: unknown
          changed_user_agent?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_status_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "generated_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacao_contatos: {
        Row: {
          company_id: string | null
          cotacao_id: string
          created_at: string
          created_by: string | null
          data_contato: string
          descricao: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          usuario_id: string
        }
        Insert: {
          company_id?: string | null
          cotacao_id: string
          created_at?: string
          created_by?: string | null
          data_contato?: string
          descricao: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_contato"]
          usuario_id: string
        }
        Update: {
          company_id?: string | null
          cotacao_id?: string
          created_at?: string
          created_by?: string | null
          data_contato?: string
          descricao?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_contato"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cotacao_contatos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          ajuste_geral_valor: number | null
          ajuste_individual_valor: number | null
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
          company_id: string | null
          consultor_id: string
          cor: string | null
          cota_id: string | null
          created_at: string
          created_by: string | null
          data_valor_informado: string | null
          editado_por: string | null
          id: string
          lead_id: string | null
          marca: string
          mensalidade: number | null
          metodo_valoracao: Database["public"]["Enums"]["metodo_valoracao"]
          modelo: string
          motivo_ajuste: string | null
          observacoes: string | null
          participacao: number | null
          percentual_global: number | null
          percentual_individual: number | null
          perfil_editor: string | null
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
          valor_base: number | null
          valor_bem: number
          valor_final: number | null
          valor_fipe: number | null
          veiculo_id: string | null
        }
        Insert: {
          ajuste_geral_valor?: number | null
          ajuste_individual_valor?: number | null
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
          company_id?: string | null
          consultor_id: string
          cor?: string | null
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
          data_valor_informado?: string | null
          editado_por?: string | null
          id?: string
          lead_id?: string | null
          marca: string
          mensalidade?: number | null
          metodo_valoracao?: Database["public"]["Enums"]["metodo_valoracao"]
          modelo: string
          motivo_ajuste?: string | null
          observacoes?: string | null
          participacao?: number | null
          percentual_global?: number | null
          percentual_individual?: number | null
          perfil_editor?: string | null
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
          valor_base?: number | null
          valor_bem: number
          valor_final?: number | null
          valor_fipe?: number | null
          veiculo_id?: string | null
        }
        Update: {
          ajuste_geral_valor?: number | null
          ajuste_individual_valor?: number | null
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
          company_id?: string | null
          consultor_id?: string
          cor?: string | null
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
          data_valor_informado?: string | null
          editado_por?: string | null
          id?: string
          lead_id?: string | null
          marca?: string
          mensalidade?: number | null
          metodo_valoracao?: Database["public"]["Enums"]["metodo_valoracao"]
          modelo?: string
          motivo_ajuste?: string | null
          observacoes?: string | null
          participacao?: number | null
          percentual_global?: number | null
          percentual_individual?: number | null
          perfil_editor?: string | null
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
          valor_base?: number | null
          valor_bem?: number
          valor_final?: number | null
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
            foreignKeyName: "cotacoes_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "v_veiculos_masked"
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
          acrescimo_global: number | null
          acrescimo_individual: number | null
          ajuste_geral_valor: number | null
          aplica_caminhonete: boolean
          aplica_carro: boolean
          aplica_moto: boolean
          ativo: boolean
          categoria: string | null
          company_id: string | null
          cota_nome: string
          created_at: string
          created_by: string | null
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
          valor_camionete: number | null
          valor_carro: number | null
          valor_moto: number | null
        }
        Insert: {
          acrescimo_global?: number | null
          acrescimo_individual?: number | null
          ajuste_geral_valor?: number | null
          aplica_caminhonete?: boolean
          aplica_carro?: boolean
          aplica_moto?: boolean
          ativo?: boolean
          categoria?: string | null
          company_id?: string | null
          cota_nome: string
          created_at?: string
          created_by?: string | null
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
          valor_camionete?: number | null
          valor_carro?: number | null
          valor_moto?: number | null
        }
        Update: {
          acrescimo_global?: number | null
          acrescimo_individual?: number | null
          ajuste_geral_valor?: number | null
          aplica_caminhonete?: boolean
          aplica_carro?: boolean
          aplica_moto?: boolean
          ativo?: boolean
          categoria?: string | null
          company_id?: string | null
          cota_nome?: string
          created_at?: string
          created_by?: string | null
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
          valor_camionete?: number | null
          valor_carro?: number | null
          valor_moto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_settings: {
        Row: {
          auto_generate_contract: boolean
          company_id: string
          created_at: string
          record_ip_and_date: boolean
          require_digital_accept: boolean
          send_contract_by_email: boolean
          show_contract_in_associate_area: boolean
          updated_at: string
        }
        Insert: {
          auto_generate_contract?: boolean
          company_id: string
          created_at?: string
          record_ip_and_date?: boolean
          require_digital_accept?: boolean
          send_contract_by_email?: boolean
          show_contract_in_associate_area?: boolean
          updated_at?: string
        }
        Update: {
          auto_generate_contract?: boolean
          company_id?: string
          created_at?: string
          record_ip_and_date?: boolean
          require_digital_accept?: boolean
          send_contract_by_email?: boolean
          show_contract_in_associate_area?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      document_template_versions: {
        Row: {
          content_markdown: string
          created_at: string
          created_by: string | null
          id: string
          template_id: string
          version: number
        }
        Insert: {
          content_markdown: string
          created_at?: string
          created_by?: string | null
          id?: string
          template_id: string
          version: number
        }
        Update: {
          content_markdown?: string
          created_at?: string
          created_by?: string | null
          id?: string
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          company_id: string
          content_markdown: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          template_key: string
          template_type: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_id: string
          content_markdown: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          template_key: string
          template_type: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          content_markdown?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          template_key?: string
          template_type?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      documentos_associado: {
        Row: {
          associado_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Insert: {
          associado_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Update: {
          associado_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_associado_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_associado_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_associado_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_veiculo: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome_arquivo: string
          tipo: string
          url: string
          veiculo_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo: string
          tipo: string
          url: string
          veiculo_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome_arquivo?: string
          tipo?: string
          url?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_veiculo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_veiculo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
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
      generated_contracts: {
        Row: {
          accepted_at: string | null
          accepted_ip: unknown
          accepted_user_agent: string | null
          associado_id: string
          company_id: string
          content_markdown_snapshot: string
          contract_number: string | null
          created_at: string
          generated_at: string
          generated_by: string | null
          generated_ip: unknown
          id: string
          mensalidade_id: string | null
          pdf_path: string | null
          rendered_text_snapshot: string | null
          status: string
          template_version_id: string
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_ip?: unknown
          accepted_user_agent?: string | null
          associado_id: string
          company_id: string
          content_markdown_snapshot: string
          contract_number?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          generated_ip?: unknown
          id?: string
          mensalidade_id?: string | null
          pdf_path?: string | null
          rendered_text_snapshot?: string | null
          status?: string
          template_version_id: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_ip?: unknown
          accepted_user_agent?: string | null
          associado_id?: string
          company_id?: string
          content_markdown_snapshot?: string
          contract_number?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string | null
          generated_ip?: unknown
          id?: string
          mensalidade_id?: string | null
          pdf_path?: string | null
          rendered_text_snapshot?: string | null
          status?: string
          template_version_id?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_contracts_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_mensalidade_id_fkey"
            columns: ["mensalidade_id"]
            isOneToOne: false
            referencedRelation: "mensalidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_template_version_id_fkey"
            columns: ["template_version_id"]
            isOneToOne: false
            referencedRelation: "document_template_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_contracts_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_documents: {
        Row: {
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_path: string
          id: string
          mime_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path: string
          id?: string
          mime_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_path?: string
          id?: string
          mime_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_interacoes: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          data_interacao: string
          descricao: string
          id: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          descricao: string
          id?: string
          lead_id: string
          tipo: string
          usuario_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          data_interacao?: string
          descricao?: string
          id?: string
          lead_id?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interacoes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          consultor_id: string
          convertido: boolean
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          consultor_id: string
          convertido?: boolean
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          consultor_id?: string
          convertido?: boolean
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      mensalidade_alteracoes_log: {
        Row: {
          alterado_em: string | null
          alterado_por: string
          company_id: string | null
          id: string
          motivo: string | null
          valor_anterior: number | null
          valor_novo: number | null
          veiculo_id: string
        }
        Insert: {
          alterado_em?: string | null
          alterado_por: string
          company_id?: string | null
          id?: string
          motivo?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
          veiculo_id: string
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string
          company_id?: string | null
          id?: string
          motivo?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensalidade_alteracoes_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidade_alteracoes_log_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidade_alteracoes_log_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades: {
        Row: {
          acrescimo: number | null
          associado_id: string
          company_id: string | null
          comprovante_url: string | null
          cota_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          forma_pagamento: string | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_base: number
          valor_final: number
          veiculo_id: string
        }
        Insert: {
          acrescimo?: number | null
          associado_id: string
          company_id?: string | null
          comprovante_url?: string | null
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_base: number
          valor_final: number
          veiculo_id: string
        }
        Update: {
          acrescimo?: number | null
          associado_id?: string
          company_id?: string | null
          comprovante_url?: string | null
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_base?: number
          valor_final?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensalidades_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_cota_id_fkey"
            columns: ["cota_id"]
            isOneToOne: false
            referencedRelation: "cotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensalidades_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          associado_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "pagamentos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
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
          company_id: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          is_admin_principal: boolean
          must_change_password: boolean
          nome_completo: string
          regiao_id: string | null
          sede_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          is_admin_principal?: boolean
          must_change_password?: boolean
          nome_completo: string
          regiao_id?: string | null
          sede_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          is_admin_principal?: boolean
          must_change_password?: boolean
          nome_completo?: string
          regiao_id?: string | null
          sede_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          consultor_id: string
          cota_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          consultor_id: string
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          consultor_id?: string
          cota_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "propostas_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          sede_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          sede_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          sede_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regioes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sedes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          company_id: string | null
          cor_destaque: string
          cor_primaria: string
          cor_secundaria: string
          cover_1: string | null
          cover_2: string | null
          cover_3: string | null
          cover_4: string | null
          cover_fixed_index: number | null
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
          company_id?: string | null
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_fixed_index?: number | null
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
          company_id?: string | null
          cor_destaque?: string
          cor_primaria?: string
          cor_secundaria?: string
          cover_1?: string | null
          cover_2?: string | null
          cover_3?: string | null
          cover_4?: string | null
          cover_fixed_index?: number | null
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
        Relationships: [
          {
            foreignKeyName: "settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_info: {
        Row: {
          created_at: string
          id: string
          release_date: string
          release_notes: string | null
          system_version: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          release_date?: string
          release_notes?: string | null
          system_version: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          release_date?: string
          release_notes?: string | null
          system_version?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      termos_aceite: {
        Row: {
          assinado_em: string | null
          assinatura_cpf: string | null
          assinatura_data: string | null
          assinatura_nome: string | null
          associado_id: string
          canal_aceite: string
          company_id: string | null
          conteudo_termo: string
          created_at: string
          created_by: string | null
          data_hora_aceite: string
          id: string
          ip_aceite: string | null
          pdf_assinado_url: string | null
          pdf_url: string | null
          status: string
          tipo_documento: string
          token_assinatura: string
          token_expires_at: string
          updated_at: string
          user_agent_aceite: string | null
          veiculo_id: string | null
          versao_termo: string
        }
        Insert: {
          assinado_em?: string | null
          assinatura_cpf?: string | null
          assinatura_data?: string | null
          assinatura_nome?: string | null
          associado_id: string
          canal_aceite?: string
          company_id?: string | null
          conteudo_termo: string
          created_at?: string
          created_by?: string | null
          data_hora_aceite?: string
          id?: string
          ip_aceite?: string | null
          pdf_assinado_url?: string | null
          pdf_url?: string | null
          status?: string
          tipo_documento?: string
          token_assinatura?: string
          token_expires_at?: string
          updated_at?: string
          user_agent_aceite?: string | null
          veiculo_id?: string | null
          versao_termo?: string
        }
        Update: {
          assinado_em?: string | null
          assinatura_cpf?: string | null
          assinatura_data?: string | null
          assinatura_nome?: string | null
          associado_id?: string
          canal_aceite?: string
          company_id?: string | null
          conteudo_termo?: string
          created_at?: string
          created_by?: string | null
          data_hora_aceite?: string
          id?: string
          ip_aceite?: string | null
          pdf_assinado_url?: string | null
          pdf_url?: string | null
          status?: string
          tipo_documento?: string
          token_assinatura?: string
          token_expires_at?: string
          updated_at?: string
          user_agent_aceite?: string | null
          veiculo_id?: string | null
          versao_termo?: string
        }
        Relationships: [
          {
            foreignKeyName: "termos_aceite_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceite_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceite_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceite_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "v_veiculos_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceite_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          company_id: string | null
          created_at: string
          granted: boolean
          granted_at: string | null
          granted_by: string | null
          id: string
          module: Database["public"]["Enums"]["permission_module"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          company_id?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          module: Database["public"]["Enums"]["permission_module"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          company_id?: string | null
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          module?: Database["public"]["Enums"]["permission_module"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number
          associado_id: string
          carro_reserva_adicional: number | null
          carro_reserva_dias: number
          chassi: string | null
          codigo_fipe: string | null
          combustivel: string | null
          company_id: string | null
          consultor_id: string | null
          cor: string | null
          cota_id: string | null
          cotacao_id: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          marca: string
          mensalidade: number
          mensalidade_alterada_em: string | null
          mensalidade_alterada_por: string | null
          mensalidade_manual: number | null
          mensalidade_override: boolean | null
          mes_referencia_fipe: string | null
          modelo: string
          placa: string
          protecao_ativa: boolean
          protecao_ativada_em: string | null
          quilometragem: number | null
          renavam: string | null
          sede_id: string | null
          situacao_financeira: string | null
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
          combustivel?: string | null
          company_id?: string | null
          consultor_id?: string | null
          cor?: string | null
          cota_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          marca: string
          mensalidade: number
          mensalidade_alterada_em?: string | null
          mensalidade_alterada_por?: string | null
          mensalidade_manual?: number | null
          mensalidade_override?: boolean | null
          mes_referencia_fipe?: string | null
          modelo: string
          placa: string
          protecao_ativa?: boolean
          protecao_ativada_em?: string | null
          quilometragem?: number | null
          renavam?: string | null
          sede_id?: string | null
          situacao_financeira?: string | null
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
          combustivel?: string | null
          company_id?: string | null
          consultor_id?: string | null
          cor?: string | null
          cota_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          marca?: string
          mensalidade?: number
          mensalidade_alterada_em?: string | null
          mensalidade_alterada_por?: string | null
          mensalidade_manual?: number | null
          mensalidade_override?: boolean | null
          mes_referencia_fipe?: string | null
          modelo?: string
          placa?: string
          protecao_ativa?: boolean
          protecao_ativada_em?: string | null
          quilometragem?: number | null
          renavam?: string | null
          sede_id?: string | null
          situacao_financeira?: string | null
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
            foreignKeyName: "veiculos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          associado_id: string | null
          canal_abertura: string | null
          checklist: Json | null
          company_id: string | null
          consultor_id: string | null
          cotacao_id: string | null
          created_at: string
          created_by: string | null
          data_agendada: string | null
          data_realizada: string | null
          dispensada_em: string | null
          dispensada_por: string | null
          fotos: string[] | null
          id: string
          local_vistoria: string | null
          motivo_dispensa: string | null
          observacoes: string | null
          parecer_tecnico: string | null
          proposta_id: string | null
          sede_id: string | null
          solicitada_em: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria: Database["public"]["Enums"]["tipo_vistoria"] | null
          token_acesso: string | null
          token_expires_at: string | null
          updated_at: string
          veiculo_id: string
          vistoriador_id: string | null
        }
        Insert: {
          associado_id?: string | null
          canal_abertura?: string | null
          checklist?: Json | null
          company_id?: string | null
          consultor_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          data_agendada?: string | null
          data_realizada?: string | null
          dispensada_em?: string | null
          dispensada_por?: string | null
          fotos?: string[] | null
          id?: string
          local_vistoria?: string | null
          motivo_dispensa?: string | null
          observacoes?: string | null
          parecer_tecnico?: string | null
          proposta_id?: string | null
          sede_id?: string | null
          solicitada_em?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria?: Database["public"]["Enums"]["tipo_vistoria"] | null
          token_acesso?: string | null
          token_expires_at?: string | null
          updated_at?: string
          veiculo_id: string
          vistoriador_id?: string | null
        }
        Update: {
          associado_id?: string | null
          canal_abertura?: string | null
          checklist?: Json | null
          company_id?: string | null
          consultor_id?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          data_agendada?: string | null
          data_realizada?: string | null
          dispensada_em?: string | null
          dispensada_por?: string | null
          fotos?: string[] | null
          id?: string
          local_vistoria?: string | null
          motivo_dispensa?: string | null
          observacoes?: string | null
          parecer_tecnico?: string | null
          proposta_id?: string | null
          sede_id?: string | null
          solicitada_em?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          tipo_vistoria?: Database["public"]["Enums"]["tipo_vistoria"] | null
          token_acesso?: string | null
          token_expires_at?: string | null
          updated_at?: string
          veiculo_id?: string
          vistoriador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vistorias_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "associados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vistorias_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "v_veiculos_masked"
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
      v_associados_masked: {
        Row: {
          cep: string | null
          cidade: string | null
          company_id: string | null
          consultor_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string | null
          nome_completo: string | null
          regiao_id: string | null
          rg: string | null
          status: Database["public"]["Enums"]["associate_status"] | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          consultor_id?: string | null
          cpf?: never
          created_at?: string | null
          email?: never
          endereco?: never
          estado?: string | null
          id?: string | null
          nome_completo?: string | null
          regiao_id?: string | null
          rg?: never
          status?: Database["public"]["Enums"]["associate_status"] | null
          telefone?: never
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          company_id?: string | null
          consultor_id?: string | null
          cpf?: never
          created_at?: string | null
          email?: never
          endereco?: never
          estado?: string | null
          id?: string | null
          nome_completo?: string | null
          regiao_id?: string | null
          rg?: never
          status?: Database["public"]["Enums"]["associate_status"] | null
          telefone?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "associados_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "associados_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      v_veiculos_masked: {
        Row: {
          ano: number | null
          associado_id: string | null
          chassi: string | null
          company_id: string | null
          cor: string | null
          created_at: string | null
          id: string | null
          marca: string | null
          mensalidade: number | null
          modelo: string | null
          placa: string | null
          renavam: string | null
          tipo: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at: string | null
          valor_fipe: number | null
          veiculo_status: Database["public"]["Enums"]["vehicle_status"] | null
        }
        Insert: {
          ano?: number | null
          associado_id?: string | null
          chassi?: never
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          id?: string | null
          marca?: string | null
          mensalidade?: number | null
          modelo?: string | null
          placa?: never
          renavam?: never
          tipo?: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at?: string | null
          valor_fipe?: number | null
          veiculo_status?: Database["public"]["Enums"]["vehicle_status"] | null
        }
        Update: {
          ano?: number | null
          associado_id?: string | null
          chassi?: never
          company_id?: string | null
          cor?: string | null
          created_at?: string | null
          id?: string | null
          marca?: string | null
          mensalidade?: number | null
          modelo?: string | null
          placa?: never
          renavam?: never
          tipo?: Database["public"]["Enums"]["vehicle_type"] | null
          updated_at?: string | null
          valor_fipe?: number | null
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
            foreignKeyName: "veiculos_associado_id_fkey"
            columns: ["associado_id"]
            isOneToOne: false
            referencedRelation: "v_associados_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      atualizar_status_mensalidades: { Args: never; Returns: number }
      atualizar_status_mensalidades_atrasadas: { Args: never; Returns: number }
      can_access_contracts_internal: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_access_financial: { Args: { _user_id: string }; Returns: boolean }
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
      can_access_vistoria_by_id: {
        Args: { _user_id: string; _vistoria_id: string }
        Returns: boolean
      }
      can_create_lead: { Args: { _user_id: string }; Returns: boolean }
      can_edit_mensalidade: { Args: { _user_id: string }; Returns: boolean }
      can_manage_documents: { Args: { _user_id: string }; Returns: boolean }
      can_view_sensitive_data: { Args: { _user_id: string }; Returns: boolean }
      cleanup_expired_fipe_cache: { Args: never; Returns: number }
      enforce_company_isolation: {
        Args: { _company_id: string }
        Returns: boolean
      }
      generate_api_token: { Args: never; Returns: string }
      gerar_mensalidades_mes: {
        Args: { p_company_id?: string; p_mes_referencia: string }
        Returns: number
      }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_regiao: { Args: { _user_id: string }; Returns: string }
      get_user_sede: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["permission_action"]
          _module: Database["public"]["Enums"]["permission_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_company: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_gerente: { Args: { _user_id: string }; Returns: boolean }
      is_admin_principal: { Args: { _user_id: string }; Returns: boolean }
      is_demo_email: { Args: { _email: string }; Returns: boolean }
      is_demo_user: { Args: { _user_id: string }; Returns: boolean }
      is_protected_admin: { Args: { _user_id: string }; Returns: boolean }
      is_system_admin: { Args: { _user_id: string }; Returns: boolean }
      log_sensitive_access: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_type: string
        }
        Returns: undefined
      }
      same_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      setup_demo_user_profile: { Args: never; Returns: undefined }
      strict_company_isolation: {
        Args: { _company_id: string }
        Returns: boolean
      }
      update_contract_status_internal: {
        Args: {
          p_contract_id: string
          p_ip?: unknown
          p_new_status: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      validate_api_token: {
        Args: { _token: string }
        Returns: {
          company_id: string
          is_valid: boolean
          token_id: string
        }[]
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
        | "demo_user"
        | "gerente"
        | "operacional"
        | "admin_nivel_basico"
        | "recepcao"
        | "admin_demo"
      associate_status:
        | "ativo"
        | "inadimplente"
        | "suspenso"
        | "cancelado"
        | "rascunho"
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
        | "arquivado"
        | "bloqueado"
        | "quarentena"
      inspection_status:
        | "pendente"
        | "agendada"
        | "em_andamento"
        | "aprovada"
        | "reprovada"
        | "dispensada"
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
      permission_action: "visualizar" | "criar" | "editar" | "excluir"
      permission_module:
        | "dashboard"
        | "leads"
        | "cotacoes"
        | "associados"
        | "veiculos"
        | "vistorias"
        | "contratos"
        | "relatorios"
        | "financeiro"
        | "usuarios"
        | "cotas"
        | "configuracoes"
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
        "demo_user",
        "gerente",
        "operacional",
        "admin_nivel_basico",
        "recepcao",
        "admin_demo",
      ],
      associate_status: [
        "ativo",
        "inadimplente",
        "suspenso",
        "cancelado",
        "rascunho",
      ],
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
        "arquivado",
        "bloqueado",
        "quarentena",
      ],
      inspection_status: [
        "pendente",
        "agendada",
        "em_andamento",
        "aprovada",
        "reprovada",
        "dispensada",
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
      permission_action: ["visualizar", "criar", "editar", "excluir"],
      permission_module: [
        "dashboard",
        "leads",
        "cotacoes",
        "associados",
        "veiculos",
        "vistorias",
        "contratos",
        "relatorios",
        "financeiro",
        "usuarios",
        "cotas",
        "configuracoes",
      ],
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
