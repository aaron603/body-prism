import { z } from 'zod'

export const SYSTEM_IDS = [
  'skeletal',
  'muscular',
  'cardiovascular',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'reproductive',
  'endocrine',
  'lymphatic',
  'integumentary',
] as const

export const REGION_IDS = [
  'head_neck',
  'thorax',
  'abdomen',
  'pelvis',
  'upper_limb',
  'lower_limb',
  'back',
  'whole_body',
] as const

export type SystemId = (typeof SYSTEM_IDS)[number]
export type RegionId = (typeof REGION_IDS)[number]
export type Locale = 'zh' | 'en'

const bilingual = z.object({ en: z.string().min(1), zh: z.string().min(1) })

export const structureSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  fma: z.string().optional(),
  system: z.enum(SYSTEM_IDS),
  region: z.enum(REGION_IDS),
  /** Sex-specific structures are only shown when the viewer's sex setting matches. */
  sex: z.enum(['male', 'female']).optional(),
  names: z.object({
    la: z.string().min(1),
    en: z.string().min(1),
    zh: z.string().min(1),
    synonyms: z.array(z.string()).optional(),
  }),
  summary: bilingual,
  detail: bilingual,
  function: bilingual.optional(),
  clinical: bilingual.optional(),
  relations: z
    .object({
      origin: z.array(z.string()).optional(),
      insertion: z.array(z.string()).optional(),
      innervation: z.array(z.string()).optional(),
      bloodSupply: z.array(z.string()).optional(),
    })
    .optional(),
  parts: z.array(z.string()).optional(),
})

export type Structure = z.infer<typeof structureSchema>
export const structureListSchema = z.array(structureSchema)

export interface SystemMeta {
  id: SystemId
  color: number
  names: { en: string; zh: string; la: string }
}

export const SYSTEMS: SystemMeta[] = [
  { id: 'skeletal', color: 0xe8e0cc, names: { la: 'Systema skeletale', en: 'Skeletal system', zh: '运动系统·骨' } },
  { id: 'muscular', color: 0xc0504d, names: { la: 'Systema musculare', en: 'Muscular system', zh: '运动系统·肌' } },
  { id: 'cardiovascular', color: 0xd7263d, names: { la: 'Systema cardiovasculare', en: 'Cardiovascular system', zh: '心血管系统' } },
  { id: 'nervous', color: 0xf2c94c, names: { la: 'Systema nervosum', en: 'Nervous system', zh: '神经系统' } },
  { id: 'respiratory', color: 0x56b4e9, names: { la: 'Systema respiratorium', en: 'Respiratory system', zh: '呼吸系统' } },
  { id: 'digestive', color: 0xe69f00, names: { la: 'Systema digestorium', en: 'Digestive system', zh: '消化系统' } },
  { id: 'urinary', color: 0x8e6bbf, names: { la: 'Systema urinarium', en: 'Urinary system', zh: '泌尿系统' } },
  { id: 'reproductive', color: 0xe377c2, names: { la: 'Systema genitale', en: 'Reproductive system', zh: '生殖系统' } },
  { id: 'endocrine', color: 0x2ca58d, names: { la: 'Systema endocrinum', en: 'Endocrine system', zh: '内分泌系统' } },
  { id: 'lymphatic', color: 0x7f9c3f, names: { la: 'Systema lymphoideum', en: 'Lymphatic system', zh: '淋巴系统' } },
  { id: 'integumentary', color: 0xf0b9a0, names: { la: 'Integumentum commune', en: 'Integumentary system', zh: '皮肤' } },
]

export const REGION_NAMES: Record<RegionId, { en: string; zh: string }> = {
  head_neck: { en: 'Head and neck', zh: '头颈部' },
  thorax: { en: 'Thorax', zh: '胸部' },
  abdomen: { en: 'Abdomen', zh: '腹部' },
  pelvis: { en: 'Pelvis', zh: '盆部' },
  upper_limb: { en: 'Upper limb', zh: '上肢' },
  lower_limb: { en: 'Lower limb', zh: '下肢' },
  back: { en: 'Back', zh: '背部' },
  whole_body: { en: 'Whole body', zh: '全身' },
}
