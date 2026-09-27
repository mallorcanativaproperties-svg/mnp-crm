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

## pg-palma-2023-normativa.txt

Normas urbanísticas del Plan General de Palma aprobado el 28/04/2023, publicado en
el BOIB núm. 71 de 30/05/2023 (edicto 5236, páginas 30422-31788).

Está archivado aquí porque el PDF del BOIB **no se puede leer como texto**. Lo generó
iText con 62 fuentes, 44 de ellas sin tabla de codificación: los caracteres que salen
son índices de glifo leídos como Unicode. Y de los 22 índices que caen en el rango
ASCII, ninguno se mapea a sí mismo — la "D" es una "M", la "K" es una "O", el "1" es
una "Í". Es decir que un título en mayúsculas sale como texto plausible y equivocado,
que ningún detector de caracteres raros marca.

De las 1.367 páginas del PDF, 188 estaban afectadas. Este fichero se ha compuesto con
la capa de texto exacta para las 1.179 páginas limpias y con reconocimiento óptico a
250 ppp (tesseract, catalán + castellano) para las 188 corruptas. Corrupción residual
medida: 0,000 %.

Lo que viene de reconocimiento óptico puede tener algún error de lectura aislado, a
diferencia del resto. Por eso la referencia legal del documento lo dice, para que el
agente no cite esa parte como literalidad absoluta sin comprobarla contra el PDF.
