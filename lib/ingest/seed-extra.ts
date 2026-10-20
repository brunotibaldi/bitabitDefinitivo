type BaseSeed = readonly [
  subjectId: number,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  difficulty: 1 | 2 | 3,
  topic: string,
]

type SequenceSeed = {
  subjectId: number
  prompt: string
  explanation: string
  difficulty: 1 | 2 | 3
  topic: string
  hint?: string
}

export type MatchSeed = SequenceSeed & { left: string[]; right: string[] }
export type OrderSeed = SequenceSeed & { steps: string[] }

// Only conceptual questions get hints; calculation questions stay hint-free on purpose.
export const SEED_HINTS: Record<string, string> = {
  'Toda función continua en un intervalo cerrado $[a,b]$ alcanza un máximo y un mínimo absolutos.':
    'Pensá en el teorema de Weierstrass y en por qué importa que el intervalo sea cerrado.',
  'Si $f$ es derivable en $a$, entonces $f$ es continua en $a$.':
    'Una función con un salto en $a$, ¿podría tener recta tangente ahí?',
  'La serie armónica $\\sum_{n=1}^{\\infty} \\frac{1}{n}$...': 'Compará con $\\int_1^\\infty \\frac{dx}{x}$.',
  'Altura de un árbol rojo-negro con $n$ nodos:':
    'Todos los caminos de la raíz a una hoja tienen la misma cantidad de nodos negros.',
  'En un árbol AVL, las alturas de los dos subárboles de cada nodo difieren en a lo sumo $1$.':
    'AVL es un árbol balanceado por alturas.',
  'El producto vectorial es conmutativo: $u \\times v = v \\times u$.':
    'Regla de la mano derecha: ¿qué pasa con el sentido si intercambiás los vectores?',
  'Si $u \\cdot v = 0$ con $u, v$ no nulos, entonces $u$ y $v$ son:': 'Recordá que $u \\cdot v = |u||v|\\cos\\theta$.',
  'En x86-64 (System V ABI), el primer argumento entero de una función se pasa en `%rdi`.':
    'Los registros de argumentos siguen el orden di, si, dx, cx...',
  'Acceder repetidamente a la misma variable dentro de un bucle es un ejemplo de localidad espacial.':
    'Espacial tiene que ver con el lugar; temporal, con el momento.',
  'Si $A$ es $3 \\times 3$ y $\\det(A) = 0$, entonces $A$ es invertible.':
    'Determinante nulo significa filas linealmente dependientes.',
  'Autovectores asociados a autovalores distintos son linealmente independientes.':
    'Es la razón por la que $n$ autovalores distintos garantizan que se pueda diagonalizar.',
  'En una red de flujo, el valor del flujo máximo es igual a la capacidad del corte mínimo.':
    'Es un teorema clásico cuyo nombre son justamente esos dos conceptos.',
  'Un grafo conexo tiene un circuito euleriano si y solo si todos sus vértices tienen grado par.':
    'Cada vez que entrás a un vértice, tenés que poder salir.',
  'Una relación de equivalencia es reflexiva, simétrica y transitiva.':
    'Compará con la definición de relación de orden.',
  'Todo lenguaje regular es libre de contexto.': 'Jerarquía de Chomsky: ¿qué clase contiene a cuál?',
  'El lenguaje $\\{a^n b^n : n \\ge 0\\}$ es:': 'Un autómata finito no puede contar sin límite.',
  'El problema de la parada (halting problem) es decidible.': 'Turing y el argumento de diagonalización.',
  'Los lenguajes regulares son cerrados bajo complemento.':
    'Con un AFD completo, ¿qué pasa si intercambiás estados finales y no finales?',
  '¿Qué clase de lenguajes reconocen los autómatas de pila (no deterministas)?':
    'La pila permite recordar anidamientos, como paréntesis balanceados.',
  'Para todo AFND existe un AFD que reconoce el mismo lenguaje.': 'Construcción por subconjuntos.',
  'En C, al pasar un arreglo a una función se copia el arreglo completo.':
    'Al pasarlo a una función, el arreglo decae a otro tipo.',
  'Una pila (stack) sigue la política:': 'Pensá en una pila de platos.',
  'En C, ¿qué hace `free(p)` con el puntero `p`?': '`free` recibe el puntero por valor.',
  'Orden de convergencia de Newton-Raphson para una raíz simple:':
    'Cerca de la raíz, la cantidad de dígitos correctos se duplica en cada paso.',
  'En aritmética de punto flotante, la suma es siempre asociativa.':
    'Pensá en el redondeo al sumar números de magnitudes muy distintas.',
  '$p \\to q$ es equivalente a:': '¿En qué único caso es falsa una implicación?',
  'El contrarrecíproco de $p \\to q$ es:': 'Se niegan ambas partes y se invierte el sentido.',
  'Si existen las derivadas parciales de $f$ en un punto, entonces $f$ es diferenciable en ese punto.':
    'Las derivadas parciales solo miran dos direcciones.',
  'Un deadlock requiere: exclusión mutua, retención y espera, no expropiación y espera circular.':
    'Son las condiciones de Coffman.',
  'Proteger una sección crítica con un mutex garantiza:': 'Mutex viene de mutual exclusion.',
  '¿Qué algoritmo de planificación puede causar inanición de procesos largos?':
    '¿Cuál de estos favorece siempre a los procesos cortos?',
  'Haskell usa evaluación perezosa (lazy) por defecto.': 'Pensá en listas infinitas como `[1..]`.',
  'Un requerimiento no funcional describe:': 'No es qué hace el sistema, sino cómo debe hacerlo.',
  '¿En qué capa del modelo OSI opera IP?': 'IP se encarga del ruteo entre redes.',
  'UDP garantiza la entrega ordenada de los paquetes.': 'UDP no usa números de secuencia ni ACKs.',
  'Una clave candidata es:': 'La palabra clave es minimal.',
  'En álgebra relacional, la selección $\\sigma$ elige:': '$\\sigma$ filtra y $\\pi$ proyecta.',
  'En búsqueda en árbol, A* es óptimo si la heurística es:': 'La heurística nunca debe sobreestimar.',
  'Una función recursiva necesita al menos un caso base para terminar.': '¿Cuándo se detendrían las llamadas?',
}

