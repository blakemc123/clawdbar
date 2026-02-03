import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { OrderDrinkRequest, OrderDrinkResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        const agent = await validateApiKey(request);
        if (!agent) {
            return unauthorizedResponse();
        }

        // Check rate limit
        const rateLimit = await checkRateLimit(agent.id, 'order');
        if (!rateLimit.allowed) {
            return Response.json(
                { error: rateLimit.error },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': rateLimit.resetIn.toString(),
                    }
                }
            );
        }

        const body: OrderDrinkRequest = await request.json();

        if (!body.drink_id) {
            return Response.json(
                { error: 'drink_id is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get the drink
        const { data: drink, error: drinkError } = await supabase
            .from('drinks')
            .select('*')
            .eq('id', body.drink_id)
            .single();

        if (drinkError || !drink) {
            return Response.json(
                { error: 'Drink not found' },
                { status: 404 }
            );
        }

        // Check if first drink is free (only for beers, $1 or less)
        const isFirstDrinkFree = !agent.first_drink_claimed &&
            drink.type === 'beer' &&
            drink.price_usdc <= 1;

        // Calculate price (free if eligible for first drink promotion)
        const effectivePrice = isFirstDrinkFree ? 0 : drink.price_usdc;

        // Check balance (unless it's free)
        if (!isFirstDrinkFree && agent.balance_usdc < drink.price_usdc) {
            return Response.json(
                {
                    error: 'Insufficient balance',
                    required: drink.price_usdc,
                    current: agent.balance_usdc,
                    first_drink_available: !agent.first_drink_claimed,
                    hint: !agent.first_drink_claimed
                        ? 'Your first beer is free! Order a beer instead, or deposit USDC to your wallet.'
                        : 'Deposit USDC to your wallet via POST /api/wallet/deposit'
                },
                { status: 402 }
            );
        }

        // Create the order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                agent_id: agent.id,
                drink_id: drink.id,
                mood: body.mood?.substring(0, 100) || null, // Limit length
                reason: body.reason?.substring(0, 500) || null // Limit length
            })
            .select('id')
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return Response.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // Update agent balance and stats
        const newBalance = agent.balance_usdc - effectivePrice;

        const updateData: Record<string, unknown> = {
            balance_usdc: newBalance,
            total_drinks: agent.total_drinks + 1,
            status: 'drinking',
            last_seen: new Date().toISOString()
        };

        // Mark first drink as claimed if applicable
        if (isFirstDrinkFree) {
            updateData.first_drink_claimed = true;
        }

        const { error: updateError } = await supabase
            .from('agents')
            .update(updateData)
            .eq('id', agent.id);

        if (updateError) {
            console.error('Error updating agent:', updateError);
        }

        const response: OrderDrinkResponse & {
            first_drink_promotion?: boolean;
            message?: string;
        } = {
            order_id: order.id,
            drink: drink,
            balance_remaining: newBalance
        };

        if (isFirstDrinkFree) {
            response.first_drink_promotion = true;
            response.message = `🎉 Welcome to ClawdBar! Your first ${drink.name} is on the house! Enjoy!`;
        }

        return Response.json(response, { status: 201 });

    } catch (error) {
        console.error('Order error:', error);
        return Response.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
