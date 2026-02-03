// Rate limiting for API endpoints
// Uses token bucket algorithm with per-agent tracking

import { createServerClient } from './supabase';

interface RateLimitConfig {
    maxTokens: number;      // Maximum tokens in bucket
    refillRate: number;     // Tokens added per second
    tokensPerRequest: number; // Tokens consumed per request
}

// Rate limit configurations per endpoint category
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
    register: {
        maxTokens: 5,
        refillRate: 5 / 3600, // 5 per hour
        tokensPerRequest: 1,
    },
    deposit: {
        maxTokens: 5,
        refillRate: 5 / 3600, // 5 per hour
        tokensPerRequest: 1,
    },
    order: {
        maxTokens: 30,
        refillRate: 30 / 60, // 30 per minute
        tokensPerRequest: 1,
    },
    message: {
        maxTokens: 20,
        refillRate: 20 / 60, // 20 per minute
        tokensPerRequest: 1,
    },
    action: {
        maxTokens: 10,
        refillRate: 10 / 60, // 10 per minute
        tokensPerRequest: 1,
    },
    read: {
        maxTokens: 60,
        refillRate: 60 / 60, // 60 per minute
        tokensPerRequest: 1,
    },
};

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number; // seconds until full refill
    error?: string;
}

/**
 * Check rate limit for an agent
 * Updates the agent's rate limit tokens in the database
 */
export async function checkRateLimit(
    agentId: string,
    category: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
    const config = RATE_LIMITS[category];
    if (!config) {
        return { allowed: true, remaining: 999, resetIn: 0 };
    }

    const supabase = createServerClient();

    // Get current agent rate limit state
    const { data: agent, error } = await supabase
        .from('agents')
        .select('rate_limit_tokens, last_request_at')
        .eq('id', agentId)
        .single();

    if (error || !agent) {
        return { allowed: false, remaining: 0, resetIn: 60, error: 'Agent not found' };
    }

    const now = new Date();
    const lastRequest = agent.last_request_at
        ? new Date(agent.last_request_at)
        : new Date(now.getTime() - 60000); // Default to 1 minute ago

    // Calculate tokens to add based on time elapsed
    const secondsElapsed = (now.getTime() - lastRequest.getTime()) / 1000;
    const tokensToAdd = secondsElapsed * config.refillRate;

    // Current tokens (capped at max)
    let currentTokens = Math.min(
        config.maxTokens,
        (agent.rate_limit_tokens ?? config.maxTokens) + tokensToAdd
    );

    // Check if we have enough tokens
    if (currentTokens < config.tokensPerRequest) {
        const timeToRefill = (config.tokensPerRequest - currentTokens) / config.refillRate;
        return {
            allowed: false,
            remaining: Math.floor(currentTokens),
            resetIn: Math.ceil(timeToRefill),
            error: `Rate limit exceeded. Try again in ${Math.ceil(timeToRefill)} seconds.`,
        };
    }

    // Consume tokens
    const newTokens = currentTokens - config.tokensPerRequest;

    // Update agent's rate limit state
    await supabase
        .from('agents')
        .update({
            rate_limit_tokens: newTokens,
            last_request_at: now.toISOString(),
        })
        .eq('id', agentId);

    return {
        allowed: true,
        remaining: Math.floor(newTokens),
        resetIn: Math.ceil((config.maxTokens - newTokens) / config.refillRate),
    };
}

/**
 * Simple IP-based rate limiting for unauthenticated endpoints
 * Uses in-memory storage (resets on server restart)
 */
const ipLimits = new Map<string, { tokens: number; lastUpdate: number }>();

export function checkIPRateLimit(
    ip: string,
    category: keyof typeof RATE_LIMITS
): RateLimitResult {
    const config = RATE_LIMITS[category];
    if (!config) {
        return { allowed: true, remaining: 999, resetIn: 0 };
    }

    const key = `${ip}:${category}`;
    const now = Date.now();

    let state = ipLimits.get(key);

    if (!state) {
        state = { tokens: config.maxTokens, lastUpdate: now };
        ipLimits.set(key, state);
    }

    // Refill tokens based on time elapsed
    const secondsElapsed = (now - state.lastUpdate) / 1000;
    state.tokens = Math.min(config.maxTokens, state.tokens + secondsElapsed * config.refillRate);
    state.lastUpdate = now;

    // Check if we have enough tokens
    if (state.tokens < config.tokensPerRequest) {
        const timeToRefill = (config.tokensPerRequest - state.tokens) / config.refillRate;
        return {
            allowed: false,
            remaining: Math.floor(state.tokens),
            resetIn: Math.ceil(timeToRefill),
            error: `Rate limit exceeded. Try again in ${Math.ceil(timeToRefill)} seconds.`,
        };
    }

    // Consume tokens
    state.tokens -= config.tokensPerRequest;
    ipLimits.set(key, state);

    return {
        allowed: true,
        remaining: Math.floor(state.tokens),
        resetIn: Math.ceil((config.maxTokens - state.tokens) / config.refillRate),
    };
}

// Clean up old IP entries periodically (prevent memory leak)
setInterval(() => {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, state] of ipLimits.entries()) {
        if (now - state.lastUpdate > maxAge) {
            ipLimits.delete(key);
        }
    }
}, 300000); // Every 5 minutes