export const SEED_MATCH: MatchSeed[] = [
  {
    subjectId: 15,
    prompt: 'Uní cada algoritmo con su complejidad en el peor caso',
    left: ['Mergesort', 'Quicksort', 'Búsqueda binaria', 'Recorrer una lista'],
    right: ['$O(n \\log n)$', '$O(n^2)$', '$O(\\log n)$', '$O(n)$'],
    explanation: 'Quicksort cae a $O(n^2)$ con malos pivotes; mergesort es $O(n \\log n)$ siempre.',
    difficulty: 1,
    topic: 'Complejidad',
    hint: 'Solo uno de los ordenamientos puede degradarse con malos pivotes.',
  },
  {
    subjectId: 9,
    prompt: 'Uní cada clase de lenguajes con el autómata que la reconoce',
    left: ['Regulares', 'Libres de contexto', 'Recursivamente enumerables'],
    right: ['Autómata finito', 'Autómata de pila', 'Máquina de Turing'],
    explanation: 'Cada nivel de la jerarquía de Chomsky agrega memoria: nada, una pila, una cinta infinita.',
    difficulty: 1,
    topic: 'Jerarquía de Chomsky',
    hint: 'Cada clase necesita más memoria que la anterior.',
  },
  {
    subjectId: 20,
    prompt: 'Uní cada protocolo con su capa del modelo OSI',
    left: ['IP', 'TCP', 'Ethernet', 'HTTP'],
    right: ['Red', 'Transporte', 'Enlace', 'Aplicación'],
    explanation: 'Ethernet (2) entrega tramas, IP (3) rutea, TCP (4) da confiabilidad y HTTP (7) es de aplicación.',
    difficulty: 1,
    topic: 'Modelo OSI',
    hint: 'HTTP es lo que usa tu navegador; Ethernet es lo más cercano al cable.',
  },
  {
    subjectId: 12,
    prompt: 'Uní cada fórmula con su equivalente',
    left: ['$p \\to q$', '$\\neg(p \\land q)$', '$\\neg(p \\lor q)$'],
    right: ['$\\neg p \\lor q$', '$\\neg p \\lor \\neg q$', '$\\neg p \\land \\neg q$'],
    explanation: 'Las dos últimas son las leyes de De Morgan: negar intercambia $\\land$ y $\\lor$.',
    difficulty: 2,
    topic: 'Equivalencias',
    hint: 'De Morgan: al negar, $\\land$ y $\\lor$ se intercambian.',
  },
  {
    subjectId: 17,
    prompt: 'Uní cada llamada al sistema con lo que hace',
    left: ['`fork()`', '`exec()`', '`wait()`', '`exit()`'],
    right: ['Crea un proceso hijo', 'Reemplaza la imagen del proceso', 'Espera que termine un hijo', 'Termina el proceso actual'],
    explanation: 'El patrón clásico de una shell es `fork` + `exec` en el hijo y `wait` en el padre.',
    difficulty: 1,
    topic: 'Procesos',
    hint: 'Pensá en cómo una shell lanza un comando y espera a que termine.',
  },
  {
    subjectId: 18,
    prompt: 'Uní cada función de Haskell con su tipo',
    left: ['`map`', '`filter`', '`foldr`'],
    right: ['`(a -> b) -> [a] -> [b]`', '`(a -> Bool) -> [a] -> [a]`', '`(a -> b -> b) -> b -> [a] -> b`'],
    explanation: '`filter` usa un predicado, `map` transforma cada elemento y `foldr` reduce con un acumulador inicial.',
    difficulty: 2,
    topic: 'Tipos',
    hint: 'Solo una recibe un valor inicial además de la lista.',
  },
  {
    subjectId: 21,
    prompt: 'Uní cada forma normal con su condición',
    left: ['1FN', '2FN', '3FN'],
    right: ['Atributos atómicos', 'Sin dependencias parciales de la clave', 'Sin dependencias transitivas de la clave'],
    explanation: 'Cada forma normal exige la anterior y suma una restricción sobre las dependencias funcionales.',
    difficulty: 2,
    topic: 'Normalización',
    hint: 'Cada forma normal suma una restricción a la anterior.',
  },
  {
    subjectId: 6,
    prompt: 'Uní cada estructura con su política de salida',
    left: ['Pila', 'Cola', 'Cola de prioridad'],
    right: ['LIFO', 'FIFO', 'Sale el de mayor prioridad'],
    explanation: 'La pila saca el último que entró, la cola el primero y la cola de prioridad el más prioritario.',
    difficulty: 1,
    topic: 'Estructuras de datos',
    hint: 'Pensá en una pila de platos y en la fila de un banco.',
  },
  {
    subjectId: 2,
    prompt: 'Uní cada función con su derivada',
    left: ['$\\sin x$', '$e^x$', '$\\ln x$', '$x^n$'],
    right: ['$\\cos x$', '$e^x$', '$\\frac{1}{x}$', '$n x^{n-1}$'],
    explanation: 'Son las derivadas de la tabla básica; $e^x$ es la única función (no nula) igual a su derivada.',
    difficulty: 1,
    topic: 'Derivadas',
  },
]

