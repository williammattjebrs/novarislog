// Mapa do Brasil com pins geográficos (Leaflet via CDN + OSM).
// Leaflet é carregado por <script> no browser para nunca entrar no bundle do servidor.

import { useEffect, useRef, useState } from "react";
import type { Order } from "@/lib/mock-data";

declare global {
  interface Window {
    L?: any;
    __leafletLoading?: Promise<any>;
  }
}

const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletLoading) return window.__leafletLoading;

  window.__leafletLoading = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Falha ao carregar o mapa"));
    document.head.appendChild(script);
  });

  return window.__leafletLoading;
}

function colorFor(status: string): string {
  if (status === "entregue") return "#4ade80";
  if (status === "ocorrencia" || status === "cte_divergente") return "#ef4444";
  if (status === "em_viagem") return "#22d3ee";
  return "#f59e0b";
}

export function BrazilMap({ orders }: { orders: Order[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  // Monta o mapa uma vez, só no browser
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          center: [-15.5, -52],
          zoom: 4,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);
        setReady(true);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Atualiza os pins quando as ordens mudam
  useEffect(() => {
    if (!ready || !window.L || !layerRef.current) return;
    const L = window.L;
    layerRef.current.clearLayers();
    orders
      .filter((o) => o.latDestino != null && o.lngDestino != null)
      .forEach((o) => {
        const color = colorFor(o.stage);
        L.circleMarker([o.latDestino, o.lngDestino], {
          radius: 8,
          color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: 2,
        })
          .bindPopup(
            `<div style="font-size:12px"><strong>${o.id}</strong> · ${o.clienteNome}<br/>` +
              `${o.cidadeEntrega}/${o.ufEntrega}<br/>Status: ${o.stage}<br/>` +
              `Frete: R$ ${o.valorFrete.toLocaleString("pt-BR")}</div>`
          )
          .addTo(layerRef.current);
      });
  }, [orders, ready]);

  if (error) {
    return (
      <div className="h-[420px] grid place-items-center text-xs text-muted-foreground bg-elevated/30">
        Não foi possível carregar o mapa.
      </div>
    );
  }

  return (
    <div className="relative h-[420px] rounded-md overflow-hidden">
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground bg-elevated/30">
          Carregando mapa...
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" style={{ background: "#0b1220" }} />
    </div>
  );
}
