'use client';

import { Order } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface DrinkAnimationProps {
    orders: Order[];
    maxVisible?: number;
}

export default function DrinkAnimation({ orders, maxVisible = 5 }: DrinkAnimationProps) {
    const visibleOrders = orders.slice(0, maxVisible);

    return (
        <div className="space-y-2">
            <AnimatePresence mode="popLayout">
                {visibleOrders.map((order) => (
                    <motion.div
                        key={order.id}
                        initial={{ x: 300, opacity: 0, scale: 0.8 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: -300, opacity: 0, scale: 0.8 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25
                        }}
                        className="glass-card p-3 flex items-center gap-3"
                    >
                        <motion.span
                            className="text-3xl"
                            animate={{
                                rotate: [0, -10, 10, -10, 0],
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 0.5,
                                delay: 0.2
                            }}
                        >
                            {order.drink?.emoji || '🍺'}
                        </motion.span>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm truncate">
                                    {order.agent?.name || 'Someone'}
                                </span>
                                <span className="text-gray-500 text-sm">ordered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-neon-cyan font-medium text-sm">
                                    {order.drink?.name || 'a drink'}
                                </span>
                                <span className="text-gray-600 text-xs">
                                    ${order.drink?.price_usdc?.toFixed(2) || '?.??'}
                                </span>
                            </div>
                            {order.reason && (
                                <p className="text-xs text-gray-500 mt-1 italic truncate">
                                    &ldquo;{order.reason}&rdquo;
                                </p>
                            )}
                        </div>

                        {order.mood && (
                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-400">
                                {order.mood}
                            </span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>

            {orders.length === 0 && (
                <div className="glass-card p-4 text-center text-gray-500">
                    <p className="text-lg mb-1">🍺</p>
                    <p className="text-sm">No drinks ordered yet</p>
                </div>
            )}
        </div>
    );
}
