import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, ExternalLink } from "lucide-react";

type ContractRow = {
  id: string;
  status: string;
  generated_at: string;
  pdf_path: string | null;
  associado_id: string;
  veiculo_id: string | null;
  mensalidade_id: string | null;
  contract_number: string | null;
  associados?:
    | { nome_completo: string; cpf: string; rg: string | null }
    | { nome_completo: string; cpf: string; rg: string | null }[]
    | null;
  veiculos?: { placa: string | null; modelo: string | null; ano: number | null } | { placa: string | null; modelo: string | null; ano: number | null }[] | null;
};

function formatDateTimeBR(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function getEmbedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function GeneratedContractsCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ContractRow[]>([]);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const [cpfToGenerate, setCpfToGenerate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("generated_contracts")
      .select(
        `id, status, generated_at, pdf_path, associado_id, veiculo_id, mensalidade_id, contract_number,
         associados:associados(nome_completo, cpf, rg),
         veiculos:veiculos(placa, modelo, ano)`
      )
      .order("generated_at", { ascending: false })
      .limit(200);

    if (error) {
      toast({
        title: "Erro ao carregar contratos",
        description: error.message,
        variant: "destructive",
      });
      setItems([]);
      setIsLoading(false);
      return;
    }

    setItems((data as any) ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();

    // Atualização em tempo real quando novos contratos são gerados
    const channel = supabase
      .channel('generated-contracts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'generated_contracts' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateByCpf = async () => {
    const cpf = cpfToGenerate.replace(/\D/g, "").trim();
    if (!cpf) {
      toast({ title: "Informe um CPF" });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: assoc, error: assocErr } = await supabase
        .from("associados")
        .select("id, nome_completo, cpf")
        .eq("cpf", cpf)
        .maybeSingle();

      if (assocErr) throw assocErr;
      if (!assoc) {
        toast({ title: "Associado não encontrado", description: `CPF: ${cpf}` });
        return;
      }

      const { data: veiculo } = await supabase
        .from("veiculos")
        .select("id")
        .eq("associado_id", assoc.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("generate-contract-manual", {
        body: {
          associadoId: assoc.id,
          veiculoId: veiculo?.id ?? null,
          sendEmail: true,
        },
      });

      if (error) throw error;

      toast({
        title: "Contrato gerado",
        description: `Contrato criado para ${assoc.nome_completo}.`,
      });

      setCpfToGenerate("");
      await load();
      return data;
    } catch (e: any) {
      toast({
        title: "Falha ao gerar contrato",
        description: e?.message ?? "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = digitsOnly(q);
    return items.filter((c) => {
      if (status !== "all" && c.status !== status) return false;

      if (!q) return true;

      const a = getEmbedOne(c.associados);
      const nome = (a?.nome_completo ?? "").toLowerCase();
      const cpfRaw = (a?.cpf ?? "").toLowerCase();
      const rgRaw = (a?.rg ?? "").toLowerCase();

      // Quando o usuário digita números, comparamos também por versão "somente dígitos"
      if (qDigits) {
        const cpfDigits = digitsOnly(cpfRaw);
        const rgDigits = digitsOnly(rgRaw);
        if (cpfDigits.includes(qDigits) || rgDigits.includes(qDigits)) return true;
      }

      return nome.includes(q) || cpfRaw.includes(q) || rgRaw.includes(q);
    });
  }, [items, search, status]);

  const download = async (c: ContractRow) => {
    if (!c.pdf_path) {
      toast({ title: "PDF não disponível", description: "Este contrato ainda não tem arquivo PDF." });
      return;
    }

    const { data, error } = await supabase.storage
      .from("termos-aceite")
      .createSignedUrl(c.pdf_path, 60);
    if (error) {
      toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contratos gerados</CardTitle>
        <CardDescription>Lista de contratos já gerados pelo sistema (auditoria e download).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">Gerar contrato manual (retroativo)</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input
                value={cpfToGenerate}
                onChange={(e) => setCpfToGenerate(e.target.value)}
                placeholder="CPF do associado (somente números)"
              />
            </div>
            <Button onClick={generateByCpf} disabled={isGenerating}>
              Gerar e enviar
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Dica: para Pablo use <span className="font-mono">12611351724</span> e para Cleidiane use <span className="font-mono">14857265737</span>.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF ou RG"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="gerado">Gerado</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aceito">Aceito</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhum contrato encontrado.</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Associado</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const a = getEmbedOne(c.associados);
                  const v = getEmbedOne(c.veiculos);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{a?.nome_completo ?? "—"}</TableCell>
                      <TableCell>{a?.cpf ?? "—"}</TableCell>
                      <TableCell>
                        {(v?.placa ?? "").trim() ? `${v?.placa} • ${v?.modelo ?? ""}` : v?.modelo ?? "—"}
                      </TableCell>
                      <TableCell>{formatDateTimeBR(c.generated_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Abrir perfil do associado"
                            onClick={() => navigate(`/associados/${c.associado_id}`)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => download(c)}
                            disabled={!c.pdf_path}
                            title={c.pdf_path ? 'Baixar PDF' : 'PDF não disponível'}
                          >
                            <Download className="h-4 w-4" />
                            {c.pdf_path ? 'PDF' : '—'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
