# Fuentes normativas archivadas

Textos normativos que el Asistente IA necesita y que **no se pueden descargar
desde su origen oficial**. Se archivan aquí porque:

- `palma.es` y `palma.cat` bloquean por completo cualquier acceso que no sea un
  navegador: el servidor no puede bajar las ordenanzas fiscales de Palma.
- Llucmajor publica su ordenanza en un `.zip` con dos ficheros `.doc` (Word 97),
  formato que el servidor no sabe leer.

Al servirse desde el propio CRM tienen una URL estable, así que el control de
vigencia (`/api/cron/asistente-vigencia`) también los vigila: si alguien cambia
uno de estos ficheros, el cron lo detecta igual que detecta un cambio en el BOE.

**Estos ficheros son la fuente, no un resumen.** Si se actualiza una ordenanza,
hay que sustituir el texto completo y recargar el documento en el corpus.

| Fichero | Municipio | Origen | Ejercicio |
|---|---|---|---|
| `palma-iivtnu-2026.txt` | Palma | Ordenanzas fiscales 2026, concepto 114,00 (BOIB 165 de 17/12/2024) | 2026 |
| `llucmajor-iivtnu-2008.txt` | Llucmajor | Ordenanza I-04 (BOIB 100 de 19/07/2008), convertida del .doc original | 2008 |
