/**
 * Licenciatura en Ciencias de la Computación — Plan 2023 (Res. 850/2023 C.D.).
 * Code R-XYZ: X = año, Y = cuatrimestre del año. `term` is the absolute cuatrimestre (1–10).
 */
const PLAN: [string, number, number][] = [
  ['Álgebra y Geometría Analítica I', 1, 1],
  ['Análisis Matemático I', 1, 1],
  ['Programación I', 1, 1],
  ['Álgebra y Geometría Analítica II', 1, 2],
  ['Análisis Matemático II', 1, 2],
  ['Programación II', 1, 2],
  ['Álgebra Lineal', 2, 3],
  ['Estructuras de Datos y Algoritmos I', 2, 3],
  ['Lenguajes Formales y Computabilidad', 2, 3],
  ['Complementos de Matemática I', 2, 4],
  ['Arquitectura del Computador', 2, 4],
  ['Lógica', 2, 4],
  ['Métodos Numéricos', 2, 4],
  ['Probabilidad y Estadística', 3, 5],
  ['Estructuras de Datos y Algoritmos II', 3, 5],
  ['Sistemas Operativos I', 3, 5],
  ['Modelos Físicos', 3, 6],
  ['Análisis de Lenguajes de Programación', 3, 6],
  ['Comunicaciones', 3, 6],
  ['Teoría de Bases de Datos', 3, 6],
  ['Teoría de Base de Datos', 3, 6],
  ['Ingeniería de Software I', 4, 7],
  ['Sistemas Operativos II', 4, 7],
  ['Introducción a la Inteligencia Artificial', 4, 7],
  ['Ingeniería de Software II', 4, 8],
  ['Compiladores', 4, 8],
  ['Complementos de Matemática II', 4, 8],
  ['Seguridad Informática', 5, 9],
  ['Práctica Profesional', 5, 9],
  ['Taller de Tesina', 5, 9],
  ['Optativa I', 5, 9],
  ['Optativa II', 5, 9],
  ['Tesina', 5, 10],
  ['Optativa III', 5, 10],
]

export function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const BY_NAME = new Map(PLAN.map(([name, year, term]) => [normalizeName(name), { year, term }]))

/** Official year/term for a subject; subjects outside the plan (electivas) get null. */
export function planPlacement(name: string): { year: number | null; term: number | null } {
  return BY_NAME.get(normalizeName(name)) ?? { year: null, term: null }
}

/** 1 or 2 — cuatrimestre within the year. */
export function termInYear(term: number | null) {
  return term ? ((term - 1) % 2) + 1 : null
}
