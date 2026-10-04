import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { descripcionCertificado, fechaCertificado } from "./formato";
import type { CertificadoPublico } from "./servicio";

const VIOLETA = "#7c3aed";
const TEXTO = "#18181b";
const SUAVE = "#52525b";

const estilos = StyleSheet.create({
  pagina: { padding: 36, backgroundColor: "#ffffff", color: TEXTO, fontFamily: "Helvetica" },
  marco: {
    flexGrow: 1,
    borderWidth: 2,
    borderColor: VIOLETA,
    borderRadius: 6,
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  marca: { fontFamily: "Courier-Bold", fontSize: 12, letterSpacing: 2, color: VIOLETA, textTransform: "uppercase" },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 44, marginTop: 8 },
  descripcion: { fontSize: 13, color: SUAVE, marginTop: 6 },
  etiqueta: { fontFamily: "Helvetica-Bold", fontSize: 10, color: SUAVE, textTransform: "uppercase", marginTop: 32 },
  nombre: { fontFamily: "Helvetica-Bold", fontSize: 34, marginTop: 8, textAlign: "center" },
  porCompletar: { fontSize: 12, color: SUAVE, marginTop: 26 },
  materia: { fontFamily: "Helvetica-Bold", fontSize: 20, marginTop: 6, textAlign: "center" },
  cargo: { fontSize: 12, color: SUAVE, marginTop: 4 },
  pie: { marginTop: 34, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e4e4e7", alignItems: "center" },
  dato: { fontSize: 10, color: SUAVE, marginTop: 3 },
  codigo: { fontFamily: "Courier-Bold", color: TEXTO },
});

export async function generarCertificadoPdf(certificado: CertificadoPublico, sitio: string): Promise<Buffer> {
  const verificacion = `${sitio.replace(/\/$/, "")}/verificar/${certificado.codigo}`;
  return renderToBuffer(
    <Document
      title={`Certificado ${certificado.codigo}`}
      subject={`Verifica este certificado en ${verificacion}`}
      author="syntaxError.cl"
      creator="syntaxError.cl"
      language="es-CL"
    >
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.marco}>
          <Text style={estilos.marca}>syntaxError.cl</Text>
          <Text style={estilos.titulo}>Certificado</Text>
          <Text style={estilos.descripcion}>{descripcionCertificado(certificado)}</Text>
          <Text style={estilos.etiqueta}>Otorgado a</Text>
          <Text style={estilos.nombre}>{certificado.nombreAlumno}</Text>
          <Text style={estilos.porCompletar}>Por completar</Text>
          <Text style={estilos.materia}>{certificado.titulo}</Text>
          {certificado.cargo ? <Text style={estilos.cargo}>{certificado.cargo}</Text> : null}
          <View style={estilos.pie}>
            <Text style={estilos.dato}>{`Emitido el ${fechaCertificado(certificado.emitidoEn)}`}</Text>
            <Text style={estilos.dato}>
              Código de verificación: <Text style={estilos.codigo}>{certificado.codigo}</Text>
            </Text>
            <Text style={estilos.dato}>{`Verifícalo en ${verificacion}`}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
