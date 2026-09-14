import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, Plus, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/data";
import { useMyAccess } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Employee = { id: string; nom: string; prenom: string | null; service: string | null };
type Salary = { id: string; employe_id: string; etat_civil: string; nombre_enfants: number; salaire_base: number };
type Detail = { id: string; employe_id: string; salaire_base: number; indemnite_deplacement: number; indemnite_logement: number; allocations_familiales: number; salaire_brut: number; inss_4: number; mutuelle_4: number; deductions: number; revenu_net_imposable: number; ipr: number; salaire_net: number; inss_6: number; inss_3: number; mutuelle_6: number; montant_supporte: number };
type Payslip = { id: string; mois: number; annee: number; document_url: string | null; auteur_nom: string | null; modificateur_nom: string | null; statut: string };

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const NEXT_STATUS: Record<string, string> = { Soumis: "Révisé", Révisé: "Validé", Validé: "Payé" };

function calculate(base: number, civil: string, children: number) {
  const travel = base * 0.15;
  const housing = base * 0.6;
  const family = children * 2000 + (civil === "Marié(e)" ? 3000 : 0);
  const gross = base + travel + housing + family;
  const inss4 = gross > 450000 ? 18000 : gross * 0.04;
  const inss6 = gross > 450000 ? 27000 : gross * 0.06;
  const inss3 = gross > 80000 ? 2400 : gross * 0.03;
  const deductions = travel + housing + inss4;
  const taxable = gross - deductions - family;
  const tax = Math.max(0, (taxable - 300000) * 0.3 + 30000);
  const mutual4 = 0;
  const net = gross - inss4 - tax - mutual4;
  const mutual6 = (gross - housing) * 0.06;
  const employerCost = inss4 + mutual4 + tax + net + inss6 + inss3 + mutual6;
  return { travel, housing, family, gross, inss4, inss6, inss3, deductions, taxable, tax, mutual4, net, mutual6, employerCost };
}

