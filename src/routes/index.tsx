import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Novo Projeto — Comece a construir" },
      { name: "description", content: "Um ponto de partida moderno e elegante para o seu próximo projeto." },
      { property: "og:title", content: "Novo Projeto" },
      { property: "og:description", content: "Um ponto de partida moderno e elegante para o seu próximo projeto." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-primary/60" />
          Projeto
        </div>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground transition-colors">Recursos</a>
          <a href="#about" className="hover:text-foreground transition-colors">Sobre</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contato</a>
        </nav>
        <a
          href="#start"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Começar <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" /> Comece agora, do jeito certo
          </div>
          <h1 className="text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Construa algo que as pessoas amem usar.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Um esqueleto elegante e pronto para você transformar em qualquer produto — landing page, app, dashboard ou o que imaginar.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#start"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Começar agora <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Ver recursos
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Zap, title: "Rápido", desc: "Renderização instantânea e navegação fluida com TanStack." },
              { icon: Shield, title: "Sólido", desc: "TypeScript estrito e uma base testada para produção." },
              { icon: Sparkles, title: "Bonito", desc: "Design system pronto para você personalizar." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:bg-secondary/50">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 Projeto. Todos os direitos reservados.</p>
          <p>Feito com Lovable</p>
        </div>
      </footer>
    </div>
  );
}
