import { createFileRoute, Link } from "@tanstack/react-router";

import { useInstallPrompt } from "@/hooks/use-install-prompt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OrderHub — Toutes vos commandes, un seul tableau de bord" },
      {
        name: "description",
        content:
          "OrderHub centralise en temps réel les commandes de toutes vos pages de vente et campagnes publicitaires.",
      },
      { property: "og:title", content: "OrderHub — Centre de commandes ecommerce" },
      {
        property: "og:description",
        content: "Recevez, confirmez et suivez chaque commande depuis un seul écran.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    title: "Commandes en temps réel",
    text: "Chaque commande arrive instantanément, avec un signal sonore pour ne rien manquer.",
  },
  {
    title: "Toutes vos pages de vente",
    text: "Connectez autant de pages et de campagnes que vous voulez au même centre.",
  },
  {
    title: "Clients et performance",
    text: "Historique d'achat, doublons, revenus par produit, par ville et par source.",
  },
];

function Home() {
  const { canInstall, promptInstall } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-hero-mesh">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary font-display text-sm font-extrabold text-primary-foreground">
            OH
          </span>
          <span className="font-display text-lg font-bold">OrderHub</span>
        </div>
        <Link
          to="/auth"
          className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Se connecter
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <section className="py-12 sm:py-20">
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl">
            Toutes vos commandes,{" "}
            <span className="text-gradient-brand">un seul centre de contrôle</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            OrderHub réunit les commandes de vos pages de vente et de vos campagnes publicitaires :
            confirmation, préparation, livraison et statistiques, en temps réel.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Ouvrir mon tableau de bord
            </Link>
            <Link
              to="/auth"
              className="inline-flex h-11 items-center rounded-md border border-input bg-background px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Créer un compte
            </Link>
            {canInstall ? (
              <button
                type="button"
                onClick={() => void promptInstall()}
                className="inline-flex h-11 items-center rounded-md border border-primary px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                Installer l'application
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="surface-card p-5">
              <h2 className="font-display text-base font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
