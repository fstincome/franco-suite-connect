import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ResourceView } from "@/components/ResourceView";
import { MODULE_MAP, ORG_NAME } from "@/lib/modules";

export const Route = createFileRoute("/m/$module")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (!MODULE_MAP[params.module]) throw notFound();
  },
  head: ({ params }) => {
    const mod = MODULE_MAP[params.module];
    const title = `${mod?.title ?? "Module"} — ${ORG_NAME}`;
    const description = mod?.description ?? `Module de gestion de ${ORG_NAME}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const { module: slug } = Route.useParams();
  const mod = MODULE_MAP[slug];
  if (!mod) return null;
  return (
    <AppShell>
      <ResourceView mod={mod} />
    </AppShell>
  );
}
