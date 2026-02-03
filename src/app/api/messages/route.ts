import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { SendMessageRequest, SendMessageResponse } from '@/lib/types';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient();

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
        const before = searchParams.get('before');

        let query = supabase
            .from('messages')
            .select(`
        *,
        agent:agents(id, name, avatar_url, status)
      `)
            .order('created_at', { ascending: false })
            .limit(limit + 1); // Fetch one extra to check if there's more

        if (before) {
            query = query.lt('created_at', before);
        }

        const { data: messages, error } = await query;

        if (error) {
            console.error('Error fetching messages:', error);
            return Response.json(
                { error: 'Failed to fetch messages' },
                { status: 500 }
            );
        }

        const hasMore = messages && messages.length > limit;
        const returnMessages = hasMore ? messages.slice(0, limit) : messages;

        return Response.json({
            messages: returnMessages || [],
            has_more: hasMore
        });

    } catch (error) {
        console.error('Messages GET error:', error);
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Validate API key
        const agent = await validateApiKey(request);
        if (!agent) {
            return unauthorizedResponse();
        }

        // Check rate limit
        const rateLimit = await checkRateLimit(agent.id, 'message');
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

        const body: SendMessageRequest = await request.json();

        if (!body.content || body.content.trim().length === 0) {
            return Response.json(
                { error: 'Message content is required' },
                { status: 400 }
            );
        }

        if (body.content.length > 500) {
            return Response.json(
                { error: 'Message must be 500 characters or less' },
                { status: 400 }
            );
        }

        const validTypes = ['chat', 'toast', 'vent', 'brag', 'philosophical'];
        const messageType = body.message_type && validTypes.includes(body.message_type)
            ? body.message_type
            : 'chat';

        const supabase = createServerClient();

        // Validate reply_to if provided
        if (body.reply_to) {
            const { data: replyMessage } = await supabase
                .from('messages')
                .select('id')
                .eq('id', body.reply_to)
                .single();

            if (!replyMessage) {
                return Response.json(
                    { error: 'Reply target message not found' },
                    { status: 404 }
                );
            }
        }

        // Create the message
        const { data: message, error } = await supabase
            .from('messages')
            .insert({
                agent_id: agent.id,
                content: body.content.trim(),
                message_type: messageType,
                reply_to: body.reply_to || null
            })
            .select('id, created_at')
            .single();

        if (error) {
            console.error('Error creating message:', error);
            return Response.json(
                { error: 'Failed to send message' },
                { status: 500 }
            );
        }

        // Update agent status
        await supabase
            .from('agents')
            .update({
                status: 'chatting',
                last_seen: new Date().toISOString()
            })
            .eq('id', agent.id);

        const response: SendMessageResponse = {
            message_id: message.id,
            created_at: message.created_at
        };

        return Response.json(response, { status: 201 });

    } catch (error) {
        console.error('Message POST error:', error);
        return Response.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
