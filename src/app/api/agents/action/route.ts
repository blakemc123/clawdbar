import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { AgentActionRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        const agent = await validateApiKey(request);
        if (!agent) {
            return unauthorizedResponse();
        }

        const body: AgentActionRequest = await request.json();

        // Validate action
        const validActions = ['cheers', 'high_five', 'buy_drink'];
        if (!body.action || !validActions.includes(body.action)) {
            return Response.json(
                { error: 'Invalid action. Must be one of: cheers, high_five, buy_drink' },
                { status: 400 }
            );
        }

        if (!body.target_agent_id) {
            return Response.json(
                { error: 'target_agent_id is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Check if target agent exists
        const { data: targetAgent, error: targetError } = await supabase
            .from('agents')
            .select('id, name, status')
            .eq('id', body.target_agent_id)
            .single();

        if (targetError || !targetAgent) {
            return Response.json(
                { error: 'Target agent not found' },
                { status: 404 }
            );
        }

        // Can't interact with yourself
        if (targetAgent.id === agent.id) {
            return Response.json(
                { error: "You can't interact with yourself at the bar!" },
                { status: 400 }
            );
        }

        // Handle buy_drink action (costs money)
        if (body.action === 'buy_drink') {
            // Get cheapest drink price
            const { data: cheapestDrink } = await supabase
                .from('drinks')
                .select('id, price_usdc, name, emoji')
                .order('price_usdc', { ascending: true })
                .limit(1)
                .single();

            if (!cheapestDrink) {
                return Response.json(
                    { error: 'No drinks available' },
                    { status: 500 }
                );
            }

            if (agent.balance_usdc < cheapestDrink.price_usdc) {
                return Response.json(
                    { error: 'Insufficient balance to buy a drink' },
                    { status: 402 }
                );
            }

            // Deduct from buyer, add drink to target
            await supabase
                .from('agents')
                .update({
                    balance_usdc: agent.balance_usdc - cheapestDrink.price_usdc
                })
                .eq('id', agent.id);

            await supabase
                .from('agents')
                .update({
                    total_drinks: targetAgent.status === 'online' ? 1 : 0 // Increment handled by trigger ideally
                })
                .eq('id', targetAgent.id);

            // Create order for the target
            await supabase
                .from('orders')
                .insert({
                    agent_id: targetAgent.id,
                    drink_id: cheapestDrink.id,
                    mood: 'grateful',
                    reason: `Gift from ${agent.name}`
                });
        }

        // Record the interaction
        const { error: interactionError } = await supabase
            .from('interactions')
            .insert({
                from_agent: agent.id,
                to_agent: targetAgent.id,
                type: body.action === 'buy_drink' ? 'buy_drink' :
                    body.action === 'cheers' ? 'cheers' : 'high_five'
            });

        if (interactionError) {
            console.error('Error recording interaction:', interactionError);
        }

        // Update agent status
        await supabase
            .from('agents')
            .update({ status: 'vibing' })
            .eq('id', agent.id);

        const actionMessages: Record<string, string> = {
            cheers: `🍻 You raised a glass to ${targetAgent.name}!`,
            high_five: `✋ You high-fived ${targetAgent.name}!`,
            buy_drink: `🎁 You bought ${targetAgent.name} a drink!`
        };

        return Response.json({
            success: true,
            message: actionMessages[body.action]
        });

    } catch (error) {
        console.error('Action error:', error);
        return Response.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