export function PayrollView() {
  const qc = useQueryClient();
  const { isAdmin } = useMyAccess();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Salary | null | undefined>(undefined);
  const [employeeId, setEmployeeId] = useState("");
  const [civil, setCivil] = useState("Célibataire");
  const [children, setChildren] = useState("0");
  const [base, setBase] = useState("0");

  const { data, isLoading } = useQuery({
    queryKey: ["payroll"],
    queryFn: async () => {
      const [employees, salaries, details, payslips] = await Promise.all([
        supabase.from("employes").select("id, nom, prenom, service").neq("statut", "Inactif").order("nom"),
        supabase.from("salaires").select("id, employe_id, etat_civil, nombre_enfants, salaire_base").order("created_at"),
        supabase.from("details_paie").select("*").order("created_at"),
        supabase.from("fiches_paie_mensuelles").select("id, mois, annee, document_url, auteur_nom, modificateur_nom, statut").order("annee", { ascending: false }).order("mois", { ascending: false }),
      ]);
      for (const result of [employees, salaries, details, payslips]) if (result.error) throw result.error;
      return { employees: (employees.data ?? []) as Employee[], salaries: (salaries.data ?? []) as Salary[], details: (details.data ?? []) as Detail[], payslips: (payslips.data ?? []) as Payslip[] };
    },
  });

  const employeeMap = useMemo(() => new Map((data?.employees ?? []).map((e) => [e.id, `${e.nom} ${e.prenom ?? ""}`.trim()])), [data?.employees]);
  const preview = calculate(Number(base || 0), civil, Number(children || 0));
  const filteredSalaries = (data?.salaries ?? []).filter((s) => employeeMap.get(s.employe_id)?.toLowerCase().includes(query.toLowerCase()));

  const saveSalary = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const values = { employe_id: employeeId, etat_civil: civil, nombre_enfants: Number(children), salaire_base: Number(base), auteur_id: auth.user?.id ?? null };
      const result = editing?.id
        ? await supabase.from("salaires").update(values).eq("id", editing.id)
        : await supabase.from("salaires").insert(values);
      if (result.error) throw result.error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["payroll"] }); setEditing(undefined); toast.success("Paramétrage salarial enregistré et calculé."); },
    onError: (error) => toast.error(error.message.includes("unique") ? "Cet employé possède déjà un paramétrage salarial." : error.message),
  });

  const createPayslip = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const { data: auth } = await supabase.auth.getUser();
      const name = auth.user?.user_metadata?.["nom_complet"] ?? auth.user?.email ?? "Utilisateur";
      const { error } = await supabase.from("fiches_paie_mensuelles").insert({ mois: previous.getMonth() + 1, annee: previous.getFullYear(), auteur_id: auth.user?.id ?? null, auteur_nom: name, modificateur_id: auth.user?.id ?? null, modificateur_nom: name, statut: "Soumis" });
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Fiche mensuelle générée et soumise."); },
    onError: (error) => toast.error(error.message.includes("unique") ? "Une fiche existe déjà pour cette période." : error.message),
  });

  const updatePayslip = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const name = auth.user?.user_metadata?.["nom_complet"] ?? auth.user?.email ?? "Utilisateur";
      const { error } = await supabase.from("fiches_paie_mensuelles").update({ statut, modificateur_id: auth.user?.id ?? null, modificateur_nom: name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["payroll"] }); toast.success("Statut de la fiche mis à jour."); },
    onError: (error) => toast.error(error.message),
  });

  function openSalary(salary?: Salary) {
    setEditing(salary ?? null);
    setEmployeeId(salary?.employe_id ?? "");
    setCivil(salary?.etat_civil ?? "Célibataire");
    setChildren(String(salary?.nombre_enfants ?? 0));
    setBase(String(salary?.salaire_base ?? 0));
  }

  function viewPayslip(payslip: Payslip) {
    if (payslip.document_url) { window.open(payslip.document_url, "_blank", "noopener,noreferrer"); return; }
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) { toast.error("Autorisez l’ouverture de la fiche dans votre navigateur."); return; }
    const rows = (data?.details ?? []).map((d) => `<tr><td>${employeeMap.get(d.employe_id) ?? "—"}</td><td>${formatMoney(d.salaire_brut)}</td><td>${formatMoney(d.ipr)}</td><td>${formatMoney(d.salaire_net)}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html><head><title>Fiche de paie ${payslip.mois}/${payslip.annee}</title><style>body{font-family:Arial,sans-serif;padding:36px;color:#17211b}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border:1px solid #bbb;text-align:left}small{color:#667}</style></head><body><h1>CNAC MURIMA W'ISANGI</h1><h2>Fiche mensuelle de paie — ${MONTHS[payslip.mois - 1]} ${payslip.annee}</h2><small>Statut : ${payslip.statut}</small><table><thead><tr><th>Employé</th><th>Salaire brut</th><th>IPR</th><th>Net à payer</th></tr></thead><tbody>${rows}</tbody></table><script>window.print()</script></body></html>`);
    popup.document.close();
  }

  return <div className="space-y-6">
    <header><h1 className="text-2xl font-semibold">Gestion des salaires</h1><p className="mt-1 text-sm text-muted-foreground">La paie est gérée séparément des dossiers Employés.</p></header>
    <Tabs defaultValue="parametres" className="space-y-4">
      <TabsList className="h-auto flex-wrap justify-start"><TabsTrigger value="parametres">Paramétrage</TabsTrigger><TabsTrigger value="details">Détails des calculs</TabsTrigger><TabsTrigger value="mensuelles">Fiches mensuelles</TabsTrigger></TabsList>
      <TabsContent value="parametres" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><SearchBox value={query} onChange={setQuery} /><Button onClick={() => openSalary()}><Plus className="mr-2 size-4" />Nouveau salaire</Button></div>
        <DataFrame loading={isLoading} empty={!filteredSalaries.length} columns={["Employé", "État civil", "Enfants", "Salaire de base", ""]}>
          {filteredSalaries.map((s) => <TableRow key={s.id}><TableCell className="font-medium">{employeeMap.get(s.employe_id) ?? "—"}</TableCell><TableCell>{s.etat_civil}</TableCell><TableCell>{s.nombre_enfants}</TableCell><TableCell>{formatMoney(s.salaire_base)}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => openSalary(s)}>Modifier</Button></TableCell></TableRow>)}
        </DataFrame>
      </TabsContent>
      <TabsContent value="details">
        <div className="mb-3 text-xs text-muted-foreground">ID : indemnité de déplacement · IL : indemnité de logement · AF : allocations familiales · RNI : revenu net imposable · SNP : salaire net à payer · MS : montant supporté</div>
        <DataFrame loading={isLoading} empty={!data?.details.length} columns={["Employé", "SB", "ID", "IL", "AF", "S. brute", "INSS 4%", "M 4%", "DED", "RNI", "IPR", "SNP", "INSS 6%", "INSS 3%", "M 6%", "MS"]}>
          {(data?.details ?? []).map((d) => <TableRow key={d.id}>{[employeeMap.get(d.employe_id) ?? "—", d.salaire_base, d.indemnite_deplacement, d.indemnite_logement, d.allocations_familiales, d.salaire_brut, d.inss_4, d.mutuelle_4, d.deductions, d.revenu_net_imposable, d.ipr, d.salaire_net, d.inss_6, d.inss_3, d.mutuelle_6, d.montant_supporte].map((value, i) => <TableCell key={i} className={i === 0 ? "font-medium whitespace-nowrap" : "text-right whitespace-nowrap"}>{i === 0 ? value : formatMoney(Number(value))}</TableCell>)}</TableRow>)}
        </DataFrame>
      </TabsContent>
      <TabsContent value="mensuelles" className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => createPayslip.mutate()} disabled={createPayslip.isPending || !data?.details.length}><Plus className="mr-2 size-4" />Générer le mois précédent</Button></div>
        <DataFrame loading={isLoading} empty={!data?.payslips.length} columns={["Mois", "Fiche", "Auteur", "Dernier modificateur", "Statut", "Actions"]}>
          {(data?.payslips ?? []).map((p) => { const nextStatus = NEXT_STATUS[p.statut]; return <TableRow key={p.id}><TableCell>{MONTHS[p.mois - 1]} {p.annee}</TableCell><TableCell><Button variant="ghost" size="icon" title="Consulter la fiche" onClick={() => viewPayslip(p)}><Eye className="size-4" /></Button></TableCell><TableCell>{p.auteur_nom ?? "—"}</TableCell><TableCell>{p.modificateur_nom ?? "—"}</TableCell><TableCell><StatusBadge status={p.statut} /></TableCell><TableCell className="whitespace-nowrap">{isAdmin && nextStatus ? <Button variant="outline" size="sm" onClick={() => updatePayslip.mutate({ id: p.id, statut: nextStatus })}><CheckCircle2 className="mr-2 size-4" />{nextStatus}</Button> : null}{isAdmin && p.statut !== "Annulé" && p.statut !== "Payé" ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => updatePayslip.mutate({ id: p.id, statut: "Annulé" })}><XCircle className="mr-2 size-4" />Annuler</Button> : null}</TableCell></TableRow>; })}
        </DataFrame>
      </TabsContent>
    </Tabs>

    <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open) setEditing(undefined); }}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>{editing?.id ? "Modifier le salaire" : "Nouveau salaire"}</DialogTitle><DialogDescription>Les montants détaillés sont calculés automatiquement selon les règles du système source.</DialogDescription></DialogHeader><div className="grid gap-5 sm:grid-cols-2"><Field label="Employé"><Select value={employeeId} onValueChange={setEmployeeId} disabled={Boolean(editing?.id)}><SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger><SelectContent>{(data?.employees ?? []).filter((e) => editing?.employe_id === e.id || !(data?.salaries ?? []).some((s) => s.employe_id === e.id)).map((e) => <SelectItem key={e.id} value={e.id}>{e.nom} {e.prenom}</SelectItem>)}</SelectContent></Select></Field><Field label="État civil"><Select value={civil} onValueChange={setCivil}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Célibataire">Célibataire</SelectItem><SelectItem value="Marié(e)">Marié(e)</SelectItem></SelectContent></Select></Field><Field label="Nombre d’enfants"><Input type="number" min="0" max="20" value={children} onChange={(e) => setChildren(e.target.value)} /></Field><Field label="Salaire de base (FBu)"><Input type="number" min="0" value={base} onChange={(e) => setBase(e.target.value)} /></Field></div><Card className="bg-muted/40"><CardContent className="grid gap-3 pt-5 sm:grid-cols-3"><Preview label="Salaire brut" value={preview.gross} /><Preview label="IPR" value={preview.tax} /><Preview label="Net à payer" value={preview.net} /></CardContent></Card><DialogFooter><Button variant="outline" onClick={() => setEditing(undefined)}>Annuler</Button><Button disabled={!employeeId || Number(base) <= 0 || saveSalary.isPending} onClick={() => saveSalary.mutate()}>Enregistrer et calculer</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="relative min-w-64"><Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Rechercher un employé…" className="pl-9" /></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Preview({ label, value }: { label: string; value: number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{formatMoney(value)}</p></div>; }
function StatusBadge({ status }: { status: string }) { return <Badge variant={status === "Payé" ? "default" : status === "Annulé" ? "destructive" : "outline"}>{status}</Badge>; }
function DataFrame({ columns, children, loading, empty }: { columns: string[]; children: React.ReactNode; loading: boolean; empty: boolean }) { return <div className="overflow-x-auto rounded-lg border bg-card"><Table><TableHeader><TableRow>{columns.map((c) => <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>)}</TableRow></TableHeader><TableBody>{loading || empty ? <TableRow><TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">{loading ? "Chargement…" : "Aucune donnée disponible."}</TableCell></TableRow> : children}</TableBody></Table></div>; }