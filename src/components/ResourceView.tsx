import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Field, ModuleDef } from "@/lib/modules";
import { MODULE_MAP } from "@/lib/modules";
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
  }, [rows, query, refA.data, refB.data]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values: Row = {};
    for (const f of mod.fields) {
      const v = form.get(f.name);
      const s = typeof v === "string" ? v.trim() : "";
      values[f.name] = f.type === "number" ? (s === "" ? 0 : Number(s)) : s === "" ? null : s;
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
        <Button onClick={() => setEditing({})}>
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
                      <Button variant="ghost" size="icon" onClick={() => setEditing(row)}>
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
                key={`${editing?.["id"] ?? "new"}-${f.name}`}
                field={f}
                defaultValue={editing?.[f.name] ?? ""}
                options={f.refModule ? (refData[f.refModule] ?? []) : []}
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
  defaultValue,
  options,
}: {
  field: Field;
  defaultValue: unknown;
  options: Row[];
}) {
  const value = defaultValue === null ? "" : String(defaultValue);
  const wide = field.type === "textarea";

  return (
    <div className={wide ? "space-y-2 sm:col-span-2" : "space-y-2"}>
      <Label htmlFor={field.name}>
        {field.label}
        {field.required ? " *" : ""}
      </Label>
      {field.type === "textarea" ? (
        <Textarea id={field.name} name={field.name} defaultValue={value} rows={3} />
      ) : field.type === "select" ? (
        <SelectField field={field} value={value} items={field.options ?? []} />
      ) : field.refModule ? (
        <SelectField
          field={field}
          value={value}
          items={options.map((o) => ({
            value: String(o["id"]),
            label: rowLabel(MODULE_MAP[field.refModule!]!, o),
          }))}
        />
      ) : (
        <Input
          id={field.name}
          name={field.name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          step={field.type === "number" ? "any" : undefined}
          required={field.required ?? false}
          defaultValue={value}
        />
      )}
    </div>
  );
}

function SelectField({
  field,
  value,
  items,
}: {
  field: Field;
  value: string;
  items: (string | { value: string; label: string })[];
}) {
  const [current, setCurrent] = useState(value);
  const normalized = items.map((i) => (typeof i === "string" ? { value: i, label: i } : i));
  return (
    <>
      <input type="hidden" name={field.name} value={current} />
      <Select value={current} onValueChange={setCurrent}>
        <SelectTrigger id={field.name}>
          <SelectValue placeholder="Sélectionner…" />
        </SelectTrigger>
        <SelectContent>
          {normalized.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