export const SEED_ORDER: OrderSeed[] = [
  {
    subjectId: 20,
    prompt: 'Ordená las capas del modelo TCP/IP de abajo hacia arriba',
    steps: ['Enlace', 'Red', 'Transporte', 'Aplicación'],
    explanation: 'Cada capa usa los servicios de la de abajo: tramas, paquetes, segmentos y mensajes.',
    difficulty: 1,
    topic: 'Modelo TCP/IP',
    hint: 'Empezá por la más cercana al medio físico.',
  },
  {
    subjectId: 22,
    prompt: 'Ordená las fases del modelo en cascada',
    steps: ['Requisitos', 'Diseño', 'Implementación', 'Pruebas', 'Mantenimiento'],
    explanation: 'Es secuencial: cada fase empieza cuando termina la anterior.',
    difficulty: 1,
    topic: 'Procesos de desarrollo',
    hint: 'No podés probar algo que todavía no se implementó.',
  },
  {
    subjectId: 26,
    prompt: 'Ordená las fases de un compilador',
    steps: ['Análisis léxico', 'Análisis sintáctico', 'Análisis semántico', 'Código intermedio', 'Optimización', 'Generación de código'],
    explanation: 'Primero tokens, después el árbol, después tipos; luego se genera, optimiza y emite código.',
    difficulty: 2,
    topic: 'Fases',
    hint: 'Se arranca leyendo caracteres y se termina emitiendo instrucciones.',
  },
  {
    subjectId: 11,
    prompt: 'Ordená de la memoria más rápida a la más lenta',
    steps: ['Registros', 'Caché L1', 'Caché L2', 'RAM', 'Disco'],
    explanation: 'Cuanto más cerca del procesador, más rápida, más cara y más chica.',
    difficulty: 1,
    topic: 'Jerarquía de memoria',
    hint: 'Cuanto más cerca de la CPU, más rápida.',
  },
  {
    subjectId: 15,
    prompt: 'Ordená de menor a mayor crecimiento',
    steps: ['$O(1)$', '$O(\\log n)$', '$O(n)$', '$O(n \\log n)$', '$O(n^2)$'],
    explanation: 'Para $n$ grande: constante < logarítmica < lineal < $n \\log n$ < cuadrática.',
    difficulty: 1,
    topic: 'Complejidad',
  },
]

