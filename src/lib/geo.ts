// Coordenadas aproximadas para pins no mapa. Só capitais + cidades comuns —
// suficiente para prototipagem. Chave é normalização "cidade/uf".

export const CITY_COORDS: Record<string, [number, number]> = {
  "são paulo/sp": [-23.5505, -46.6333],
  "sao paulo/sp": [-23.5505, -46.6333],
  "campinas/sp": [-22.9099, -47.0626],
  "santos/sp": [-23.9535, -46.3336],
  "sorocaba/sp": [-23.5015, -47.4526],
  "ribeirão preto/sp": [-21.1775, -47.8103],
  "guarulhos/sp": [-23.4538, -46.5333],
  "osasco/sp": [-23.5325, -46.7917],
  "jundiaí/sp": [-23.1857, -46.8978],
  "cajamar/sp": [-23.3556, -46.8778],
  "louveira/sp": [-23.0872, -46.9494],
  "extrema/mg": [-22.8542, -46.3181],
  "belo horizonte/mg": [-19.9167, -43.9345],
  "rio de janeiro/rj": [-22.9068, -43.1729],
  "duque de caxias/rj": [-22.7858, -43.3117],
  "curitiba/pr": [-25.4284, -49.2733],
  "porto alegre/rs": [-30.0346, -51.2177],
  "florianópolis/sc": [-27.5954, -48.548],
  "são josé/sc": [-27.5972, -48.6376],
  "vitória/es": [-20.3155, -40.3128],
  "salvador/ba": [-12.9714, -38.5014],
  "goiânia/go": [-16.6869, -49.2648],
  "brasília/df": [-15.7801, -47.9292],
  "cuiabá/mt": [-15.601, -56.0974],
  "recife/pe": [-8.0476, -34.877],
  "fortaleza/ce": [-3.7327, -38.5267],
  "manaus/am": [-3.1019, -60.025],
  "belém/pa": [-1.4558, -48.5044],
  "natal/rn": [-5.7945, -35.211],
  "maceió/al": [-9.6498, -35.7089],
  "joão pessoa/pb": [-7.115, -34.861],
  "aracaju/se": [-10.9091, -37.0677],
  "são luís/ma": [-2.5307, -44.3068],
  "teresina/pi": [-5.0892, -42.8016],
  "campo grande/ms": [-20.4697, -54.6201],
  "palmas/to": [-10.1845, -48.3336],
  "boa vista/rr": [2.8235, -60.6758],
  "macapá/ap": [0.0349, -51.0694],
  "porto velho/ro": [-8.7612, -63.9004],
  "rio branco/ac": [-9.9754, -67.8249],
};

export function lookupCoords(cidade: string, uf: string): [number, number] | null {
  const k = `${cidade.trim().toLowerCase()}/${uf.trim().toLowerCase()}`;
  return CITY_COORDS[k] ?? null;
}
