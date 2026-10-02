import { useEffect, useMemo, useState } from "react";

export type City = { nome: string; uf: string };
let cache: Promise<City[]> | null = null;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Base oficial de municípios do IBGE (carregada uma vez).
export function loadCities(): Promise<City[]> {
  if (!cache) {
    cache = fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado")
      .then((r) => r.json())
      .then((d: any[]) => d.map((m) => ({ nome: m["municipio-nome"], uf: m["UF-sigla"] })))
      .catch(() => { cache = null; return []; });
  }
  return cache;
}

// Só aceita cidades escolhidas da lista do IBGE — sem digitação livre.
export function CityPicker({ value, onChange, placeholder }: { value: City | null; onChange: (c: City | null) => void; placeholder?: string }) {
  const [cities, setCities] = useState<City[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => { loadCities().then(setCities); }, []);
  const res = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    return cities.filter((c) => norm(c.nome).startsWith(n)).concat(cities.filter((c) => !norm(c.nome).startsWith(n) && norm(c.nome).includes(n))).slice(0, 30);
  }, [q, cities]);

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={cities.length ? placeholder ?? "Pesquisar cidade..." : "Carregando cidades do IBGE..."}
        value={open ? q : value ? `${value.nome} / ${value.uf}` : ""}
        onFocus={() => { setOpen(true); setQ(""); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && res.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto panel border border-border shadow-lg">
          {res.map((c) => (
            <button key={c.nome + c.uf} type="button" onMouseDown={() => { onChange(c); setOpen(false); }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-primary/15">
              {c.nome} <span className="text-muted-foreground">/ {c.uf}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
