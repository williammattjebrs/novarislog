// Mapa do Brasil com pins geográficos (Leaflet + OSM).
// Carregado só no browser via <ClientOnly> para evitar SSR errors.

import { useEffect, useState } from "react";
import type { Order } from "@/lib/mock-data";

interface Pin {
  id: string;
  cidade: string;
  uf: string;
  lat: number;
  lng: number;
  status: string;
  cliente: string;
  valor: number;
}

export function BrazilMap({ orders }: { orders: Order[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const pins: Pin[] = orders
    .filter((o) => o.latDestino != null && o.lngDestino != null)
    .map((o) => ({
      id: o.id,
      cidade: o.cidadeEntrega,
      uf: o.ufEntrega,
      lat: o.latDestino!,
      lng: o.lngDestino!,
      status: o.stage,
      cliente: o.clienteNome,
      valor: o.valorFrete,
    }));

  if (!mounted) {
    return (
      <div className="h-[420px] grid place-items-center text-xs text-muted-foreground bg-elevated/30">
        Carregando mapa...
      </div>
    );
  }

  return <MapInner pins={pins} />;
}

function MapInner({ pins }: { pins: Pin[] }) {
  // Import dinâmico após hidratação para evitar SSR
  const [mod, setMod] = useState<any>(null);
  useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet"),
      // @ts-ignore
      import("leaflet/dist/leaflet.css"),
    ]).then(([rl, L]) => {
      // Corrige ícones default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L as any).Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setMod({ ...rl, L });
    });
  }, []);

  if (!mod) {
    return <div className="h-[420px] grid place-items-center text-xs text-muted-foreground bg-elevated/30">Carregando mapa...</div>;
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = mod;

  function colorFor(status: string): string {
    if (status === "entregue") return "#4ade80";
    if (status === "ocorrencia" || status === "cte_divergente") return "#ef4444";
    if (status === "em_viagem") return "#22d3ee";
    return "#f59e0b";
  }

  return (
    <div className="h-[420px] rounded-md overflow-hidden">
      <MapContainer center={[-15.5, -52]} zoom={4} style={{ height: "100%", width: "100%", background: "#0b1220" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={8}
            pathOptions={{ color: colorFor(p.status), fillColor: colorFor(p.status), fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>{p.id}</strong> · {p.cliente}<br />
                {p.cidade}/{p.uf}<br />
                Status: {p.status}<br />
                Frete: R$ {p.valor.toLocaleString("pt-BR")}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
