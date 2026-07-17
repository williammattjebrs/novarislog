// Menu de ações padrão para qualquer registro do sistema.
// - alterar status
// - informar previsão
// - adicionar observação
// - anexar arquivo (mock)
// - registrar ocorrência
//
// O callback `onAction` recebe uma entrada de timeline pronta;
// a tela decide como aplicar (ex.: setar stage no order, adicionar à timeline).

import { useState, type ReactNode } from "react";
import { MoreHorizontal, Clock, StickyNote, Paperclip, AlertOctagon, RefreshCcw, X } from "lucide-react";
import type { TimelineEntry } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";

export interface StatusOption {
  id: string;
  label: string;
}

export interface RecordActionsProps {
  statusOptions?: StatusOption[];
  currentStatus?: string;
  onChangeStatus?: (next: string, entry: TimelineEntry) => void;
  onAddEntry: (entry: TimelineEntry) => void;
}

type Modal = null | "status" | "previsao" | "observacao" | "anexo" | "ocorrencia";

export function RecordActions(props: RecordActionsProps) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const { user } = useAuth();
  const autor = user?.nome ?? "sistema";

  function log(tipo: TimelineEntry["tipo"], texto: string): TimelineEntry {
    return { quando: new Date().toISOString(), autor, tipo, texto };
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 grid place-items-center rounded border border-border bg-panel hover:bg-elevated"
        aria-label="Ações"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 rounded-md border border-border bg-popover shadow-xl z-40 py-1 text-sm">
            {props.statusOptions && (
              <MenuBtn icon={RefreshCcw} label="Alterar status" onClick={() => { setModal("status"); setOpen(false); }} />
            )}
            <MenuBtn icon={Clock} label="Informar previsão" onClick={() => { setModal("previsao"); setOpen(false); }} />
            <MenuBtn icon={StickyNote} label="Adicionar observação" onClick={() => { setModal("observacao"); setOpen(false); }} />
            <MenuBtn icon={Paperclip} label="Anexar arquivo" onClick={() => { setModal("anexo"); setOpen(false); }} />
            <MenuBtn icon={AlertOctagon} label="Registrar ocorrência" onClick={() => { setModal("ocorrencia"); setOpen(false); }} />
          </div>
        </>
      )}

      {modal === "status" && props.statusOptions && (
        <StatusModal
          options={props.statusOptions}
          current={props.currentStatus}
          onCancel={() => setModal(null)}
          onConfirm={(next) => {
            const entry = log("status", `Status alterado para "${props.statusOptions!.find(o => o.id === next)?.label ?? next}"`);
            props.onChangeStatus?.(next, entry);
            setModal(null);
          }}
        />
      )}
      {modal === "previsao" && (
        <PromptModal
          title="Informar previsão"
          type="datetime-local"
          onCancel={() => setModal(null)}
          onConfirm={(v) => {
            if (v) props.onAddEntry(log("previsao", `Previsão informada: ${new Date(v).toLocaleString("pt-BR")}`));
            setModal(null);
          }}
        />
      )}
      {modal === "observacao" && (
        <PromptModal
          title="Adicionar observação"
          type="textarea"
          placeholder="Escreva a observação..."
          onCancel={() => setModal(null)}
          onConfirm={(v) => {
            if (v) props.onAddEntry(log("observacao", v));
            setModal(null);
          }}
        />
      )}
      {modal === "anexo" && (
        <PromptModal
          title="Anexar arquivo"
          type="file"
          onCancel={() => setModal(null)}
          onConfirm={(v) => {
            if (v) props.onAddEntry(log("anexo", `Anexo: ${v}`));
            setModal(null);
          }}
        />
      )}
      {modal === "ocorrencia" && (
        <OcorrenciaModal
          onCancel={() => setModal(null)}
          onConfirm={(cat, texto) => {
            props.onAddEntry(log("ocorrencia", `[${cat}] ${texto}`));
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function MenuBtn({ icon: Icon, label, onClick }: { icon: typeof RefreshCcw; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-elevated text-left">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </button>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-lg">{title}</div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusModal({ options, current, onCancel, onConfirm }: {
  options: StatusOption[]; current?: string; onCancel: () => void; onConfirm: (id: string) => void;
}) {
  const [v, setV] = useState(current ?? options[0]?.id ?? "");
  return (
    <ModalShell title="Alterar status" onClose={onCancel}>
      <select value={v} onChange={(e) => setV(e.target.value)} className="input">
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
        <button onClick={() => onConfirm(v)} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Confirmar</button>
      </div>
    </ModalShell>
  );
}

function PromptModal({ title, type, placeholder, onCancel, onConfirm }: {
  title: string; type: "text" | "textarea" | "datetime-local" | "file"; placeholder?: string;
  onCancel: () => void; onConfirm: (v: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <ModalShell title={title} onClose={onCancel}>
      {type === "textarea" ? (
        <textarea value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="input min-h-[100px]" />
      ) : type === "file" ? (
        <input type="file" onChange={(e) => setV(e.target.files?.[0]?.name ?? "")} className="input" />
      ) : (
        <input type={type} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="input" />
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
        <button onClick={() => onConfirm(v)} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">Confirmar</button>
      </div>
    </ModalShell>
  );
}

function OcorrenciaModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (cat: string, texto: string) => void }) {
  const [cat, setCat] = useState("atraso");
  const [texto, setTexto] = useState("");
  return (
    <ModalShell title="Registrar ocorrência" onClose={onCancel}>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Categoria</label>
      <select value={cat} onChange={(e) => setCat(e.target.value)} className="input mb-3">
        <option value="atraso">Atraso</option>
        <option value="avaria">Avaria</option>
        <option value="recusa">Recusa</option>
        <option value="extravio">Extravio</option>
        <option value="pane">Pane veículo</option>
        <option value="outro">Outro</option>
      </select>
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Descrição</label>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} className="input min-h-[100px]" placeholder="O que aconteceu..." />
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">Cancelar</button>
        <button onClick={() => onConfirm(cat, texto)} disabled={!texto.trim()} className="text-sm px-3 py-1.5 rounded bg-danger/15 border border-danger/40 text-danger hover:bg-danger/25 disabled:opacity-40">Registrar</button>
      </div>
    </ModalShell>
  );
}
