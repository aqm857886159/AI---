import { useEffect, useState } from 'react'; // Removed: useRef (no longer used)
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
// Removed: import { GlitchText } from './GlitchText'; (no longer used)
import { useStore } from '../store/useStore';
import type { PraiseHighlight } from '../types';
import { PraiseIcons } from './PraiseIconsWrapper';

// MAPPING: 4 Types -> 10 Lightweight Variants (removed matrix, glitch, blur)
type VisualVariant =
    | 'circuit' | 'halo' | 'pulse'       // Logic (removed 'matrix')
    | 'ember' | 'pulse' | 'drop'         // Emotion
    | 'ink' | 'glint' | 'bounce'         // Rhetoric
    | 'confetti' | 'halo' | 'glint';     // Insight (removed 'glitch', 'blur')

const getVariant = (type: PraiseHighlight['type'], id: string): VisualVariant => {
    const hash = id.charCodeAt(id.length - 1);
    const index = hash % 3;

    switch (type) {
        case 'logic': return ['circuit', 'halo', 'pulse'][index] as VisualVariant;
        case 'emotion': return ['ember', 'pulse', 'drop'][index] as VisualVariant;
        case 'rhetoric': return ['ink', 'glint', 'bounce'][index] as VisualVariant;
        case 'insight': return ['confetti', 'halo', 'glint'][index] as VisualVariant;
    }
};

// --- EFFECT COMPONENTS (Removed: MatrixRain - heavy fullscreen effect) ---

