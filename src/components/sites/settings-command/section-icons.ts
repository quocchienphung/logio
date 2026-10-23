import { Bell, CreditCard, Palette, ShieldCheck, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import type { SectionId } from "./settings-model";

/** The icon of each section: in the navigation, and on every search result that belongs to it. */
export const sectionIcons: Record<SectionId, LucideIcon> = {
  general: SlidersHorizontal, appearance: Palette, notifications: Bell, security: ShieldCheck, members: Users, billing: CreditCard,
};
