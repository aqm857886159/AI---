import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EternalFlame, Starburst, ResonantHeart, NeuralZap } from './PraiseIcons';

// --- Types ---
export interface PraiseHighlight {
    id: string;
    quote: string;
    reason: string;
    wow: string;
    type?: 'logic' | 'rhetoric' | 'emotion' | 'insight';
}

interface EffectEvent {
    x: number;
    y: number;
    highlight: PraiseHighlight;
}

export const PraiseEffects: React.FC = () => {
    const [activeEffect, setActiveEffect] = useState<EffectEvent | null>(null);

    // Listen for custom events from Editor
    useEffect(() => {
        const handlePraiseClick = (e: Event) => {
            const customEvent = e as CustomEvent<EffectEvent>;
            const { x, y, highlight } = customEvent.detail;

            // Reset first to allow re-triggering same animation
            setActiveEffect(null);
            setTimeout(() => {
                setActiveEffect({ x, y, highlight });
            }, 10); // Tiny delay for React batching

            // Auto-dismiss after 3.5s (longer for reading)
            setTimeout(() => {
                setActiveEffect((prev) => (prev?.x === x ? null : prev));
            }, 3500);
        };

        window.addEventListener('praise-click', handlePraiseClick);
        return () => window.removeEventListener('praise-click', handlePraiseClick);
    }, []);

    if (!activeEffect) return null;

    const { x, y, highlight } = activeEffect;

    // --- Configuration V8.0: The Looping Widget ---

    // 1. High-Energy Colloquial Dictionary
    const MANTRA_MAP: Record<string, string> = {
        logic: '通透',
        rhetoric: '哇塞',
        emotion: '破防',
        insight: '犀利',
        default: '绝了'
    };

    // 2. Elemental Colors
    const COLOR_MAP: Record<string, string> = {
        logic: '#FF4500',    // Orange Red
        rhetoric: '#FFD700', // Gold
        emotion: '#FF1493',  // Deep Pink
        insight: '#00BFFF',  // Deep Sky Blue
        default: '#FFD700'
    };

    // 3. Dynamic Icons Map (16px Looping)
    const ICON_MAP: Record<string, React.FC> = {
        logic: EternalFlame,
        rhetoric: Starburst,
        emotion: ResonantHeart,
        insight: NeuralZap,
        default: Starburst
    };

    const mantra = MANTRA_MAP[highlight.type || 'default'] || MANTRA_MAP.default;
    const color = COLOR_MAP[highlight.type || 'default'];

    return ReactDOM.createPortal(
        <motion.div
            layout // Enable Layout Morphing
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
                position: 'fixed',
                left: x - 10, // Slight offset
                top: y - 24,  // Shift UP to be "on the line above"
                transform: 'translate(0, -100%)', // Anchor bottom-left
                pointerEvents: 'none',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center', // Strict Vertical Center
                gap: '6px', // Tight gap
                padding: '4px 10px', // Very compact
                background: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(8px)',
                borderRadius: '99px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)',
                border: `1px solid ${color}30`,
                overflow: 'hidden',
                whiteSpace: 'nowrap'
            }}
        >
            {/* Stage 1: The Icon (16px fixed) */}
            <div style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {React.createElement(ICON_MAP[highlight.type || 'default'] || Starburst)}
            </div>

            {/* Stage 2. The Mantra (14px Bold - Smaller than Body) */}
            <motion.div
                layout="position"
                style={{
                    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
                    fontWeight: 700,
                    fontSize: '14px', // Smaller than 16px body
                    color: color,
                    lineHeight: 1,
                    letterSpacing: '0.02em'
                }}
            >
                {mantra}
            </motion.div>

            {/* Stage 2.5: Separator */}
            <motion.div
                layout="position"
                style={{ width: 1, height: 12, background: '#EEE', margin: '0 2px' }}
            />

            {/* Stage 3. The Rationale (12px Gray) */}
            <motion.div
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '12px', // Minimalist size
                    fontWeight: 400,
                    color: '#999',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}
            >
                {highlight.reason === 'Logic Verification' ? '逻辑严密，无懈可击' : (highlight.quote || highlight.reason || 'AI 觉得很棒')}
            </motion.div>
        </motion.div>,
        document.body
    );
};
