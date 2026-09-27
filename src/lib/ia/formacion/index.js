/**
 * Textos de la formacion interna, para cargarlos en el corpus de los agentes.
 *
 * No estan en public/ a proposito: son documentacion interna de la casa, no una
 * norma publicada. Servidos desde public/ quedarian accesibles en internet a
 * quien acertara la ruta.
 *
 * Al no venir de una URL no entran en el control de vigencia, y es correcto: no
 * hay nada externo con lo que comparar. La version buena es el PDF del modulo, y
 * cuando la casa lo actualice hay que regenerar estos ficheros y recargar.
 */
const MODULOS = {
  "atlas-mallorca": () => import("./atlas-mallorca.js"),
  "modulo-01": () => import("./modulo-01.js"),
  "modulo-02": () => import("./modulo-02.js"),
  "modulo-03": () => import("./modulo-03.js"),
  "modulo-04": () => import("./modulo-04.js"),
  "modulo-05": () => import("./modulo-05.js"),
  "modulo-06": () => import("./modulo-06.js"),
  "modulo-07": () => import("./modulo-07.js"),
  "modulo-08": () => import("./modulo-08.js"),
  "modulo-09": () => import("./modulo-09.js"),
  "modulo-10": () => import("./modulo-10.js"),
  "modulo-11": () => import("./modulo-11.js"),
  "modulo-12": () => import("./modulo-12.js"),
  "modulo-13": () => import("./modulo-13.js"),
};

export function modulosDisponibles() {
  return Object.keys(MODULOS);
}

export async function textoDeFormacion(slug) {
  const cargar = MODULOS[slug];
  if (!cargar) return null;
  const m = await cargar();
  return m.default;
}
