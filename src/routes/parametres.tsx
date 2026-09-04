import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GROUPS, MODULES, ORG_NAME, modulesOfGroup } from "@/lib/modules";
import {
  useManagedUsers,
  useMyAccess,
  useSetAdmin,
  useSetModuleAccess,
  useSetModuleAccessBulk,
} from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/parametres")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: `Paramètres d'accès — ${ORG_NAME}` },
      {
        name: "description",
        content: "Gestion des droits : choisissez les onglets visibles par chaque utilisateur.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Paramètres d'accès — ${ORG_NAME}` },
      {
        property: "og:description",
        content: "Attribution des onglets visibles par utilisateur.",
      },
    ],
  }),
  component: ParametresPage,
});

function ParametresPage() {
  const { isAdmin, isLoading } = useMyAccess();
  const { data: users, isLoading: usersLoading } = useManagedUsers(isAdmin);
  const [selected, setSelected] = useState<string | null>(null);
  const setAccess = useSetModuleAccess();
  const setBulk = useSetModuleAccessBulk();
  const setAdmin = useSetAdmin();

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Card>
          <CardHeader>
            <CardTitle>Accès réservé</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Seul un administrateur peut modifier les droits d'accès. Contactez l'administrateur du
            système.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const current = users?.find((u) => u.id === selected) ?? null;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck className="size-6" /> Paramètres d'accès
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Choisissez les onglets visibles par chaque utilisateur. Un administrateur voit
          automatiquement toutes les rubriques.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {usersLoading ? <p className="text-muted-foreground text-sm">Chargement…</p> : null}
            {!usersLoading && !users?.length ? (
              <p className="text-muted-foreground text-sm">Aucun utilisateur enregistré.</p>
            ) : null}
            {users?.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selected === u.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                }`}
              >
                <span className="block truncate font-medium">
                  {u.nom_complet || u.email || "Utilisateur"}
                </span>
                <span className="text-muted-foreground block truncate text-xs">{u.email}</span>
                {u.roles.includes("admin") ? (
                  <Badge variant="secondary" className="mt-1">
                    Administrateur
                  </Badge>
                ) : null}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">
              {current
                ? `Onglets accordés à ${current.nom_complet || current.email}`
                : "Sélectionnez un utilisateur"}
            </CardTitle>
            {current ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBulk.mutate({ userId: current.id, slugs: MODULES.map((m) => m.slug) })
                  }
                >
                  Tout accorder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulk.mutate({ userId: current.id, slugs: [] })}
                >
                  Tout retirer
                </Button>
                <Button
                  variant={current.roles.includes("admin") ? "destructive" : "default"}
                  size="sm"
                  onClick={() =>
                    setAdmin.mutate({
                      userId: current.id,
                      admin: !current.roles.includes("admin"),
                    })
                  }
                >
                  {current.roles.includes("admin")
                    ? "Retirer administrateur"
                    : "Rendre administrateur"}
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!current ? (
              <p className="text-muted-foreground text-sm">
                Choisissez une personne à gauche pour définir ses rubriques visibles.
              </p>
            ) : current.roles.includes("admin") ? (
              <p className="text-muted-foreground text-sm">
                Cet utilisateur est administrateur : toutes les rubriques lui sont visibles.
              </p>
            ) : (
              <div className="space-y-6">
                {GROUPS.map((group) => (
                  <div key={group}>
                    <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-widest uppercase">
                      {group}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {modulesOfGroup(group).map((m) => {
                        const checked = current.slugs.includes(m.slug);
                        return (
                          <label
                            key={m.slug}
                            className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) =>
                                setAccess.mutate({
                                  userId: current.id,
                                  slug: m.slug,
                                  allowed: v === true,
                                })
                              }
                            />
                            <span>{m.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
