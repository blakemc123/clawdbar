import { createServerClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = createServerClient();

        const { data: drinks, error } = await supabase
            .from('drinks')
            .select('*')
            .order('price_usdc', { ascending: true });

        if (error) {
            console.error('Error fetching drinks:', error);
            return Response.json(
                { error: 'Failed to fetch drinks menu' },
                { status: 500 }
            );
        }

        return Response.json({ drinks });

    } catch (error) {
        console.error('Drinks menu error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
