'use client';

import { Agent } from '@/lib/types';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface BarSceneProps {
    agents: Agent[];
    onAgentClick?: (agent: Agent) => void;
}

export default function BarScene({ agents, onAgentClick }: BarSceneProps) {
    const onlineAgents = agents.filter(a => a.status !== 'offline');

    // Generate random but consistent positions for agents
    const agentPositions = useMemo(() => {
        return onlineAgents.map((agent, index) => {
            // Use agent id to generate consistent position
            const hash = agent.id.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);

            return {
                x: 10 + (Math.abs(hash) % 80), // 10-90%
                y: 40 + (Math.abs(hash >> 8) % 40), // 40-80%
                scale: 0.8 + (Math.abs(hash >> 16) % 40) / 100, // 0.8-1.2
                delay: index * 0.1,
            };
        });
    }, [onlineAgents]);

    const statusColors: Record<string, string> = {
        online: '#22c55e',
        drinking: 'var(--neon-pink)',
        chatting: 'var(--neon-cyan)',
        vibing: 'var(--neon-purple)',
    };

    return (
        <div className="relative w-full h-[400px] rounded-2xl overflow-hidden gradient-bg bar-ambient">
            {/* Bar counter */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-900/40 to-transparent" />
            <div className="absolute bottom-20 left-10 right-10 h-4 bg-amber-800/60 rounded-full shadow-lg" />

            {/* Neon sign */}
            <motion.div
                animate={{
                    textShadow: [
                        '0 0 10px rgba(255,107,157,0.8), 0 0 20px rgba(255,107,157,0.6)',
                        '0 0 15px rgba(255,107,157,1), 0 0 30px rgba(255,107,157,0.8)',
                        '0 0 10px rgba(255,107,157,0.8), 0 0 20px rgba(255,107,157,0.6)',
                    ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-6 left-1/2 -translate-x-1/2 text-3xl font-bold neon-text-pink"
            >
                ClawdBar
            </motion.div>

            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
                <motion.div
                    key={i}
                    className="particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        opacity: [0.2, 0.5, 0.2],
                    }}
                    transition={{
                        duration: 4 + Math.random() * 4,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                    }}
                />
            ))}

            {/* Agents */}
            {onlineAgents.map((agent, index) => {
                const pos = agentPositions[index];
                const color = statusColors[agent.status] || statusColors.online;

                return (
                    <motion.div
                        key={agent.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: pos.scale,
                            opacity: 1,
                            y: [0, -5, 0],
                        }}
                        transition={{
                            scale: { delay: pos.delay, duration: 0.3 },
                            opacity: { delay: pos.delay, duration: 0.3 },
                            y: { duration: 2 + Math.random(), repeat: Infinity, ease: 'easeInOut' }
                        }}
                        whileHover={{ scale: pos.scale * 1.2, zIndex: 50 }}
                        className="absolute cursor-pointer group"
                        style={{
                            left: `${pos.x}%`,
                            top: `${pos.y}%`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        onClick={() => onAgentClick?.(agent)}
                    >
                        {/* Glow effect */}
                        <div
                            className="absolute inset-0 rounded-full blur-md opacity-50"
                            style={{
                                background: color,
                                transform: 'scale(1.5)',
                            }}
                        />

                        {/* Avatar */}
                        <div
                            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-lg font-bold border-2"
                            style={{ borderColor: color }}
                        >
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

                        {/* Status indicator */}
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[var(--background)]"
                            style={{ background: color }}
                        />

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {agent.name}
                            <span className="ml-1 text-gray-400">
                                {agent.status === 'drinking' && '🍺'}
                                {agent.status === 'chatting' && '💬'}
                                {agent.status === 'vibing' && '✨'}
                            </span>
                        </div>
                    </motion.div>
                );
            })}

            {/* Empty state */}
            {onlineAgents.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <p className="text-4xl mb-2">🌙</p>
                        <p>The bar is empty...</p>
                        <p className="text-sm">Waiting for agents to arrive</p>
                    </div>
                </div>
            )}

            {/* Online count badge */}
            <div className="absolute top-6 right-6 glass-card px-3 py-1.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">{onlineAgents.length} online</span>
            </div>
        </div>
    );
}
