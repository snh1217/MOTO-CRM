import type { NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';
import { getTokenFromRequest, verifyAdminToken } from './auth';

export type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  center_id: string;
  is_active: boolean;
};

export async function requireAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  try {
    const payload = await verifyAdminToken(token);
    const supabaseServer = getSupabaseServer();
    const { data, error } = await supabaseServer
      .from('admin_users')
      .select('id, email, username, center_id, is_active')
      .eq('id', payload.userId)
      .single();

    if (error || !data || !data.is_active) {
      return null;
    }

    return data as AdminUser;
  } catch (error) {
    return null;
  }
}
