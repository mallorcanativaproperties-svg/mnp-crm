#!/usr/bin/env python3
"""
Rellena las plantillas DOCX de visitas con los datos reales
y convierte a PDF usando LibreOffice.
"""
import sys, json, zipfile, re, shutil, os, subprocess, tempfile
from pathlib import Path

def rellenar_docx(tipo, datos, firma_comprador_img=None, firma_agente_img=None, firma_vendedor_img=None):
    """
    tipo: hoja_visita | oferta | reserva | contraoferta
    datos: dict con los campos
    Devuelve: bytes del PDF generado
    """
    script_dir = Path(__file__).parent
    
    plantilla_map = {
        "hoja_visita":  "1_Registro_Cliente_Hoja_Visita.docx",
        "oferta":       "2_Propuesta_de_Compra_Oferta.docx",
        "reserva":      "3_Reserva_Exclusiva.docx",
        "contraoferta": "2_Propuesta_de_Compra_Oferta.docx",  # misma base
    }
    plantilla = script_dir / plantilla_map.get(tipo, "1_Registro_Cliente_Hoja_Visita.docx")
    
    # Extraer compradores
    compradores = datos.get("compradores", [])
    c1 = compradores[0] if len(compradores) > 0 else {}
    c2 = compradores[1] if len(compradores) > 1 else {}
    
    # Fecha
    from datetime import datetime
    fecha = datetime.fromisoformat(datos.get("fecha_documento", datetime.now().isoformat())[:19])
    meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
    
    # Precio formateado
    precio_pub = datos.get("propiedad", {}).get("precio_publicacion", 0)
    precio_of  = datos.get("precio_oferta")
    
    def fmt_precio_largo(n):
        try:
            n = int(float(n))
            return f"{n:,}".replace(",", ".") + f" EUROS ({n:,} €)".replace(",", ".")
        except:
            return str(n)

    # Mapa de sustituciones sobre el XML
    reemplazos = [
        # Ciudad y fecha
        ("…………………", "Palma de Mallorca"),
        ("……", str(fecha.day).zfill(2)),
        ("……………………", meses[fecha.month - 1]),
        ("…………", str(fecha.year)),
        # Agente
        ("…………………………………………………………………………………………, actuando como ",
         f"{datos.get('agente', {}).get('nombre', '')}, actuando como "),
        # Precio publicación (después del label)
        # Compradores — primer comprador
    ]

    # Trabajar en un directorio temporal
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_docx = os.path.join(tmpdir, "doc.docx")
        shutil.copy(plantilla, tmp_docx)
        
        # Desempaquetar
        unpack_dir = os.path.join(tmpdir, "unpacked")
        subprocess.run(["unzip", "-q", tmp_docx, "-d", unpack_dir], check=True)
        
        doc_xml_path = os.path.join(unpack_dir, "word", "document.xml")
        with open(doc_xml_path, encoding="utf-8") as f:
            xml = f.read()
        
        # ── Sustituciones básicas ──────────────────────────────────────
        xml = xml.replace("…………………", "Palma de Mallorca", 1)
        xml = xml.replace("……", str(fecha.day).zfill(2), 1)
        xml = xml.replace("……………………", meses[fecha.month - 1], 1)
        xml = xml.replace("…………", str(fecha.year), 1)
        
        # Agente
        xml = xml.replace(
            "…………………………………………………………………………………………, actuando como ",
            f"{datos.get('agente', {}).get('nombre', '')}, actuando como "
        )
        
        # ── Compradores ───────────────────────────────────────────────
        # Los labels "Nombre y Apellidos:", "DNI/NIE:", "Teléfono:" van seguidos de un 
        # párrafo vacío que rellenamos insertando texto después del label
        nombre1 = f"{c1.get('nombre','')} {c1.get('apellidos','')}".strip()
        nombre2 = f"{c2.get('nombre','')} {c2.get('apellidos','')}".strip()
        
        # Reemplazar los campos vacíos después de los labels
        # Los labels terminan en ":" y el valor va en el mismo párrafo o el siguiente run vacío
        # Usamos sustitución directa en el XML
        def after_label(xml, label, value):
            """Inserta value después del label en el mismo párrafo XML"""
            escaped_label = re.escape(label)
            # El label está en un <w:t> — añadir el valor en el run siguiente si está vacío
            pattern = r'(<w:t[^>]*>' + escaped_label + r'</w:t></w:r>)((?:<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>)\s*</w:t></w:r>)?'
            replacement = r'\1<w:r><w:t xml:space="preserve"> ' + value + r'</w:t></w:r>'
            return re.sub(pattern, replacement, xml, count=1)
        
        xml = after_label(xml, "Dirección:", datos.get("propiedad", {}).get("direccion", ""))
        xml = after_label(xml, "Referencia catastral:", datos.get("propiedad", {}).get("ref_catastral", ""))
        xml = after_label(xml, "Referencia Interna:", datos.get("propiedad", {}).get("ref_interna", ""))
        xml = after_label(xml, "Precio publicación:", f"{int(float(precio_pub)):,} €".replace(",", ".") if precio_pub else "")
        
        # Primer comprador
        xml = after_label(xml, "Nombre y Apellidos:", nombre1)
        xml = after_label(xml, "DNI/NIE:", c1.get("dni", ""))
        xml = after_label(xml, "Teléfono:", c1.get("telefono", ""))
        # Segundo comprador (segundo bloque)
        if nombre2:
            xml = after_label(xml, "Nombre y Apellidos:", nombre2)
            xml = after_label(xml, "DNI/NIE:", c2.get("dni", ""))
        
        # ── Precio oferta (solo en oferta/reserva) ───────────────────
        if tipo in ("oferta", "reserva", "contraoferta") and precio_of:
            precio_largo = fmt_precio_largo(precio_of)
            xml = xml.replace(
                "………………………………………………………………………………………………………………………… EUROS (…………………………………… €)",
                precio_largo
            )
        
        # ── Concepto bancario ─────────────────────────────────────────
        if tipo in ("oferta", "reserva", "contraoferta"):
            xml = xml.replace("Nombre completo del comprador", nombre1)
        
        # ── Condiciones particulares ──────────────────────────────────
        condiciones = datos.get("condiciones_particulares", "")
        if condiciones and "CONDICIONES PARTICULARES SOLICITADAS" in xml:
            # Insertar las condiciones después del título de sección
            xml = xml.replace(
                "CONDICIONES PARTICULARES SOLICITADAS POR LA PARTE COMPRADORA\n (VOLUNTARIO)",
                "CONDICIONES PARTICULARES SOLICITADAS POR LA PARTE COMPRADORA (VOLUNTARIO)\n" + condiciones
            )
        
        with open(doc_xml_path, "w", encoding="utf-8") as f:
            f.write(xml)
        
        # Reempaquetar docx
        out_docx = os.path.join(tmpdir, "out.docx")
        subprocess.run(
            f"cd {unpack_dir} && zip -Xr {out_docx} .",
            shell=True, check=True, capture_output=True
        )
        
        # Convertir a PDF con LibreOffice
        subprocess.run([
            "python3",
            str(Path(__file__).parent.parent.parent.parent.parent.parent / 
                "node_modules" / ".." / ".." / "mnp-crm" / ".." / ".." / 
                "/mnt/skills/public/docx/scripts/office/soffice.py"),
            "--headless", "--convert-to", "pdf", "--outdir", tmpdir, out_docx
        ], capture_output=True)
        
        out_pdf = os.path.join(tmpdir, "out.pdf")
        if os.path.exists(out_pdf):
            with open(out_pdf, "rb") as f:
                return f.read()
        
        # Si falla LibreOffice, devolver el docx como fallback
        with open(out_docx, "rb") as f:
            return f.read(), "docx"

if __name__ == "__main__":
    datos = json.loads(sys.argv[1])
    tipo = sys.argv[2]
    result = rellenar_docx(tipo, datos)
    sys.stdout.buffer.write(result)