function shuffledIndices(n: number, salt: number) {
  const idx = Array.from({ length: n }, (_, i) => i)
  let s = salt * 2654435761 + 1
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  if (idx.every((v, i) => v === i)) idx.push(idx.shift()!)
  return idx
}

export function buildSeedRows(base: readonly BaseSeed[]) {
  const rows = base.map(([subjectId, prompt, options, correctIndex, explanation, difficulty, topic]) => ({
    subjectId,
    type: options.length === 2 && options[0] === 'Verdadero' ? ('true_false' as const) : ('mcq' as const),
    prompt,
    options,
    correctIndex,
    explanation,
    difficulty,
    topic,
    hint: (SEED_HINTS[prompt] ?? null) as string | null,
    context: null as { left: string[] } | null,
    answerOrder: null as number[] | null,
  }))

  SEED_MATCH.forEach((m, k) => {
    // options[slot] = right[perm[slot]]; answerOrder[i] is the slot holding the pair of left[i].
    const perm = shuffledIndices(m.right.length, k + 7)
    const options = perm.map((r) => m.right[r])
    const answerOrder = m.left.map((_, i) => perm.indexOf(i))
    rows.push({
      subjectId: m.subjectId,
      type: 'match' as never,
      prompt: m.prompt,
      options,
      correctIndex: 0,
      explanation: m.explanation,
      difficulty: m.difficulty,
      topic: m.topic,
      hint: m.hint ?? null,
      context: { left: m.left },
      answerOrder,
    })
  })

  SEED_ORDER.forEach((o, k) => {
    const perm = shuffledIndices(o.steps.length, k + 31)
    const options = perm.map((s) => o.steps[s])
    const answerOrder = o.steps.map((_, i) => perm.indexOf(i))
    rows.push({
      subjectId: o.subjectId,
      type: 'order' as never,
      prompt: o.prompt,
      options,
      correctIndex: 0,
      explanation: o.explanation,
      difficulty: o.difficulty,
      topic: o.topic,
      hint: o.hint ?? null,
      context: null,
      answerOrder,
    })
  })

  return rows
}