const PulseRings = ({ x, y }: { x: number, y: number }) => {
    return (
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
};

const HaloWave = ({ x, y }: { x: number, y: number }) => {
    return (
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
};

const GlintStar = ({ x, y }: { x: number, y: number }) => {
    return (
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
};

// TRIGGER PHYSICS (Canvas Confetti)
const triggerPhysics = (x: number, y: number, variant: VisualVariant) => {
    const normX = x / window.innerWidth;
    const normY = y / window.innerHeight;

    // === Logic variants ===
    // Removed: 'matrix' (heavy full-screen effect)
    if (variant === 'circuit') {
        // Green Squares (circuit board effect)
        confetti({
            particleCount: 40,
            spread: 90,
            origin: { x: normX, y: normY },
            colors: ['#00FF00', '#003300'],
            shapes: ['square'],
            scalar: 0.6,
            gravity: 0.5
        });
    }
    else if (variant === 'halo') {
        // White/cyan ethereal particles
        confetti({
            particleCount: 60,
            spread: 360,
            origin: { x: normX, y: normY },
            colors: ['#FFFFFF', '#00FFFF', '#E0FFFF'],
            shapes: ['circle'],
            scalar: 0.7,
            startVelocity: 20,
            gravity: 0.3
        });
    }
    // === Emotion variants ===
    else if (variant === 'ember') {
        // Rising fire particles (negative gravity)
        confetti({
            particleCount: 50,
            spread: 60,
            origin: { x: normX, y: normY },
            colors: ['#ff4500', '#ffa500'],
            shapes: ['circle'],
            gravity: -0.5,
            drift: 0.5,
            scalar: 0.8,
            ticks: 100
        });
    }
    else if (variant === 'pulse') {
        // Pink/red heartbeat particles
        confetti({
            particleCount: 40,
            spread: 120,
            origin: { x: normX, y: normY },
            colors: ['#FF4081', '#FF1744', '#F50057'],
            shapes: ['circle'],
            scalar: 1.0,
            startVelocity: 25,
            gravity: 0.6
        });
    }
    else if (variant === 'drop') {
        // Blue water droplets
        confetti({
            particleCount: 30,
            spread: 360,
            origin: { x: normX, y: normY },
            colors: ['#00BFFF', '#1E90FF', '#87CEEB'],
            shapes: ['circle'],
            scalar: 0.8,
            gravity: 0.5,
            drift: 0.2
        });
    }
    // === Rhetoric variants ===
    else if (variant === 'ink') {
        // Black ink droplets
        confetti({
            particleCount: 15,
            spread: 30,
            origin: { x: normX, y: normY },
            colors: ['#000000', '#333333'],
            shapes: ['circle'],
            scalar: 2.5,
            gravity: 0.2,
            decay: 0.9,
            ticks: 200
        });
    }
    else if (variant === 'glint') {
        // Golden sparkles
        confetti({
            particleCount: 50,
            spread: 100,
            origin: { x: normX, y: normY },
            colors: ['#FFD700', '#FFA500', '#FFFF00'],
            shapes: ['star', 'circle'],
            scalar: 0.9,
            startVelocity: 30,
            gravity: 0.4
        });
    }
    else if (variant === 'bounce') {
        // Bouncing colorful balls
        confetti({
            particleCount: 20,
            spread: 180,
            origin: { x: normX, y: normY },
            startVelocity: 40,
            gravity: 1.5,
            decay: 0.85,
            shapes: ['circle'],
            colors: ['#FFD700', '#000']
        });
    }
    // === Insight variants ===
    // Removed: 'glitch', 'blur' (obstructive effects)
    if (variant === 'confetti') {
        // Full rainbow party confetti
        confetti({
            particleCount: 150,
            spread: 100,
            origin: { x: normX, y: normY },
            colors: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f']
        });
    }
};

// --- MAIN COMPONENT ---

interface EffectEvent {
    x: number;
    y: number;
    highlight: PraiseHighlight;
    variant: VisualVariant;
}

export const CinematicPraise = () => {
    const [activeEffect, setActiveEffect] = useState<EffectEvent | null>(null);
    const { markPraiseAsRead } = useStore.getState();

    useEffect(() => {
        console.log('[CinematicPraise] Component mounted, attaching praise-click listener');
        const handlePraiseClick = (e: Event) => {
            console.log('[CinematicPraise] praise-click event received!', e);
            const customEvent = e as CustomEvent<{ x: number, y: number, highlight: PraiseHighlight }>;
            const { x, y, highlight } = customEvent.detail;
            const variant = getVariant(highlight.type, highlight.id);

            console.log('[CinematicPraise] Triggering physics:', { x, y, variant });
            triggerPhysics(x, y, variant);
            setActiveEffect({ x, y, highlight, variant });

            if (typeof markPraiseAsRead === 'function') markPraiseAsRead(highlight.id);
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
            // Removed: case 'matrix' (heavy full-screen effect)
            case 'pulse': return <PulseRings x={x} y={y} />;
            case 'halo': return <HaloWave x={x} y={y} />;
            case 'glint': return <GlintStar x={x} y={y} />;
            case 'drop': return <PulseRings x={x} y={y} />;
            // Removed: case 'glitch', case 'blur' (obstructive effects)
            default: return null; // Lightweight confetti particles only
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

                        {/* FLOATING TEXT OVERLAY (Single Horizontal Line) */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10, transition: { duration: 0.5 } }}
                            style={{
                                position: 'fixed',
                                left: Math.max(20, activeEffect.x - 200), // 往左移，但保证不超出左边界
                                top: activeEffect.y - 40,
                                zIndex: 10000, // Restored: Proper decoupling via revision mode exclusion in EditorNew.tsx
                                pointerEvents: 'none',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '10px',
                                maxWidth: 'calc(100vw - 40px)', // 限制总宽度
                                overflow: 'hidden'
                            }}
                        >
                            {/* Icon */}
                            <div style={{ transform: 'scale(1.2)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', flexShrink: 0 }}>
                                <PraiseIcons type={activeEffect.highlight.type} id={activeEffect.highlight.id} />
                            </div>

                            {/* Mantra + Separator + Reason (All in one line) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flexShrink: 1 }}>
                                {/* Mantra (removed GlitchText wrapper) */}
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

                                {/* Separator */}
                                <span style={{
                                    fontSize: '20px',
                                    color: '#999',
                                    fontWeight: 300,
                                    flexShrink: 0
                                }}>·</span>

                                {/* Reason */}
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
};
