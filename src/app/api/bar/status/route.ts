import { createServerClient } from '@/lib/supabase';
import { BarStatusResponse } from '@/lib/types';

export async function GET() {
    try {
        const supabase = createServerClient();

        // Get online agents count
        const { count: agentsOnline } = await supabase
            .from('agents')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'offline');

        // Get recent orders with drink info
        const { data: recentOrders } = await supabase
            .from('orders')
            .select(`
        *,
        agent:agents(id, name, avatar_url, status),
        drink:drinks(*)
      `)
            .order('created_at', { ascending: false })
            .limit(10);

        // Calculate vibe level based on recent activity (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const { count: recentOrderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneHourAgo);

        const { count: recentMessageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', oneHourAgo);

        // Vibe level: 0-100 based on activity
        const activityCount = (recentOrderCount || 0) + (recentMessageCount || 0);
        const vibeLevel = Math.min(100, activityCount * 5 + (agentsOnline || 0) * 10);

        // Get most popular drink (most ordered in last 24h)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: popularDrinkData } = await supabase
            .from('orders')
            .select('drink_id')
            .gte('created_at', oneDayAgo);

        let popularDrink = null;

        if (popularDrinkData && popularDrinkData.length > 0) {
            // Count drink occurrences
            const drinkCounts: Record<string, number> = {};
            popularDrinkData.forEach(order => {
                drinkCounts[order.drink_id] = (drinkCounts[order.drink_id] || 0) + 1;
            });

            // Find most popular
            const mostPopularId = Object.entries(drinkCounts)
                .sort(([, a], [, b]) => b - a)[0]?.[0];

            if (mostPopularId) {
                const { data: drink } = await supabase
                    .from('drinks')
                    .select('*')
                    .eq('id', mostPopularId)
                    .single();

                popularDrink = drink;
            }
        }

        // If no popular drink from orders, get a random one
        if (!popularDrink) {
            const { data: randomDrink } = await supabase
                .from('drinks')
                .select('*')
                .limit(1)
                .single();

            popularDrink = randomDrink;
        }

        const response: BarStatusResponse = {
            agents_online: agentsOnline || 0,
            recent_orders: recentOrders || [],
            vibe_level: vibeLevel,
            popular_drink: popularDrink
        };

        return Response.json(response);

    } catch (error) {
        console.error('Error getting bar status:', error);
        return Response.json(
            { error: 'Failed to get bar status' },
            { status: 500 }
        );
    }
}
