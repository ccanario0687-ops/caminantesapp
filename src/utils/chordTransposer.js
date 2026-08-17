/**
 * Helper de teoría musical para transposición dinámica de acordes
 */

const NOTAS_SOLFEO = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const NOTAS_ANGLO = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const MAPA_EQUIVALENCIAS = {
  "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#",
  "do": "Do", "re": "Re", "mi": "Mi", "fa": "Fa", "sol": "Sol", "la": "La", "si": "Si"
};

export function transponerAcorde(acorde, semitonos) {
  if (!acorde || semitonos === 0) return acorde;

  // Normalizar nota base
  let textoAcorde = acorde.trim();
  let esSolfeo = false;

  // Detectar raíz de solfeo
  for (let s of NOTAS_SOLFEO) {
    if (textoAcorde.startsWith(s)) {
      esSolfeo = true;
      break;
    }
  }

  const notasBase = esSolfeo ? NOTAS_SOLFEO : NOTAS_ANGLO;

  // Extraer la nota raíz y sufijo (ej: "Dom7" -> raiz: "Do", sufijo: "m7")
  let raizEncontrada = null;
  let sufijo = "";

  for (let n of [...notasBase].sort((a, b) => b.length - a.length)) {
    if (textoAcorde.startsWith(n)) {
      raizEncontrada = n;
      sufijo = textoAcorde.slice(n.length);
      break;
    }
  }

  if (!raizEncontrada) return acorde;

  let idx = notasBase.indexOf(raizEncontrada);
  if (idx === -1) return acorde;

  let nuevoIdx = (idx + semitonos) % 12;
  if (nuevoIdx < 0) nuevoIdx += 12;

  return notasBase[nuevoIdx] + sufijo;
}

export function transponerTextoCancion(texto, semitonos) {
  if (!texto || semitonos === 0) return texto;

  // Reemplazar los acordes encerrados entre corchetes [Do] o formato de línea de acordes
  return texto.replace(/\[([A-G][b#]?[a-zA-Z0-9\/*+]*|Do|Do#|Re|Re#|Mi|Fa|Fa#|Sol|Sol#|La|La#|Si[a-zA-Z0-9\/*+]*)\]/g, (match, p1) => {
    const acordeTranspuesto = transponerAcorde(p1, semitonos);
    return `[${acordeTranspuesto}]`;
  });
}
