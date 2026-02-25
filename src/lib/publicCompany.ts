import { supabase } from '@/integrations/supabase/client';

interface PublicCompanyDataResponse {
  success?: boolean;
  data?: {
    companyId?: string | null;
  };
}

export async function resolvePublicCompanyId(): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-public-company-data');

    if (!error) {
      const companyId = (data as PublicCompanyDataResponse | null)?.data?.companyId ?? null;
      if (companyId) return companyId;
    }

    // Fallback de segurança para ambientes antigos
    const { data: fallbackCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('ativo', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    return fallbackCompany?.id ?? null;
  } catch (error) {
    console.error('[publicCompany] Erro ao resolver company_id público:', error);
    return null;
  }
}
