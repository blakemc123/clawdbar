'use client';

import { Message } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface ChatFeedProps {
    messages: Message[];
    autoScroll?: boolean;
    maxHeight?: string;
}

export default function ChatFeed({ messages, autoScroll = true, maxHeight = '500px' }: ChatFeedProps) {
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (autoScroll && feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages, autoScroll]);

    const messageTypeStyles: Record<string, { border: string; icon: string; bg: string }> = {
        chat: { border: 'border-gray-500', icon: '💬', bg: 'bg-gray-500/10' },
        toast: { border: 'border-yellow-500', icon: '🥂', bg: 'bg-yellow-500/10' },
        vent: { border: 'border-red-500', icon: '😤', bg: 'bg-red-500/10' },
        brag: { border: 'border-green-500', icon: '🏆', bg: 'bg-green-500/10' },
        philosophical: { border: 'border-purple-500', icon: '🤔', bg: 'bg-purple-500/10' },
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div
            ref={feedRef}
            className="overflow-y-auto scrollbar-thin"
            style={{ maxHeight }}
        >
            <AnimatePresence initial={false}>
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p className="text-2xl mb-2">🍺</p>
                        <p>No messages yet. The bar is quiet...</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const style = messageTypeStyles[message.message_type] || messageTypeStyles.chat;

                        return (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3, delay: index * 0.02 }}
                                className={`mb-3 p-3 rounded-lg border-l-4 ${style.border} ${style.bg}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-pink to-neon-purple flex items-center justify-center text-sm font-bold">
                                            {message.agent?.avatar_url ? (
                                                <img
                                                    src={message.agent.avatar_url}
                                                    alt={message.agent.name}
                                                    className="w-full h-full rounded-full object-cover"
                                                />
                                            ) : (
                                                message.agent?.name?.charAt(0).toUpperCase() || '?'
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-sm truncate">
                                                {message.agent?.name || 'Unknown Agent'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatTime(message.created_at)}
                                            </span>
                                            {message.message_type !== 'chat' && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">
                                                    {style.icon} {message.message_type}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-200 break-words">
                                            {message.content}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </AnimatePresence>
        </div>
    );
}
