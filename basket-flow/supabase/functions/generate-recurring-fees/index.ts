import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().split('T')[0];

    const { data: plans, error: plansError } = await supabase
      .from('fee_plans')
      .select('*')
      .eq('active', true);

    if (plansError) throw plansError;
    if (!plans || plans.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active fee plans found', created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalCreated = 0;

    for (const plan of plans) {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('team_id', plan.team_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (playersError) throw playersError;
      if (!players || players.length === 0) continue;

      for (const player of players) {
        const { data: existingFees } = await supabase
          .from('player_fees')
          .select('id')
          .eq('player_id', player.id)
          .eq('fee_plan_id', plan.id)
          .eq('status', 'pending')
          .limit(1);

        if (existingFees && existingFees.length > 0) continue;

        let dueDate: string;

        if (plan.frequency === 'monthly') {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(1);
          dueDate = nextMonth.toISOString().split('T')[0];
        } else if (plan.frequency === 'seasonal') {
          const nextSeason = new Date();
          nextSeason.setMonth(nextSeason.getMonth() + 6);
          dueDate = nextSeason.toISOString().split('T')[0];
        } else {
          dueDate = today;
        }

        const { error: insertError } = await supabase
          .from('player_fees')
          .insert({
            player_id: player.id,
            fee_plan_id: plan.id,
            due_date: dueDate,
            amount: plan.amount,
            status: 'pending',
          });

        if (insertError) throw insertError;
        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Fee generation completed',
        created: totalCreated,
        plans_processed: plans.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
