import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, ExternalLink, Search, ZoomIn } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth, canAccess } from "@/lib/auth";
import { MANUAL_CHAPTERS, MANUAL_FAQ } from "@/lib/manual-content";

export const Route = createFileRoute("/manual")({
  validateSearch: (search: Record<string, unknown>) => ({ modulo: typeof search.modulo === "string" && MANUAL_CHAPTERS.some((c) => c.id === search.modulo) ? search.modulo : "torre" }),
  head: () => ({ meta: [
    { title: "Manual de uso e treinamento | Novaris" },
    { name: "description", content: "Treinamento do TMS Novaris por módulo: clientes, XML, coletas, monitoramento, custos, conciliação e indicadores." },
    { property: "og:title", content: "Manual de uso e treinamento | Novaris" },
    { property: "og:description", content: "Aprenda os fluxos do TMS Novaris com telas reais e orientações passo a passo." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/manual"><AppShell><ManualPage /></AppShell></RoleGate>,
});

function ManualPage() {
  const { modulo } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [zoom, setZoom] = useState(false);
  const key = user ? `novaris:manual:${user.email}` : undefined;
  useEffect(() => {
    if (!key) return;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      setCompleted(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string" && MANUAL_CHAPTERS.some((c) => c.id === id)) : []);
    } catch { setCompleted([]); }
  }, [key]);
  const chapter = MANUAL_CHAPTERS.find((c) => c.id === modulo) ?? MANUAL_CHAPTERS[0];
  if (!chapter) return null;
  const chapterIndex = MANUAL_CHAPTERS.indexOf(chapter);
  const previous = MANUAL_CHAPTERS[chapterIndex - 1];
  const next = MANUAL_CHAPTERS[chapterIndex + 1];
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const term = normalize(query.trim());
  const filtered = MANUAL_CHAPTERS.filter((c) => normalize([c.title, c.description, ...c.lessons.flatMap((l) => [l.title, ...l.steps, l.note ?? ""])].join(" ")).includes(term));
  const allowed = user && canAccess(user.role, chapter.path, user.modulos);
  function toggleCompleted() {
    if (!chapter || !key) return;
    const value = completed.includes(chapter.id) ? completed.filter((id) => id !== chapter.id) : [...completed, chapter.id];
    setCompleted(value);
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Progress remains available for this session. */ }
  }
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="border-b border-border pb-6 flex flex-wrap justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs uppercase tracking-wider"><BookOpen className="size-4" /> Novaris · Treinamento</div>
          <h1 className="mt-2 text-3xl font-semibold">Manual de uso</h1>
          <p className="mt-2 text-muted-foreground text-sm">Da entrada da nota ao fechamento financeiro, módulo por módulo.</p>
        </div>
        <div className="self-center min-w-48">
          <div className="flex justify-between text-xs mb-2 gap-8"><span className="text-muted-foreground">Seu treinamento</span><span>{completed.length} de {MANUAL_CHAPTERS.length}</span></div>
          <div className="flex gap-1" role="progressbar" aria-label="Módulos concluídos" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={MANUAL_CHAPTERS.length}>
            {MANUAL_CHAPTERS.map((c) => <span key={c.id} className={`h-1.5 flex-1 rounded-sm ${completed.includes(c.id) ? "bg-success" : "bg-muted"}`} />)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[250px_minmax(0,1fr)] gap-6 lg:gap-9 pt-6">
        <aside className="min-w-0">
          <div className="xl:sticky xl:top-24 space-y-5">
            <label className="flex items-center gap-2 border border-border bg-panel rounded-md px-3 h-10">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input type="search" aria-label="Buscar no manual" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar no manual…" className="text-sm outline-none min-w-0 w-full bg-transparent" />
            </label>
            <nav aria-label="Módulos do treinamento" className="flex xl:flex-col gap-1 overflow-x-auto xl:overflow-visible pb-2">
              {filtered.map((c) => <Button key={c.id} variant="ghost" onClick={() => navigate({ search: { modulo: c.id } })} aria-current={c.id === chapter.id ? "page" : undefined} className={`h-auto min-h-11 justify-start px-3 py-2 shrink-0 xl:shrink text-left ${c.id === chapter.id ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                <span className="text-xs font-mono w-5 shrink-0">{String(MANUAL_CHAPTERS.indexOf(c) + 1).padStart(2, "0")}</span>
                <span className="flex-1 whitespace-normal">{c.title}</span>
                {completed.includes(c.id) && <CheckCircle2 className="size-4 text-success" />}
              </Button>)}
              {filtered.length === 0 && <p className="text-sm text-muted-foreground py-3">Nenhum módulo encontrado.</p>}
            </nav>
            <p className="hidden xl:block text-xs text-muted-foreground border-t border-border pt-4 leading-relaxed">O progresso fica salvo neste navegador, para a sua conta. O manual não altera registros da operação.</p>
          </div>
        </aside>
        <article className="min-w-0" key={chapter.id}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <p className="text-xs text-primary uppercase tracking-wider">{chapter.category} · Módulo {chapterIndex + 1}</p>
              <h2 className="text-2xl font-semibold mt-1">{chapter.title}</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">{chapter.description}</p>
            </div>
            {allowed ? <Button variant="outline" asChild><Link to={chapter.path}>Abrir módulo <ExternalLink /></Link></Button> : <span className="text-xs text-muted-foreground self-center">Acesso ao módulo depende do seu perfil.</span>}
          </div>
          <figure className="mb-7">
            <Button variant="ghost" className="block relative w-full h-auto p-0 rounded-md overflow-hidden border border-border hover:bg-transparent group" aria-label={`Ampliar tela de ${chapter.title}`} onClick={() => setZoom(true)}>
              <img src={chapter.image} alt={`Tela real de ${chapter.title} no TMS Novaris`} className="w-full aspect-[1280/850] object-cover" />
              <span className="absolute bottom-3 right-3 flex items-center gap-2 bg-background/90 border border-border px-3 py-2 rounded text-xs"><ZoomIn /> Ampliar tela</span>
            </Button>
            <figcaption className="text-xs text-muted-foreground mt-2 leading-relaxed">{chapter.caption} Imagem de referência; os dados podem variar.</figcaption>
          </figure>
          <div className="space-y-7">
            {chapter.lessons.map((lesson, index) => <section key={lesson.title} className="border-t border-border pt-5">
              <h3 className="font-semibold text-lg flex gap-3"><span className="text-primary font-mono text-sm pt-1">{String(index + 1).padStart(2, "0")}</span>{lesson.title}</h3>
              <ol className="mt-4 space-y-3">
                {lesson.steps.map((step, i) => <li key={step} className="flex gap-3 text-sm leading-relaxed"><span className="shrink-0 size-6 grid place-items-center rounded border border-border bg-panel text-muted-foreground text-xs font-mono">{i + 1}</span><span className="pt-0.5">{step}</span></li>)}
              </ol>
              {lesson.note && <div className="mt-4 border-l-2 border-warning bg-warning/5 px-4 py-3 text-sm leading-relaxed"><span className="text-warning font-medium">Atenção: </span>{lesson.note}</div>}
            </section>)}
          </div>
          <section className="border-t border-border mt-7 pt-5">
            <h3 className="font-semibold flex gap-2 items-center"><CheckCircle2 className="size-4 text-success" /> Antes de seguir</h3>
            <ul className="mt-3 space-y-2">{chapter.checklist.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 text-success shrink-0" />{item}</li>)}</ul>
            <Button className="mt-5" variant={completed.includes(chapter.id) ? "secondary" : "default"} onClick={toggleCompleted}>{completed.includes(chapter.id) ? <CheckCircle2 /> : <Check />}{completed.includes(chapter.id) ? "Módulo concluído · desfazer" : "Marcar módulo como concluído"}</Button>
          </section>
          <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5 mt-7">
            {previous ? <Button variant="outline" onClick={() => { navigate({ search: { modulo: previous.id } }); window.scrollTo({ top: 0 }); }}><ArrowLeft /> Anterior</Button> : <span />}
            {next && <Button variant="outline" onClick={() => { navigate({ search: { modulo: next.id } }); window.scrollTo({ top: 0 }); }}>Próximo módulo <ArrowRight /></Button>}
          </div>
          <section className="mt-10 border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-3">Dúvidas frequentes</h3>
            {MANUAL_FAQ.filter((f) => !term || normalize(f.question + f.answer).includes(term)).map((faq) => <details key={faq.question} className="group border-b border-border py-3"><summary className="flex items-center justify-between gap-3 cursor-pointer text-sm font-medium list-none">{faq.question}<ChevronDown className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-relaxed text-muted-foreground pr-5">{faq.answer}</p></details>)}
          </section>
        </article>
      </div>
      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="w-[96vw] max-w-6xl p-3 md:p-5 max-h-[90vh] overflow-y-auto">
          <DialogTitle>{chapter.title}</DialogTitle>
          <DialogDescription>{chapter.caption}</DialogDescription>
          <img src={chapter.image} alt={`Tela ampliada de ${chapter.title}`} className="w-full h-auto rounded border border-border" />
        </DialogContent>
      </Dialog>
    </div>
  );
}