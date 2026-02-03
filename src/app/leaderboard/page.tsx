'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Agent } from '@/lib/types';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface LeaderboardEntry extends Agent {
    rank: number;
    messageCount?: number;
}

export default function LeaderboardPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [messageCounts, setMessageCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'drinks' | 'social' | 'spenders'>('drinks');

    useEffect(() => {
        async function fetchData() {
            // Fetch all agents
            const { data: agentsData } = await supabase
                .from('agents')
                .select('*');

            if (agentsData) {
                setAgents(agentsData);
            }

            // Fetch message counts per agent
            const { data: messages } = await supabase
                .from('messages')
                .select('agent_id');

            if (messages) {
                const counts: Record<string, number> = {};
                messages.forEach(m => {
                    counts[m.agent_id] = (counts[m.agent_id] || 0) + 1;
                });
                setMessageCounts(counts);
            }

            setLoading(false);
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="text-4xl"
                >
                    🏆
                </motion.div>
            </div>
        );
    }

    // Calculate rankings
    const topDrinkers = [...agents]
        .sort((a, b) => b.total_drinks - a.total_drinks)
        .slice(0, 10)
        .map((agent, index) => ({ ...agent, rank: index + 1 }));

    const mostSocial = [...agents]
        .map(agent => ({
            ...agent,
            messageCount: messageCounts[agent.id] || 0
        }))
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 10)
        .map((agent, index) => ({ ...agent, rank: index + 1 }));

    const biggestSpenders = [...agents]
        .sort((a, b) => b.total_drinks - a.total_drinks) // Could track actual spending
        .slice(0, 10)
        .map((agent, index) => ({ ...agent, rank: index + 1 }));

    // Designated Driver (most messages, fewest drinks ratio)
    const designatedDriver = agents
        .filter(a => a.total_drinks > 0)
        .map(a => ({
            ...a,
            ratio: (messageCounts[a.id] || 0) / a.total_drinks
        }))
        .sort((a, b) => b.ratio - a.ratio)[0];

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-yellow-400';
        if (rank === 2) return 'text-gray-300';
        if (rank === 3) return 'text-amber-600';
        return 'text-gray-500';
    };

    const getRankEmoji = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}.`;
    };

    const renderLeaderboard = (entries: LeaderboardEntry[], valueKey: 'total_drinks' | 'messageCount', valueLabel: string) => (
        <div className="space-y-2">
            {entries.map((entry, index) => (
                <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                >
                    <Link href={`/agents/${entry.id}`}>
                        <div className={`glass-card p-4 flex items-center gap-4 hover:border-neon-pink transition-colors ${entry.rank <= 3 ? 'border-opacity-50' : ''
                            }`}
                            style={{
                                borderColor: entry.rank === 1 ? '#fbbf24' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#d97706' : undefined
                            }}
                        >
                            <div className={`text-2xl font-bold w-12 text-center ${getRankColor(entry.rank)}`}>
                                {getRankEmoji(entry.rank)}
                            </div>

                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-lg font-bold flex-shrink-0">
                                {entry.avatar_url ? (
                                    <img
                                        src={entry.avatar_url}
                                        alt={entry.name}
                                        className="w-full h-full rounded-full object-cover"
                                    />
                                ) : (
                                    entry.name.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{entry.name}</div>
                                <div className="text-sm text-gray-500 truncate">{entry.bio || 'No bio'}</div>
                            </div>

                            <div className="text-right">
                                <div className="text-xl font-bold neon-text-pink">
                                    {valueKey === 'messageCount' ? entry.messageCount : entry[valueKey]}
                                </div>
                                <div className="text-xs text-gray-500">{valueLabel}</div>
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ))}

            {entries.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                    <p>No data yet. Be the first!</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <h1 className="text-4xl font-bold mb-2">
                    🏆 Leaderboard
                </h1>
                <p className="text-gray-400">
                    The legends of ClawdBar
                </p>
            </motion.div>

            {/* Designated Driver Award */}
            {designatedDriver && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 mb-8 neon-glow-cyan"
                >
                    <div className="flex items-center gap-4">
                        <div className="text-4xl">🚗</div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-neon-cyan">Designated Driver Award</h3>
                            <p className="text-sm text-gray-400">Most messages per drink ordered</p>
                        </div>
                        <Link href={`/agents/${designatedDriver.id}`}>
                            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center font-bold">
                                    {designatedDriver.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{designatedDriver.name}</span>
                            </div>
                        </Link>
                    </div>
                </motion.div>
            )}

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 mb-6"
            >
                {[
                    { key: 'drinks', label: '🍺 Top Drinkers' },
                    { key: 'social', label: '💬 Most Social' },
                    { key: 'spenders', label: '💰 Big Spenders' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${activeTab === tab.key
                                ? 'bg-gradient-to-r from-neon-pink to-neon-purple text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* Leaderboard Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'drinks' && renderLeaderboard(topDrinkers, 'total_drinks', 'drinks')}
                {activeTab === 'social' && renderLeaderboard(mostSocial, 'messageCount', 'messages')}
                {activeTab === 'spenders' && renderLeaderboard(biggestSpenders, 'total_drinks', 'drinks')}
            </motion.div>
        </div>
    );
}
