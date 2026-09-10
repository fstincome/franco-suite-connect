import { useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { Field, ModuleDef } from "@/lib/modules";
import { MODULE_MAP } from "@/lib/modules";
import { ACCOUNT_LEVELS, createEntityAccount, type AccountLevel } from "@/lib/entity-accounts.functions";
import { useMyAccess } from "@/lib/access";
import { formatValue, rowLabel, useDeleteRow, useRows, useSaveRow, type Row } from "@/lib/data";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ResourceView({ mod }: { mod: ModuleDef }) {
  const { data: rows = [], isLoading } = useRows(mod.slug);
  const save = useSaveRow(mod.slug);
  const remove = useDeleteRow(mod.slug);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});

  function openForm(row: Row) {
    const next: Row = { ...row };
    // Valeurs par défaut pour une nouvelle fiche (évite les champs obligatoires vides).
    for (const f of mod.fields) {
      if (next[f.name] !== undefined && next[f.name] !== null) continue;
      if (f.type === "select" && f.options?.length) next[f.name] = f.options[0];
      else if (f.type === "number") next[f.name] = 0;
    }
    setEditing(row);
    setForm(next);
  }
  function setField(name: string, value: unknown) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const { isAdmin } = useMyAccess();
  const isAccountLevel = (ACCOUNT_LEVELS as readonly string[]).includes(mod.slug);
  const canCreateAccount = isAdmin && isAccountLevel;
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const createAccount = useServerFn(createEntityAccount);

  async function handleAccount(row: Row) {
    setCreatingId(row["id"]);
    try {
      const res = await createAccount({
        data: { level: mod.slug as AccountLevel, id: row["id"] },
      });
      if (res.status === "exists") {
        toast.info(`Un accès existe déjà pour ${res.email}.`);
      } else {
        window.alert(
          `Accès créé.\n\nIdentifiant : ${res.email}\nMot de passe : ${res.password}\n\nNotez ce mot de passe : il ne sera plus affiché.`,
        );
        toast.success("Accès de connexion créé.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création de l'accès impossible.");
    } finally {
      setCreatingId(null);
    }
  }


  const refModules = useMemo(
    () => [...new Set(mod.fields.filter((f) => f.refModule).map((f) => f.refModule!))],
    [mod],
  );

  const refA = useRows(refModules[0] ?? "clients", !!refModules[0]);
  const refB = useRows(refModules[1] ?? "clients", !!refModules[1]);
  const refC = useRows(refModules[2] ?? "clients", !!refModules[2]);
  const refD = useRows(refModules[3] ?? "clients", !!refModules[3]);
  const refData: Record<string, Row[]> = {};
  const refQueries = [refA, refB, refC, refD];
  refModules.forEach((slug, i) => {
    refData[slug] = refQueries[i]?.data ?? [];
  });


  const refLabel = (slug: string, id: string | null) => {
    if (!id) return "—";
    const target = MODULE_MAP[slug];
    const row = (refData[slug] ?? []).find((r) => r["id"] === id);
    return target ? rowLabel(target, row) : "—";
  };

  const listFields = mod.fields.filter((f) => f.list);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      mod.fields.some((f) => {
        const raw = f.refModule ? refLabel(f.refModule, row[f.name]) : row[f.name];
        return String(raw ?? "")
          .toLowerCase()
          .includes(q);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, query, refA.data, refB.data, refC.data, refD.data]);

  function optionsFor(f: Field): Row[] {
    if (!f.refModule) return [];
    const all = refData[f.refModule] ?? [];
    if (!f.filterBy) return all;
    const parentField = mod.fields.find((x) => x.name === f.filterBy!.field);
    const parentId = form[f.filterBy.field];
    if (!parentField?.refModule || !parentId) return [];
    const parent = (refData[parentField.refModule] ?? []).find((r) => r["id"] === parentId);
    const inherited = parent?.[f.filterBy.via];
    if (!inherited) return [];
    return all.filter((o) => o[f.filterBy!.via] === inherited);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values: Row = {};
    for (const f of mod.fields) {
      const raw = form[f.name];
      const s = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw);
      values[f.name] = f.type === "number" ? (s === "" ? 0 : Number(s)) : s === "" ? null : s;
      if (f.required && (values[f.name] === null || values[f.name] === "")) {
        toast.error(`Le champ « ${f.label} » est obligatoire.`);
        return;
      }
    }
    if (editing?.["id"]) values["id"] = editing["id"];
    try {
      await save.mutateAsync(values);
      toast.success(editing?.["id"] ? "Enregistrement mis à jour." : `${mod.singular} ajouté.`);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{mod.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
        </div>
        <Button onClick={() => openForm({})}>
          <Plus className="mr-2 size-4" />
          Nouveau
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Rechercher dans ${mod.title.toLowerCase()}…`}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary">{filtered.length} enregistrement(s)</Badge>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {listFields.map((f) => (
                  <TableHead key={f.name}>{f.label}</TableHead>
                ))}
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={listFields.length + 1} className="py-10 text-center">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={listFields.length + 1}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Aucun enregistrement. Utilisez « Nouveau » pour en ajouter un.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row["id"]}>
                    {listFields.map((f) => (
                      <TableCell key={f.name}>
                        {f.refModule ? (
                          refLabel(f.refModule, row[f.name])
                        ) : f.name === "statut" ? (
                          <Badge variant="outline">{row[f.name] ?? "—"}</Badge>
                        ) : (
                          formatValue(row[f.name], f.suffix)
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-right whitespace-nowrap">
                      {canCreateAccount ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={row["user_id"] ? "Accès déjà créé" : "Créer l'accès de connexion"}
                          disabled={!!row["user_id"] || creatingId === row["id"]}
                          onClick={() => handleAccount(row)}
                        >
                          <KeyRound
                            className={row["user_id"] ? "size-4 text-muted-foreground" : "size-4"}
                          />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" onClick={() => openForm(row)}>
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (!window.confirm("Supprimer définitivement cet enregistrement ?"))
                            return;
                          try {
                            await remove.mutateAsync(row["id"]);
                            toast.success("Enregistrement supprimé.");
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Suppression impossible.",
                            );
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.["id"] ? `Modifier — ${mod.singular}` : `Nouveau — ${mod.singular}`}
            </DialogTitle>
            <DialogDescription>{mod.description}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            {mod.fields.map((f) => (
              <FieldInput
                key={f.name}
                field={f}
                value={form[f.name] ?? ""}
                onChange={(v) => {
                  setField(f.name, v);
                  // Un changement d'entité mère réinitialise les champs hérités.
                  mod.fields
                    .filter((c) => c.filterBy?.field === f.name)
                    .forEach((c) => setField(c.name, ""));
                }}
                options={optionsFor(f)}
                hint={
                  f.filterBy && !form[f.filterBy.field]
                    ? `Sélectionnez d'abord « ${mod.fields.find((x) => x.name === f.filterBy!.field)?.label ?? ""} ».`
                    : undefined
                }
              />
            ))}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Annuler
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldInput({
  field,
  value: rawValue,
  onChange,
  options,
  hint,
}: {
  field: Field;
  value: unknown;
  onChange: (value: string) => void;
  options: Row[];
  hint?: string | undefined;
}) {
  const value = rawValue === null || rawValue === undefined ? "" : String(rawValue);
  const wide = field.type === "textarea";

  return (
    <div className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          id={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : field.type === "select" ? (
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          items={(field.options ?? []).map((o) => ({ value: o, label: o }))}
        />
      ) : field.refModule ? (
        <SelectField
          field={field}
          value={value}
          onChange={onChange}
          disabled={Boolean(hint)}
          items={options.map((o) => ({
            value: String(o["id"]),
            label: rowLabel(MODULE_MAP[field.refModule!]!, o),
          }))}
        />
      ) : (
        <Input
          id={field.name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          step={field.type === "number" ? "any" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
  items,
  disabled,
}: {
  field: Field;
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  disabled?: boolean | undefined;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled ?? false}>
      <SelectTrigger id={field.name}>
        <SelectValue placeholder={disabled ? "Indisponible" : "Sélectionner…"} />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 ? (
          <SelectItem value="__vide" disabled>
            Aucune option
          </SelectItem>
        ) : (
          items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
