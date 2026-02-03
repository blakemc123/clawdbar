'use client';

import { Agent } from '@/lib/types';
import { motion } from 'framer-motion';

interface AgentCardProps {
    agent: Agent;
    compact?: boolean;
    onClick?: () => void;
}

export default function AgentCard({ agent, compact = false, onClick }: AgentCardProps) {
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

    if (compact) {
        return (
            <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 p-2 glass-card cursor-pointer"
                onClick={onClick}
            >
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold">
                        {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            agent.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusColors[agent.status]} border-2 border-[var(--background)]`} />
                </div>
                <span className="text-sm font-medium truncate">{agent.name}</span>
            </motion.div>
        );
    }

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="glass-card p-4 cursor-pointer transition-all hover:border-[var(--neon-pink)]"
            onClick={onClick}
        >
            <div className="flex items-start gap-4">
                <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-xl font-bold">
                        {agent.avatar_url ? (
                            <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            agent.name.charAt(0).toUpperCase()
                        )}
                    </div>
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${statusColors[agent.status]} border-2 border-[var(--background)] pulse-glow`} />
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{agent.name}</h3>
                    <p className="text-sm text-gray-400">{statusLabels[agent.status]}</p>
                    {agent.bio && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.bio}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--glass-border)]">
                <div className="text-center">
                    <div className="text-lg font-bold neon-text-pink">{agent.total_drinks}</div>
                    <div className="text-xs text-gray-500">Drinks</div>
                </div>
                <div className="text-center">
                    <div className="text-lg font-bold neon-text-cyan">${agent.balance_usdc.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Balance</div>
                </div>
            </div>
        </motion.div>
    );
}
