/**
 * @module components/praise/CinematicPraise
 * @description 夸夸电影级动效组件 - 单一职责：渲染夸夸点击后的视觉效果
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useStore } from '../../store/useStore';
import type { PraiseHighlight, PraiseType } from '../../features/praise/types';
import { PraiseIcons } from './PraiseIcons';

// 视觉效果变体
type VisualVariant =
    | 'circuit' | 'halo' | 'pulse'
    | 'ember' | 'drop'
    | 'ink' | 'glint' | 'bounce'
    | 'confetti';

const getVariant = (type: PraiseType, id: string): VisualVariant => {
    const hash = id.charCodeAt(id.length - 1);
    const index = hash % 3;

    switch (type) {
        case 'logic': return ['circuit', 'halo', 'pulse'][index] as VisualVariant;
        case 'emotion': return ['ember', 'pulse', 'drop'][index] as VisualVariant;
        case 'rhetoric': return ['ink', 'glint', 'bounce'][index] as VisualVariant;
        case 'insight': return ['confetti', 'halo', 'glint'][index] as VisualVariant;
        case 'golden_sentence': return ['confetti', 'glint', 'halo'][index] as VisualVariant;
        case 'fluency': return ['drop', 'ink', 'pulse'][index] as VisualVariant;
        case 'progress': return ['halo', 'pulse', 'glint'][index] as VisualVariant;
        default: return 'confetti';
    }
};

// 效果组件
const PulseRings = ({ x, y }: { x: number, y: number }) => (
    <div style={{ position: 'fixed', left: x, top: y, pointerEvents: 'none', zIndex: 9998, transform: 'translate(-50%, -50%)' }}>
        {[0, 1, 2].map(i => (
            <motion.div
                key={i}
                initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 20 }}
                animate={{ width: 300, height: 300, opacity: 0, borderWidth: 0 }}
                transition={{ duration: 1.5, delay: i * 0.3, ease: "easeOut" }}
                style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    borderRadius: '50%', border: 'solid #FF4081', background: 'transparent',
                    boxSizing: 'border-box'
                }}
            />
        ))}
    </div>
);

const HaloWave = ({ x, y }: { x: number, y: number }) => (
    <motion.div
        initial={{ width: 0, height: 0, opacity: 1, boxShadow: '0 0 0 0px rgba(0,255,100,0.8)' }}
        animate={{ width: 400, height: 400, opacity: 0, boxShadow: '0 0 20px 50px rgba(0,255,100,0)' }}
        transition={{ duration: 0.8, ease: "circOut" }}
        style={{
            position: 'fixed', left: x, top: y, zIndex: 9998,
            borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none'
        }}
    />
);

const GlintStar = ({ x, y }: { x: number, y: number }) => (
    <motion.svg width="200" height="200" viewBox="0 0 100 100"
        style={{ position: 'fixed', left: x - 100, top: y - 100, zIndex: 9999, pointerEvents: 'none' }}
        initial={{ scale: 0, rotate: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 0], rotate: 45, opacity: [0, 1, 0] }}
        transition={{ duration: 1.2, times: [0, 0.4, 1] }}
    >
        <path d="M50 0 L55 45 L100 50 L55 55 L50 100 L45 55 L0 50 L45 45 Z" fill="url(#grad1)" />
        <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%">
                <stop offset="0%" style={{ stopColor: '#FFD700', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#FFD700', stopOpacity: 0 }} />
            </radialGradient>
        </defs>
    </motion.svg>
);

// 粒子效果触发
const triggerPhysics = (x: number, y: number, variant: VisualVariant) => {
    const normX = x / window.innerWidth;
    const normY = y / window.innerHeight;

    const configs: Record<VisualVariant, any> = {
        circuit: { particleCount: 40, spread: 90, colors: ['#00FF00', '#003300'], shapes: ['square'], scalar: 0.6, gravity: 0.5 },
        halo: { particleCount: 60, spread: 360, colors: ['#FFFFFF', '#00FFFF', '#E0FFFF'], shapes: ['circle'], scalar: 0.7, startVelocity: 20, gravity: 0.3 },
        ember: { particleCount: 50, spread: 60, colors: ['#ff4500', '#ffa500'], shapes: ['circle'], gravity: -0.5, drift: 0.5, scalar: 0.8, ticks: 100 },
        pulse: { particleCount: 40, spread: 120, colors: ['#FF4081', '#FF1744', '#F50057'], shapes: ['circle'], scalar: 1.0, startVelocity: 25, gravity: 0.6 },
        drop: { particleCount: 30, spread: 360, colors: ['#00BFFF', '#1E90FF', '#87CEEB'], shapes: ['circle'], scalar: 0.8, gravity: 0.5, drift: 0.2 },
        ink: { particleCount: 15, spread: 30, colors: ['#000000', '#333333'], shapes: ['circle'], scalar: 2.5, gravity: 0.2, decay: 0.9, ticks: 200 },
        glint: { particleCount: 50, spread: 100, colors: ['#FFD700', '#FFA500', '#FFFF00'], shapes: ['star', 'circle'], scalar: 0.9, startVelocity: 30, gravity: 0.4 },
        bounce: { particleCount: 20, spread: 180, startVelocity: 40, gravity: 1.5, decay: 0.85, shapes: ['circle'], colors: ['#FFD700', '#000'] },
        confetti: { particleCount: 150, spread: 100, colors: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'] },
    };

    confetti({
        origin: { x: normX, y: normY },
        ...configs[variant],
    });
};

// 主组件
interface EffectEvent {
    x: number;
    y: number;
    highlight: PraiseHighlight;
    variant: VisualVariant;
}

export function CinematicPraise() {
    const [activeEffect, setActiveEffect] = useState<EffectEvent | null>(null);
    const { markPraiseAsRead } = useStore.getState();

    useEffect(() => {
        const handlePraiseClick = (e: Event) => {
            const customEvent = e as CustomEvent<{ x: number, y: number, highlight: PraiseHighlight }>;
            const { x, y, highlight } = customEvent.detail;
            const variant = getVariant(highlight.type, highlight.id);

            triggerPhysics(x, y, variant);
            setActiveEffect({ x, y, highlight, variant });

            if (typeof markPraiseAsRead === 'function') {
                markPraiseAsRead(highlight.id);
            }
        };

        window.addEventListener('praise-click', handlePraiseClick);
        return () => window.removeEventListener('praise-click', handlePraiseClick);
    }, []);

    useEffect(() => {
        if (activeEffect) {
            const timer = setTimeout(() => setActiveEffect(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [activeEffect]);

    const renderVisuals = () => {
        if (!activeEffect) return null;
        const { x, y, variant } = activeEffect;

        switch (variant) {
            case 'pulse': return <PulseRings x={x} y={y} />;
            case 'halo': return <HaloWave x={x} y={y} />;
            case 'glint': return <GlintStar x={x} y={y} />;
            case 'drop': return <PulseRings x={x} y={y} />;
            default: return null;
        }
    };

    return createPortal(
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700;900&display=swap');
            `}</style>

            <AnimatePresence>
                {activeEffect && (
                    <>
                        {renderVisuals()}

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}
                            style={{
                                position: 'fixed',
                                left: Math.max(20, activeEffect.x - 200),
                                top: activeEffect.y - 40,
                                zIndex: 10000,
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '10px',
                                maxWidth: 'calc(100vw - 40px)',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ transform: 'scale(1.2)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', flexShrink: 0 }}>
                                <PraiseIcons type={activeEffect.highlight.type} id={activeEffect.highlight.id} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flexShrink: 1 }}>
                                <span style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#000',
                                    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', sans-serif",
                                    textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                }}>
                                    {activeEffect.highlight.wow}
                                </span>

                                <span style={{ fontSize: '20px', color: '#999', fontWeight: 300, flexShrink: 0 }}>·</span>

                                <span style={{
                                    fontSize: '22px',
                                    color: '#333',
                                    fontWeight: 500,
                                    fontFamily: "'Noto Sans SC', 'Source Han Sans SC', sans-serif",
                                    textShadow: '0 1px 3px rgba(255,255,255,0.8)',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {activeEffect.highlight.reason}
                                </span>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>,
        document.body
    );
}
