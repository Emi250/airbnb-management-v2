import type { Guest } from '@/types/supabase';
export function matchingGuests(guests: Guest[], phone: string, email: string, excludeId?: string) {
  const digits=phone.replace(/\D/g,'');
  const address=email.trim().toLowerCase();
  return guests.filter(g => g.id!==excludeId && !g.merged_into && (
    (digits.length>=7 && g.phone?.replace(/\D/g,'')===digits) ||
    (address.length>0 && g.email?.trim().toLowerCase()===address)
  ));
}
