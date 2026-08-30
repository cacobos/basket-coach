import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Reminder window in minutes BEFORE the session start.
const WINDOW_MINUTES = 15;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
    const resendFrom = Deno.env.get('RESEND_FROM') ?? 'Basket Coach <onboarding@resend.dev>';

    const baseUrl = Deno.env.get('APP_URL') ?? 'https://planbasket.netlify.app';

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ message: 'RESEND_API_KEY not configured', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Sessions starting within the reminder window, not yet reminded.
    const now = new Date();
    const windowEnd = new Date(now.getTime() + WINDOW_MINUTES * 60_000);
    const today = now.toISOString().split('T')[0];

    // Convert start_time to minutes for comparison.
    const startMin = now.getHours() * 60 + now.getMinutes();
    const endMin = windowEnd.getHours() * 60 + windowEnd.getMinutes();

    const { data: sessions, error: sessionsError } = await supabase
      .from('training_sessions')
      .select('*, teams(name)')
      .eq('date', today)
      .in('status', ['planned', 'draft'])
      .is('reminder_sent_at', null)
      .is('deleted_at', null);

    if (sessionsError) throw sessionsError;
    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No sessions in window', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dueSessions = sessions.filter((s: any) => {
      const [h, m] = String(s.start_time).split(':').map(Number);
      const sMin = h * 60 + m;
      return sMin >= startMin && sMin <= endMin;
    });

    if (dueSessions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No sessions within 15-min window', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sent = 0;

    for (const session of dueSessions) {
      // Collect recipients: team staff (coaches) + the session creator,
      // limited to those with reminder_email = true.
      const staffUserIds: string[] = [];
      const { data: staff } = await supabase
        .from('team_staff')
        .select('user_id')
        .eq('team_id', session.team_id);
      for (const s of staff || []) staffUserIds.push(s.user_id);

      if (session.created_by && !staffUserIds.includes(session.created_by)) {
        staffUserIds.push(session.created_by);
      }

      if (staffUserIds.length === 0) continue;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('reminder_email', true)
        .in('id', staffUserIds);

      const recipients = (profiles || []).filter((p: any) => p.email);
      if (recipients.length === 0) continue;

      const sessionDetailUrl = `${baseUrl}/sessions/${session.id}/attendance`;
      const teamName = session.teams?.name || '';

      for (const recipient of recipients) {
        try {
          await resend.emails.send({
            from: resendFrom,
            to: [recipient.email],
            subject: `⏰ Pasar lista — ${session.title}${teamName ? ' (' + teamName + ')' : ''}`,
            html: `
              <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e;">
                <h2 style="margin:0 0 8px;">Pasar lista</h2>
                <p style="margin:0 0 16px;color:#555;">El entrenamiento <strong>${escapeHtml(session.title)}</strong> empieza ${timeLabel(session.start_time)}.</p>
                <p style="color:#555;">Pulsa el botón para registrar quién asiste:</p>
                <a href="${sessionDetailUrl}" style="display:inline-block;background:#0068ed;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Pasar lista</a>
                <p style="margin:20px 0 0;font-size:13px;color:#888;">Si no quieres recibir estos avisos, desactívalos desde tu perfil en la app.</p>
              </div>
            `,
          });
          sent++;
        } catch {
          // send error for one recipient shouldn't block the rest
        }
      }

      // Mark as reminded so we don't email again.
      await supabase
        .from('training_sessions')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', session.id);
    }

    return new Response(
      JSON.stringify({ message: 'Reminder run completed', sent, sessions: dueSessions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeLabel(t: string): string {
  return String(t).slice(0, 5) || '';
}
