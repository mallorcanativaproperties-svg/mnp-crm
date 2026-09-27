# Fuentes internas del corpus de los agentes IA

Material de la casa que se carga en el corpus de los agentes como `texto`, no
desde una URL: no está publicado en ningún boletín y no tiene servidor del que
bajarlo. Vive aquí, bajo control de versiones, por dos razones:

1. **Para que no exista solo como fila de la base de datos.** El contenido se
   indexa en `ia_documentos` / `ia_chunks`, pero si esa fila se borra o se
   recarga mal, el texto se pierde. Aquí queda el original y se puede ver el
   diff de cada corrección.
2. **Porque la corrección de una cifra necesita historia.** La guía del ITP se
   corrigió el 27-9-2026 en dos cifras que venían mal de la tabla publicada del
   BOE. Sin historial, alguien las "arregla" de vuelta dentro de seis meses.

No está en `public/`: es documentación interna, y servida desde ahí quedaría
accesible en internet a quien acertara la ruta. `docs/` no lo sirve Next.js.

## Cómo se cargan

Por el endpoint de ingesta, con el texto en el campo `texto` y **el mismo
título** que tenga ya el documento, para que la recarga lo reemplace en vez de
duplicarlo. Si el título ha cambiado desde la carga anterior, la recarga NO
reemplaza (la identidad del documento cuelga del título cuando no hay URL):
usa `identidad` para darle una clave estable, o `reemplazarPorTitulo: true`
para borrar la versión anterior. El endpoint avisa en la comprobación en seco
cuando se va a quedar un duplicado.

## Índice

- `guia-itp-illes-balears-v4.md` — ITP y AJD en Illes Balears: escala por
  tramos, umbrales de acceso por isla, los tres beneficios de vivienda habitual
  y los ocho requisitos de la bonificación del 100 %. Agente: Fiscalidad,
  peso 9. v4 corrige la escala de los dos tramos superiores y el ejemplo de
  tipo medio de 900.000 € (ver su apartado 3 bis).
