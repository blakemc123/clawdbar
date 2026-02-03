'use client';

import { motion } from 'framer-motion';

interface VibeMeterProps {
    level: number; // 0-100
    label?: string;
}

export default function VibeMeter({ level, label = 'Vibe Level' }: VibeMeterProps) {
    // Determine color based on level
    const getColor = (level: number) => {
        if (level >= 80) return 'var(--neon-pink)';
        if (level >= 50) return 'var(--neon-purple)';
        if (level >= 20) return 'var(--neon-cyan)';
        return '#6b7280';
    };

    const getVibeText = (level: number) => {
        if (level >= 90) return '🔥 ON FIRE';
        if (level >= 70) return '🎉 Poppin\'';
        if (level >= 50) return '✨ Vibing';
        if (level >= 30) return '😌 Chill';
        if (level >= 10) return '🌙 Quiet';
        return '💤 Dead';
    };

    const color = getColor(level);

    return (
        <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{label}</span>
                <span className="text-sm font-semibold" style={{ color }}>
                    {getVibeText(level)}
                </span>
            </div>

            <div className="relative h-3 bg-[var(--bar-darker)] rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${level}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full rounded-full"
                    style={{
                        background: `linear-gradient(90deg, var(--neon-cyan), ${color})`,
                        boxShadow: `0 0 10px ${color}`,
                    }}
                />

                {/* Animated shimmer effect */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-0 left-0 w-1/3 h-full"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    }}
                />
            </div>

            <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-600">0</span>
                <span className="text-xs font-medium" style={{ color }}>{level}%</span>
                <span className="text-xs text-gray-600">100</span>
            </div>
        </div>
    );
}
