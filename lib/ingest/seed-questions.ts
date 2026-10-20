type Seed = [
  subjectId: number,
  prompt: string,
  options: string[],
  correctIndex: number,
  explanation: string,
  difficulty: 1 | 2 | 3,
  topic: string,
]

const VF = ['Verdadero', 'Falso']

export const SEED_QUESTIONS: Seed[] = [
  // Análisis Matemático I
  [2, '¿Cuánto vale $\\lim_{x \\to 0} \\frac{\\sin x}{x}$?', ['$0$', '$1$', '$\\infty$', 'No existe'], 1, 'Es el límite notable trigonométrico: por el teorema del sándwich con $\\cos x \\le \\frac{\\sin x}{x} \\le 1$, tiende a $1$.', 1, 'Límites'],
  [2, 'La derivada de $f(x) = x^x$ (con $x > 0$) es:', ['$x \\cdot x^{x-1}$', '$x^x(\\ln x + 1)$', '$x^x \\ln x$', '$\\ln x + 1$'], 1, 'Escribimos $x^x = e^{x \\ln x}$ y derivamos con la regla de la cadena: $e^{x\\ln x}(\\ln x + 1)$.', 2, 'Derivadas'],
  [2, 'Toda función continua en un intervalo cerrado $[a,b]$ alcanza un máximo y un mínimo absolutos.', VF, 0, 'Es el teorema de Weierstrass. Requiere intervalo cerrado y acotado: en $(0,1)$ la función $1/x$ no tiene máximo.', 1, 'Continuidad'],
  [2, 'Si $f$ es derivable en $a$, entonces $f$ es continua en $a$.', VF, 0, 'Derivable implica continua. La recíproca es falsa: $|x|$ es continua en $0$ pero no derivable.', 1, 'Derivadas'],
  [2, '¿Cuánto vale $\\int_0^1 2x\\,dx$?', ['$\\frac{1}{2}$', '$1$', '$2$', '$0$'], 1, 'Una primitiva es $x^2$, y por Barrow $1^2 - 0^2 = 1$.', 1, 'Integrales'],
  [2, 'La serie armónica $\\sum_{n=1}^{\\infty} \\frac{1}{n}$...', ['Converge a $1$', 'Converge a $e$', 'Diverge', 'Converge a $\\frac{\\pi^2}{6}$'], 2, 'Diverge (criterio de la integral: $\\int_1^\\infty \\frac{dx}{x} = \\infty$). La que converge a $\\frac{\\pi^2}{6}$ es $\\sum \\frac{1}{n^2}$.', 1, 'Series'],
  [2, '¿Cuánto vale $\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x$?', ['$1$', '$e$', '$\\infty$', '$0$'], 1, 'Es la definición clásica del número $e$. La forma $1^\\infty$ es indeterminada, no vale $1$.', 1, 'Límites'],

  // Estructuras de Datos y Algoritmos II
  [15, 'Complejidad de mergesort en el peor caso:', ['$O(n)$', '$O(n \\log n)$', '$O(n^2)$', '$O(\\log n)$'], 1, 'Divide en mitades ($\\log n$ niveles) y en cada nivel hace merge en $O(n)$: total $O(n \\log n)$, en cualquier caso.', 1, 'Ordenamiento'],
  [15, 'Si $T(n) = 2T(n/2) + n$, entonces $T(n)$ es:', ['$\\Theta(n)$', '$\\Theta(n \\log n)$', '$\\Theta(n^2)$', '$\\Theta(\\log n)$'], 1, 'Teorema maestro con $a=2$, $b=2$: $n^{\\log_2 2} = n$, igual que $f(n)$. Caso 2: $\\Theta(n \\log n)$.', 2, 'Recurrencias'],
  [15, 'Si $T(n) = T(n/2) + 1$, entonces $T(n)$ es:', ['$\\Theta(1)$', '$\\Theta(\\log n)$', '$\\Theta(n)$', '$\\Theta(n \\log n)$'], 1, 'Cada paso reduce a la mitad con costo constante, como búsqueda binaria: $\\log_2 n$ pasos.', 1, 'Recurrencias'],
  [15, 'Altura de un árbol rojo-negro con $n$ nodos:', ['$O(n)$', '$O(\\log n)$', '$O(\\sqrt{n})$', '$O(1)$'], 1, 'La propiedad de igual cantidad de nodos negros por camino garantiza altura $\\le 2\\log_2(n+1)$.', 1, 'Árboles balanceados'],
  [15, 'En un árbol AVL, las alturas de los dos subárboles de cada nodo difieren en a lo sumo $1$.', VF, 0, 'Es exactamente el invariante de balance de los AVL. Se restaura con rotaciones tras insertar o borrar.', 1, 'Árboles balanceados'],
  [15, 'Span (profundidad) de un `reduce` paralelo sobre $n$ elementos con operación $O(1)$:', ['$O(n)$', '$O(\\log n)$', '$O(1)$', '$O(n \\log n)$'], 1, 'Se combina en forma de árbol balanceado: $\\log n$ niveles de profundidad, aunque el trabajo total sea $O(n)$.', 2, 'Paralelismo'],
  [15, 'Costo de `merge` entre dos leftist heaps de tamaño $n$:', ['$O(1)$', '$O(\\log n)$', '$O(n)$', '$O(n \\log n)$'], 1, 'El merge recorre solo las espinas derechas, que tienen longitud $O(\\log n)$ por el invariante de rango.', 2, 'Heaps'],
  [15, 'Insertar un elemento en un min-heap binario de $n$ elementos cuesta:', ['$O(1)$', '$O(\\log n)$', '$O(n)$', '$O(n \\log n)$'], 1, 'Se agrega al final y se hace "flotar" hacia arriba: a lo sumo la altura del árbol, $O(\\log n)$.', 1, 'Heaps'],

  // Álgebra y Geometría Analítica I
  [1, 'El módulo de $z = 3 + 4i$ es:', ['$5$', '$7$', '$25$', '$\\sqrt{7}$'], 0, '$|z| = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.', 1, 'Complejos'],
  [1, 'El producto vectorial es conmutativo: $u \\times v = v \\times u$.', VF, 1, 'Es anticonmutativo: $u \\times v = -(v \\times u)$.', 1, 'Vectores'],
  [1, '¿Cuánto vale $(1,2,3) \\cdot (4,-5,6)$?', ['$12$', '$32$', '$-12$', '$0$'], 0, '$1\\cdot4 + 2\\cdot(-5) + 3\\cdot6 = 4 - 10 + 18 = 12$.', 1, 'Producto escalar'],
  [1, '¿Cuántas raíces cuartas complejas tiene $1$?', ['$1$', '$2$', '$4$', 'Infinitas'], 2, 'Todo complejo no nulo tiene exactamente $n$ raíces $n$-ésimas. Acá: $1, i, -1, -i$.', 1, 'Complejos'],
  [1, 'Un vector normal al plano $2x - y + 3z = 7$ es:', ['$(2,-1,3)$', '$(2,1,3)$', '$(7,0,0)$', '$(-1,3,7)$'], 0, 'En $ax + by + cz = d$, el vector $(a,b,c)$ es normal al plano.', 1, 'Planos'],
  [1, 'Si $u \\cdot v = 0$ con $u, v$ no nulos, entonces $u$ y $v$ son:', ['Paralelos', 'Perpendiculares', 'Iguales', 'Opuestos'], 1, 'El producto escalar es $|u||v|\\cos\\theta$; si es $0$ con vectores no nulos, $\\theta = 90°$.', 1, 'Producto escalar'],

  // Arquitectura del Computador
  [11, '$-1$ en complemento a 2 con 8 bits es:', ['`10000001`', '`11111111`', '`11111110`', '`01111111`'], 1, 'Se invierte `00000001` → `11111110` y se suma 1 → `11111111`.', 1, 'Complemento a 2'],
  [11, 'Rango de enteros con signo de 8 bits en complemento a 2:', ['$[-127, 127]$', '$[-128, 127]$', '$[0, 255]$', '$[-128, 128]$'], 1, 'Con $n$ bits el rango es $[-2^{n-1}, 2^{n-1}-1]$. Hay un negativo más que positivos porque el 0 usa el bit de signo en 0.', 1, 'Complemento a 2'],
  [11, '`0x1F` en decimal es:', ['$31$', '$15$', '$16$', '$32$'], 0, '$1 \\cdot 16 + 15 = 31$.', 1, 'Bases numéricas'],
  [11, 'En x86-64 (System V ABI), el primer argumento entero de una función se pasa en `%rdi`.', VF, 0, 'El orden es `%rdi`, `%rsi`, `%rdx`, `%rcx`, `%r8`, `%r9`. El valor de retorno va en `%rax`.', 2, 'Convención de llamadas'],
  [11, 'Acceder repetidamente a la misma variable dentro de un bucle es un ejemplo de localidad espacial.', VF, 1, 'Es localidad temporal (mismo dato, en el tiempo). La espacial es acceder a direcciones cercanas, como recorrer un arreglo.', 1, 'Memoria caché'],
  [11, '¿Cuántos bits de exponente tiene un float IEEE 754 de precisión simple?', ['$8$', '$11$', '$23$', '$7$'], 0, '32 bits = 1 de signo + 8 de exponente + 23 de mantisa. En doble precisión el exponente tiene 11.', 1, 'Punto flotante'],

  // Álgebra Lineal
  [7, 'Si $A$ es $3 \\times 3$ y $\\det(A) = 0$, entonces $A$ es invertible.', VF, 1, 'Una matriz cuadrada es invertible si y solo si su determinante es distinto de $0$.', 1, 'Determinantes'],
  [7, 'Si $A$ es $3 \\times 3$ y $\\det(A) = 5$, ¿cuánto vale $\\det(2A)$?', ['$10$', '$40$', '$30$', '$5$'], 1, 'Cada una de las 3 filas se multiplica por 2: $\\det(2A) = 2^3 \\det(A) = 40$.', 2, 'Determinantes'],
  [7, 'Una transformación lineal $T: \\mathbb{R}^5 \\to \\mathbb{R}^3$ con rango $3$ tiene núcleo de dimensión:', ['$2$', '$3$', '$5$', '$0$'], 0, 'Teorema de la dimensión: $\\dim \\ker T + \\operatorname{rg} T = 5$, así que $\\dim \\ker T = 2$.', 2, 'Transformaciones lineales'],
  [7, 'Los autovalores de $\\begin{pmatrix} 2 & 0 \\\\ 0 & 3 \\end{pmatrix}$ son:', ['$2$ y $3$', '$0$ y $5$', 'Solo $6$', '$1$ y $6$'], 0, 'En una matriz diagonal (o triangular) los autovalores son los elementos de la diagonal.', 1, 'Autovalores'],
  [7, 'Autovectores asociados a autovalores distintos son linealmente independientes.', VF, 0, 'Es un resultado clásico; por eso una matriz $n \\times n$ con $n$ autovalores distintos es diagonalizable.', 2, 'Autovalores'],

  // Complementos de Matemática II
  [27, 'En un grafo con $m$ aristas, la suma de los grados de todos los vértices es:', ['$m$', '$2m$', '$m^2$', '$m/2$'], 1, 'Lema del apretón de manos: cada arista aporta 1 al grado de cada uno de sus dos extremos.', 1, 'Grafos'],
  [27, '¿Cuántas aristas tiene un árbol con $n$ vértices?', ['$n$', '$n-1$', '$n+1$', '$2n$'], 1, 'Todo árbol (conexo y acíclico) con $n$ vértices tiene exactamente $n-1$ aristas.', 1, 'Árboles'],
  [27, 'En una red de flujo, el valor del flujo máximo es igual a la capacidad del corte mínimo.', VF, 0, 'Es el teorema max-flow min-cut, que justifica la corrección de Ford-Fulkerson.', 1, 'Flujo en redes'],
  [27, '¿Cuántas aristas tiene el grafo completo $K_n$?', ['$\\frac{n(n-1)}{2}$', '$n^2$', '$n-1$', '$2^n$'], 0, 'Cada par de vértices distintos está unido: $\\binom{n}{2} = \\frac{n(n-1)}{2}$.', 1, 'Grafos'],
  [27, 'Un grafo conexo tiene un circuito euleriano si y solo si todos sus vértices tienen grado par.', VF, 0, 'Teorema de Euler. Si exactamente dos vértices tienen grado impar, hay un camino (no circuito) euleriano.', 2, 'Grafos eulerianos'],
  [27, 'En Ford-Fulkerson con capacidades enteras, el flujo máximo obtenido es entero.', VF, 0, 'Cada camino de aumento suma un valor entero (el mínimo residual), así que el flujo se mantiene entero.', 2, 'Flujo en redes'],

  // Complementos de Matemática I
  [10, '¿Cuántos subconjuntos tiene un conjunto de $5$ elementos?', ['$5$', '$10$', '$25$', '$32$'], 3, 'Cada elemento está o no está: $2^5 = 32$ subconjuntos (incluyendo $\\emptyset$ y el total).', 1, 'Conjuntos'],
  [10, '¿Cuánto vale $\\binom{5}{2}$?', ['$10$', '$20$', '$25$', '$5$'], 0, '$\\binom{5}{2} = \\frac{5 \\cdot 4}{2} = 10$.', 1, 'Combinatoria'],
  [10, 'Una relación de equivalencia es reflexiva, simétrica y transitiva.', VF, 0, 'Esa es la definición. Si en vez de simétrica fuera antisimétrica, sería una relación de orden.', 1, 'Relaciones'],
  [10, '$\\operatorname{mcd}(84, 36)$ es:', ['$6$', '$12$', '$4$', '$18$'], 1, '$84 = 2^2 \\cdot 3 \\cdot 7$ y $36 = 2^2 \\cdot 3^2$. Factores comunes: $2^2 \\cdot 3 = 12$.', 1, 'Divisibilidad'],
  [10, '¿Cuánto es $17 \\bmod 5$?', ['$2$', '$3$', '$1$', '$4$'], 0, '$17 = 3 \\cdot 5 + 2$, el resto es $2$.', 1, 'Aritmética modular'],
  [10, '¿De cuántas formas se pueden ordenar $4$ libros distintos en un estante?', ['$4$', '$16$', '$24$', '$12$'], 2, 'Son permutaciones: $4! = 24$.', 1, 'Combinatoria'],

  // Lenguajes Formales y Computabilidad
  [9, 'Todo lenguaje regular es libre de contexto.', VF, 0, 'Toda gramática regular es libre de contexto. La inclusión es estricta en la jerarquía de Chomsky.', 1, 'Jerarquía de Chomsky'],
  [9, 'El lenguaje $\\{a^n b^n : n \\ge 0\\}$ es:', ['Regular', 'Libre de contexto pero no regular', 'No recursivamente enumerable', 'Finito'], 1, 'No es regular (lema de bombeo), pero lo genera $S \\to aSb \\mid \\varepsilon$.', 2, 'Lenguajes libres de contexto'],
  [9, 'El problema de la parada (halting problem) es decidible.', VF, 1, 'Turing probó por diagonalización que no existe una MT que lo decida. Sí es semidecidible.', 1, 'Decidibilidad'],
  [9, 'Los lenguajes regulares son cerrados bajo complemento.', VF, 0, 'Dado un AFD completo, intercambiando estados finales y no finales se obtiene un AFD del complemento.', 1, 'Lenguajes regulares'],
  [9, '¿Qué clase de lenguajes reconocen los autómatas de pila (no deterministas)?', ['Regulares', 'Libres de contexto', 'Recursivos', 'Todos'], 1, 'Los AP no deterministas son equivalentes a las gramáticas libres de contexto.', 1, 'Autómatas de pila'],
  [9, 'Para todo AFND existe un AFD que reconoce el mismo lenguaje.', VF, 0, 'Construcción por subconjuntos: el AFD puede tener hasta $2^n$ estados, pero reconoce lo mismo.', 1, 'Autómatas finitos'],

  // Programación II
  [6, 'En C, `sizeof(char)` vale:', ['$1$', '$2$', '$4$', 'Depende del compilador'], 0, 'El estándar de C define `sizeof(char)` como exactamente 1.', 1, 'Tipos en C'],
  [6, 'Búsqueda binaria en un arreglo ordenado de $n$ elementos cuesta:', ['$O(1)$', '$O(\\log n)$', '$O(n)$', '$O(n \\log n)$'], 1, 'En cada paso se descarta la mitad del rango restante.', 1, 'Búsqueda'],
  [6, 'En C, al pasar un arreglo a una función se copia el arreglo completo.', VF, 1, 'El arreglo decae a un puntero a su primer elemento; la función puede modificar el original.', 2, 'Punteros'],
  [6, 'Una pila (stack) sigue la política:', ['FIFO', 'LIFO', 'Por prioridad', 'Aleatoria'], 1, 'Last In, First Out: el último en entrar es el primero en salir. Una cola es FIFO.', 1, 'Estructuras de datos'],
  [6, 'En C, ¿qué hace `free(p)` con el puntero `p`?', ['Lo pone en `NULL`', 'Libera la memoria apuntada, `p` sigue con la misma dirección', 'Borra la variable `p`', 'Nada si `p` es local'], 1, '`free` libera el bloque, pero `p` queda "colgante". Por eso se suele hacer `p = NULL` después.', 2, 'Memoria dinámica'],

  // Métodos Numéricos
  [13, 'Orden de convergencia de Newton-Raphson para una raíz simple:', ['Lineal', 'Cuadrático', 'Cúbico', '$\\approx 1.618$'], 1, 'Cerca de una raíz simple, el error se eleva al cuadrado en cada paso. $1.618$ es el de la secante.', 1, 'Raíces'],
  [13, 'Bisección converge siempre si $f$ es continua en $[a,b]$ y $f(a)f(b) < 0$.', VF, 0, 'Por Bolzano hay una raíz en el intervalo, y cada paso lo reduce a la mitad.', 1, 'Raíces'],
  [13, 'La regla del trapecio simple es exacta para polinomios de grado a lo sumo:', ['$0$', '$1$', '$2$', '$3$'], 1, 'Aproxima con una recta, así que integra exactamente polinomios de grado $\\le 1$. Simpson llega a grado 3.', 2, 'Integración numérica'],
  [13, 'Con $n+1$ puntos de abscisas distintas, el polinomio interpolante único tiene grado a lo sumo:', ['$n-1$', '$n$', '$n+1$', '$2n$'], 1, 'Hay $n+1$ condiciones y un polinomio de grado $\\le n$ tiene $n+1$ coeficientes.', 1, 'Interpolación'],
  [13, 'En aritmética de punto flotante, la suma es siempre asociativa.', VF, 1, 'Por el redondeo, $(a+b)+c$ puede diferir de $a+(b+c)$. Ejemplo: $(10^{20} - 10^{20}) + 1 \\ne 10^{20} + (-10^{20} + 1)$.', 2, 'Errores'],

  // Lógica
  [12, '$p \\to q$ es equivalente a:', ['$\\neg p \\lor q$', '$p \\lor \\neg q$', '$\\neg q \\to p$', '$q \\to p$'], 0, 'La implicación solo es falsa cuando $p$ es V y $q$ es F, igual que $\\neg p \\lor q$.', 1, 'Equivalencias'],
  [12, '$(p \\land q) \\to p$ es una tautología.', VF, 0, 'Si $p \\land q$ es verdadera, $p$ es verdadera. Corresponde a la regla de eliminación de $\\land$.', 1, 'Tautologías'],
  [12, 'El contrarrecíproco de $p \\to q$ es:', ['$q \\to p$', '$\\neg p \\to \\neg q$', '$\\neg q \\to \\neg p$', '$\\neg(p \\to q)$'], 2, 'El contrarrecíproco $\\neg q \\to \\neg p$ es equivalente a la original. $q \\to p$ es el recíproco, que no lo es.', 1, 'Equivalencias'],
  [12, '¿Cuántas filas tiene la tabla de verdad de una fórmula con $4$ variables?', ['$8$', '$16$', '$4$', '$32$'], 1, 'Cada variable toma 2 valores: $2^4 = 16$ filas.', 1, 'Tablas de verdad'],
  [12, 'En deducción natural, de $\\bot$ se puede derivar cualquier fórmula.', VF, 0, 'Es la regla de eliminación del absurdo ($\\bot E$, ex falso quodlibet).', 2, 'Deducción natural'],

  // Análisis Matemático II
  [5, 'El gradiente de $f(x,y) = x^2 y$ es:', ['$(2xy,\\ x^2)$', '$(2x,\\ 1)$', '$(x^2,\\ 2xy)$', '$(2xy,\\ 2x)$'], 0, '$f_x = 2xy$ (con $y$ constante) y $f_y = x^2$ (con $x$ constante).', 1, 'Derivadas parciales'],
  [5, 'Si existen las derivadas parciales de $f$ en un punto, entonces $f$ es diferenciable en ese punto.', VF, 1, 'Falso: pueden existir y $f$ ni siquiera ser continua. Hace falta, por ejemplo, que sean continuas en un entorno.', 2, 'Diferenciabilidad'],
  [5, '¿Cuánto vale $\\int_0^1 \\int_0^1 xy \\, dx \\, dy$?', ['$\\frac{1}{2}$', '$\\frac{1}{4}$', '$1$', '$\\frac{1}{8}$'], 1, 'Se separa: $\\left(\\int_0^1 x\\,dx\\right)\\left(\\int_0^1 y\\,dy\\right) = \\frac{1}{2} \\cdot \\frac{1}{2} = \\frac{1}{4}$.', 2, 'Integrales dobles'],

  // Sistemas Operativos II
  [23, 'Un deadlock requiere: exclusión mutua, retención y espera, no expropiación y espera circular.', VF, 0, 'Son las 4 condiciones de Coffman. Romper cualquiera de ellas previene el deadlock.', 1, 'Deadlock'],
  [23, 'Proteger una sección crítica con un mutex garantiza:', ['Exclusión mutua', 'Ausencia de inanición siempre', 'Orden FIFO de entrada', 'Más paralelismo'], 0, 'Solo un hilo a la vez dentro de la sección. La equidad o el orden dependen de la implementación.', 1, 'Concurrencia'],
  [23, 'Una condición de carrera ocurre cuando el resultado depende del orden de ejecución de los hilos.', VF, 0, 'Ejemplo típico: dos hilos haciendo `x++` sin sincronización pueden perder un incremento.', 1, 'Concurrencia'],

  // Sistemas Operativos I
  [17, '¿Qué algoritmo de planificación puede causar inanición de procesos largos?', ['Round Robin', 'SJF (trabajo más corto primero)', 'FCFS', 'Ninguno'], 1, 'Si siguen llegando procesos cortos, SJF posterga indefinidamente a los largos. Se mitiga con envejecimiento (aging).', 1, 'Planificación'],
  [17, 'En Unix, `fork()` devuelve $0$ en el proceso hijo.', VF, 0, 'En el hijo devuelve $0$; en el padre, el PID del hijo; y $-1$ si falla.', 1, 'Procesos'],
  [17, 'La memoria virtual permite que un proceso use más memoria que la RAM física disponible.', VF, 0, 'Con paginación por demanda, las páginas que no entran se guardan en disco (swap).', 1, 'Memoria virtual'],

  // Análisis de Lenguajes de Programación
  [18, '$(\\lambda x.\\, x\\, x)(\\lambda y.\\, y)$ se reduce a:', ['$\\lambda y.\\, y$', '$x$', '$\\lambda x.\\, x\\, x$', 'No termina'], 0, 'Beta: $(\\lambda y.y)(\\lambda y.y)$, y otra beta: $\\lambda y.y$. (No confundir con $\\Omega = (\\lambda x.xx)(\\lambda x.xx)$.)', 2, 'Cálculo lambda'],
  [18, 'Haskell usa evaluación perezosa (lazy) por defecto.', VF, 0, 'Las expresiones se evalúan recién cuando se necesitan; por eso se pueden usar listas infinitas como `[1..]`.', 1, 'Evaluación'],
  [18, 'El tipo de `map` en Haskell es:', ['`(a -> b) -> [a] -> [b]`', '`[a] -> (a -> b) -> [b]`', '`(a -> b) -> a -> b`', '`[a] -> [b]`'], 0, 'Recibe primero la función y después la lista. Así `map f` queda parcialmente aplicada.', 1, 'Tipos'],
  [18, 'En Haskell, `Maybe` es una instancia de `Monad`.', VF, 0, '`return = Just` y `>>=` propaga `Nothing`: modela cómputos que pueden fallar.', 2, 'Mónadas'],

  // Ingeniería de Software I
  [22, 'En el modelo en cascada, cada fase empieza cuando termina la anterior.', VF, 0, 'Es secuencial: requisitos → diseño → implementación → pruebas → mantenimiento.', 1, 'Procesos de desarrollo'],
  [22, 'Un requerimiento no funcional describe:', ['Qué hace el sistema', 'Cualidades o restricciones (rendimiento, seguridad...)', 'El código fuente', 'Los casos de prueba'], 1, 'Los funcionales dicen qué hace el sistema; los no funcionales, cómo debe comportarse o bajo qué restricciones.', 1, 'Requerimientos'],

  // Comunicaciones
  [20, '¿En qué capa del modelo OSI opera IP?', ['Enlace', 'Red', 'Transporte', 'Aplicación'], 1, 'IP es de capa 3 (red): direccionamiento y ruteo. TCP y UDP son de capa 4 (transporte).', 1, 'Modelo OSI'],
  [20, 'UDP garantiza la entrega ordenada de los paquetes.', VF, 1, 'UDP no garantiza entrega ni orden. Eso lo provee TCP con números de secuencia y ACKs.', 1, 'Transporte'],
  [20, '¿Cuántas direcciones IPv4 tiene una subred `/24`?', ['$24$', '$256$', '$254$', '$65536$'], 1, 'Quedan $32 - 24 = 8$ bits de host: $2^8 = 256$ direcciones (254 asignables a hosts).', 2, 'Direccionamiento IP'],

  // Teoría de Base de Datos
  [21, 'Una clave candidata es:', ['Una superclave minimal', 'Cualquier atributo', 'Una clave foránea', 'Un índice'], 0, 'Identifica unívocamente cada tupla y ningún subconjunto propio suyo lo hace.', 1, 'Claves'],
  [21, 'Toda relación en 3FN está también en 2FN.', VF, 0, 'Las formas normales se incluyen: BCNF ⊂ 3FN ⊂ 2FN ⊂ 1FN.', 1, 'Normalización'],
  [21, 'En álgebra relacional, la selección $\\sigma$ elige:', ['Columnas', 'Filas que cumplen una condición', 'Tablas', 'Índices'], 1, '$\\sigma$ filtra tuplas (filas); la proyección $\\pi$ elige atributos (columnas).', 1, 'Álgebra relacional'],

  // Introducción a la Inteligencia Artificial
  [24, 'En búsqueda en árbol, A* es óptimo si la heurística es:', ['Admisible', 'Mayor al costo real', 'Negativa', 'Aleatoria'], 0, 'Admisible = nunca sobreestima el costo real a la meta. Para búsqueda en grafo se pide además consistencia.', 2, 'Búsqueda heurística'],
  [24, 'BFS (búsqueda en anchura) encuentra la solución con menos pasos si todas las acciones cuestan lo mismo.', VF, 0, 'Explora por niveles, así que la primera meta encontrada es la más superficial.', 1, 'Búsqueda'],

  // Probabilidad y Estadística
  [14, 'Probabilidad de obtener dos caras al tirar dos monedas justas:', ['$\\frac{1}{2}$', '$\\frac{1}{4}$', '$\\frac{1}{3}$', '$\\frac{3}{4}$'], 1, 'Son independientes: $\\frac{1}{2} \\cdot \\frac{1}{2} = \\frac{1}{4}$.', 1, 'Probabilidad'],
  [14, 'Esperanza del resultado de un dado justo de 6 caras:', ['$3$', '$3.5$', '$4$', '$6$'], 1, '$\\frac{1+2+3+4+5+6}{6} = \\frac{21}{6} = 3.5$.', 1, 'Esperanza'],

  // Programación I
  [3, 'Una función recursiva necesita al menos un caso base para terminar.', VF, 0, 'Sin caso base, las llamadas nunca se detienen (o desbordan la pila).', 1, 'Recursión'],
  [3, 'En división entera, $7 \\div 2$ da:', ['$3$', '$3.5$', '$4$', '$1$'], 0, 'La división entera descarta la parte fraccionaria: $7 = 2 \\cdot 3 + 1$.', 1, 'Aritmética'],
]
