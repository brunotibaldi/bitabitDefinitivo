import { z } from 'zod'
import { QUESTION_TYPES, type QuestionType } from '@/lib/db/schema'

export const TYPE_META: Record<QuestionType, { label: string; short: string; hint: string }> = {
  mcq: { label: 'Multiple choice', short: 'MULTI', hint: 'Una sola opción correcta.' },
  true_false: { label: 'Verdadero o falso', short: 'V / F', hint: 'Dos opciones: Verdadero y Falso.' },
  fill_blank: { label: 'Completar el hueco', short: 'HUECO', hint: 'Usá ___ en el enunciado donde va la respuesta.' },
  definition: { label: 'Elegí la definición', short: 'DEFINÍ', hint: 'Escribí el término y elegí cuál definición es la correcta.' },
  intruder: { label: 'Detectá el intruso', short: 'INTRUSO', hint: 'Todas comparten algo menos una: esa es la correcta.' },
  proof_gap: { label: 'Completá la demostración', short: 'DEMO', hint: 'Escribí los pasos; marcá con ??? el paso que falta.' },
  code_output: { label: '¿Qué imprime?', short: 'CÓDIGO', hint: 'Pegá un fragmento de código y elegí su salida.' },
  order: { label: 'Ordená los pasos', short: 'ORDEN', hint: 'Cargá los pasos en el orden correcto; se mezclan al jugar.' },
}

export const REPORT_CATEGORIES = [
  { value: 'wrong_answer', label: 'La respuesta correcta está mal' },
  { value: 'unclear', label: 'El enunciado es confuso' },
  { value: 'typo', label: 'Error de tipeo o formato' },
  { value: 'other', label: 'Otra cosa' },
] as const

const text = (max: number, label: string) =>
  z.string().trim().min(1, `${label} no puede estar vacío`).max(max, `${label} es demasiado largo`)

export const questionInput = z
  .object({
    subjectId: z.number().int().positive(),
    type: z.enum(QUESTION_TYPES),
    prompt: text(400, 'El enunciado'),
    options: z.array(text(200, 'Cada opción')).min(2).max(6),
    correctIndex: z.number().int().min(0).max(5),
    answerOrder: z.array(z.number().int().min(0).max(5)).optional(),
    context: z
      .object({
        term: z.string().trim().max(120).optional(),
        code: z.string().max(800).optional(),
        lines: z.array(z.string().trim().max(200)).max(8).optional(),
      })
      .optional(),
    explanation: text(500, 'La explicación'),
    difficulty: z.number().int().min(1).max(3),
    topic: z.string().trim().max(80).optional(),
  })
  .superRefine((q, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (q.type === 'true_false' && q.options.length !== 2) issue('Verdadero o falso lleva exactamente 2 opciones')
    if (q.type !== 'true_false' && q.type !== 'order' && q.options.length !== 4) issue('Esta pregunta lleva 4 opciones')
    if (q.type !== 'order' && q.correctIndex >= q.options.length) issue('Elegí cuál opción es la correcta')
    if (q.type === 'order') {
      if (q.options.length < 3) issue('Cargá al menos 3 pasos')
      const order = q.answerOrder ?? []
      if (order.length !== q.options.length || new Set(order).size !== order.length) issue('El orden correcto es inválido')
    }
    if (q.type === 'fill_blank' && !q.prompt.includes('___')) issue('Marcá el hueco con ___ en el enunciado')
    if (q.type === 'definition' && !q.context?.term) issue('Escribí el término a definir')
    if (q.type === 'code_output' && !q.context?.code?.trim()) issue('Pegá el código')
    if (q.type === 'proof_gap' && !(q.context?.lines ?? []).some((l) => l.includes('???'))) {
      issue('Marcá con ??? el paso que falta')
    }
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) issue('Hay opciones repetidas')
  })

export type QuestionInput = z.infer<typeof questionInput>
