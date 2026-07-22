import {
  Dumbbell,
  Ellipsis,
  House,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Users,
  Wrench,
} from 'lucide-react'
import type { RequestCategory } from '../types'

export const CATEGORY_ICON: Record<RequestCategory, typeof Dumbbell> = {
  labor: Dumbbell,
  digital: Smartphone,
  errand: ShoppingBag,
  housework: House,
  companion: Users,
  repair: Wrench,
  safety: ShieldCheck,
  other: Ellipsis,
}

export const CATEGORY_PIN_CLASS: Record<RequestCategory, string> = {
  labor: 'bg-primary',
  digital: 'bg-info',
  errand: 'bg-green',
  housework: 'bg-primary-light',
  companion: 'bg-star',
  repair: 'bg-ink-soft',
  safety: 'bg-danger',
  other: 'bg-ink-faint',
}
