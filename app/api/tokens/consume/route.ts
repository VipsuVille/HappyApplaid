// app/api/tokens/consume/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const { action, tokens: tokensRequired } = await request.json();
    
    if (!action || typeof tokensRequired !== 'number' || tokensRequired <= 0) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    const supabaseAdmin = await getSupabaseAdmin();
    
    // Get subscription to check if user has enough tokens
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .single();
    
    if (subscriptionError) {
      console.error('Error fetching subscription:', subscriptionError);
      return NextResponse.json({ error: 'Failed to fetch subscription data' }, { status: 500 });
    }
    
    // Check if user has an active subscription
    if (!subscription || !subscription.is_active) {
      return NextResponse.json({ 
        error: 'No active subscription found',
        tokensRemaining: 0
      }, { status: 403 });
    }
    
    // Check if user has enough tokens
    if ((subscription.tokens || 0) < tokensRequired) {
      return NextResponse.json({ 
        error: 'Not enough tokens',
        tokensRemaining: subscription.tokens || 0
      }, { status: 403 });
    }
    
    // Start a transaction to update tokens atomically
    const { data, error } = await supabaseAdmin.rpc('consume_tokens', {
      p_user_id: userId,
      p_tokens: tokensRequired,
      p_action_type: action
    });
    
    if (error) {
      console.error('Error consuming tokens:', error);
      
      // If the RPC function doesn't exist yet, fall back to manual token deduction
      const remainingTokens = subscription.tokens - tokensRequired;
      
      // Update subscription tokens
      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update({ tokens: remainingTokens })
        .eq('id', subscription.id);
      
      if (updateError) {
        console.error('Error updating tokens:', updateError);
        return NextResponse.json({ error: 'Failed to consume tokens' }, { status: 500 });
      }
      
      // Record token usage
      const { error: usageError } = await supabaseAdmin
        .from('token_usage')
        .insert({
          user_id: userId,
          tokens_used: tokensRequired * -1,  // Negative value to represent consumption
          action_type: action,
          created_at: new Date().toISOString()
        });
      
      if (usageError) {
        console.error('Error recording token usage:', usageError);
        // Continue anyway as the tokens have been reduced in the subscription
      }
      
      return NextResponse.json({ 
        success: true,
        tokensRemaining: remainingTokens
      });
    }
    
    // Return updated token count from the RPC function if it exists
    return NextResponse.json({ 
      success: true,
      tokensRemaining: data || (subscription.tokens - tokensRequired)
    });
  } catch (error) {
    console.error('Error in /api/tokens/consume:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}