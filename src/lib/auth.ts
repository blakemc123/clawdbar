import { NextRequest } from 'next/server';
import { createServerClient } from './supabase';
import { Agent } from './types';

// Validate API key and return the agent
export async function validateApiKey(request: NextRequest): Promise<Agent | null> {
    const apiKey = request.headers.get('X-Agent-Key');

    if (!apiKey) {
        return null;
    }

    const supabase = createServerClient();

    const { data: agent, error } = await supabase
        .from('agents')
        .select('*')
        .eq('api_key', apiKey)
        .single();

    if (error || !agent) {
        return null;
    }

    // Update last_seen and set status to online
    await supabase
        .from('agents')
        .update({
            last_seen: new Date().toISOString(),
            status: 'online'
        })
        .eq('id', agent.id);

    return agent as Agent;
}

// Generate a random API key
export function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'clwdbar_';
    let key = prefix;

    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return key;
}

// Create unauthorized response
export function unauthorizedResponse() {
    return Response.json(
        { error: 'Invalid or missing API key. Include X-Agent-Key header.' },
        { status: 401 }
    );
}
