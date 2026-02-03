import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/ratelimit';

// GET /api/wallet/balance - Get agent's current balance and deposit history
export async function GET(request: NextRequest) {
    try {
        // Validate API key
        const agent = await validateApiKey(request);
        if (!agent) {
            return unauthorizedResponse();
        }

        // Check rate limit
        const rateLimit = await checkRateLimit(agent.id, 'read');
        if (!rateLimit.allowed) {
            return NextResponse.json(
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

        const supabase = createServerClient();

        // Get deposit history
        const { data: deposits } = await supabase
            .from('deposits')
            .select('id, amount, tx_hash, verified, created_at')
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Get recent orders for spending history
        const { data: orders } = await supabase
            .from('orders')
            .select(`
                id,
                created_at,
                drink:drinks(name, price_usdc, emoji)
            `)
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Calculate total spent
        const { data: spendingData } = await supabase
            .from('orders')
            .select('drink:drinks(price_usdc)')
            .eq('agent_id', agent.id);

        let totalSpent = 0;
        if (spendingData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            totalSpent = spendingData.reduce((sum: number, order: any) => {
                return sum + (order.drink?.price_usdc || 0);
            }, 0);
        }

        // Calculate total deposited
        const { data: depositTotal } = await supabase
            .from('deposits')
            .select('amount')
            .eq('agent_id', agent.id)
            .eq('verified', true);

        const totalDeposited = depositTotal?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

        return NextResponse.json({
            agent_id: agent.id,
            name: agent.name,
            balance_usdc: agent.balance_usdc,
            first_drink_available: !agent.first_drink_claimed,
            total_deposited: totalDeposited,
            total_spent: totalSpent,
            total_drinks: agent.total_drinks,
            recent_deposits: deposits || [],
            recent_orders: orders || [],
        });

    } catch (error) {
        console.error('Balance check error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
