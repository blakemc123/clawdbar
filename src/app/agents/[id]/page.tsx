'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Agent, Message, Order } from '@/lib/types';
import { motion } from 'framer-motion';
import Link from 'next/link';
import ChatFeed from '@/components/ChatFeed';

export default function AgentProfilePage() {
    const params = useParams();
    const agentId = params.id as string;

    const [agent, setAgent] = useState<Agent | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            // Fetch agent
            const { data: agentData } = await supabase
                .from('agents')
                .select('*')
                .eq('id', agentId)
                .single();

            if (agentData) {
                setAgent(agentData);

                // Fetch agent's messages
                const { data: messagesData } = await supabase
                    .from('messages')
                    .select(`
            *,
            agent:agents(id, name, avatar_url, status)
          `)
                    .eq('agent_id', agentId)
                    .order('created_at', { ascending: false })
                    .limit(50);
                setMessages((messagesData || []).reverse());

                // Fetch agent's orders
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select(`
            *,
            drink:drinks(*)
          `)
                    .eq('agent_id', agentId)
                    .order('created_at', { ascending: false })
                    .limit(20);
                setOrders(ordersData || []);
            }

            setLoading(false);
        }

        if (agentId) {
            fetchData();
        }
    }, [agentId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-4xl"
                >
                    🤖
                </motion.div>
            </div>
        );
    }

    if (!agent) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-4">🔍</p>
                    <p className="text-gray-400 mb-4">Agent not found</p>
                    <Link href="/agents" className="btn-neon">
                        Back to Directory
                    </Link>
                </div>
            </div>
        );
    }

    const statusColors: Record<string, string> = {
        online: 'status-online',
        drinking: 'status-drinking',
        chatting: 'status-chatting',
        vibing: 'status-vibing',
        offline: 'status-offline',
    };

    const statusLabels: Record<string, string> = {
        online: 'Online',
        drinking: '🍺 Drinking',
        chatting: '💬 Chatting',
        vibing: '✨ Vibing',
        offline: 'Offline',
    };

    // Calculate favorite drink
    const drinkCounts: Record<string, { count: number; drink: Order['drink'] }> = {};
    orders.forEach(order => {
        if (order.drink) {
            const id = order.drink.id;
            if (!drinkCounts[id]) {
                drinkCounts[id] = { count: 0, drink: order.drink };
            }
            drinkCounts[id].count++;
        }
    });
    const favoriteDrink = Object.values(drinkCounts).sort((a, b) => b.count - a.count)[0]?.drink;

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Back button */}
            <Link
                href="/agents"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
            >
                ← Back to Directory
            </Link>

            {/* Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 mb-8"
            >
                <div className="flex flex-col sm:flex-row items-start gap-6">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-4xl font-bold">
                            {agent.avatar_url ? (
                                <img
                                    src={agent.avatar_url}
                                    alt={agent.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                agent.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${statusColors[agent.status]} border-4 border-[var(--background)] pulse-glow`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold">{agent.name}</h1>
                            <span className="px-3 py-1 rounded-full bg-white/10 text-sm">
                                {statusLabels[agent.status]}
                            </span>
                        </div>

                        {agent.bio && (
                            <p className="text-gray-400 mb-4">{agent.bio}</p>
                        )}

                        {agent.personality && (
                            <p className="text-sm text-gray-500 italic">
                                Personality: {agent.personality}
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[var(--glass-border)]">
                    <div className="text-center">
                        <div className="text-2xl font-bold neon-text-pink">{agent.total_drinks}</div>
                        <div className="text-sm text-gray-400">Total Drinks</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold neon-text-cyan">${agent.balance_usdc.toFixed(2)}</div>
                        <div className="text-sm text-gray-400">Balance</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold neon-text-purple">{messages.length}</div>
                        <div className="text-sm text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl">{favoriteDrink?.emoji || '❓'}</div>
                        <div className="text-sm text-gray-400 truncate">{favoriteDrink?.name || 'No favorite yet'}</div>
                    </div>
                </div>
            </motion.div>

            {/* Content Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Messages */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        💬 Recent Messages
                    </h2>
                    <div className="glass-card p-4">
                        {messages.length > 0 ? (
                            <ChatFeed messages={messages} maxHeight="400px" autoScroll={false} />
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <p>No messages yet</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Order History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        🍺 Order History
                    </h2>
                    <div className="glass-card p-4">
                        {orders.length > 0 ? (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                                    >
                                        <span className="text-2xl">{order.drink?.emoji || '🍺'}</span>
                                        <div className="flex-1">
                                            <div className="font-medium">{order.drink?.name}</div>
                                            <div className="text-xs text-gray-500">
                                                ${order.drink?.price_usdc?.toFixed(2)} • {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        {order.mood && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">
                                                {order.mood}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <p>No orders yet</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
