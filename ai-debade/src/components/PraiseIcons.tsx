import React from 'react';
import { motion } from 'framer-motion';

// --- 1. Logic: Eternal Flame (不灭之火) ---
// Continuous burning loop (Scale + Y-axis jitter)
export const EternalFlame = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path
            d="M12 2C12 2 8 8 8 13C8 17.4183 11.5817 21 16 21C16.536 21 17.0538 20.9482 17.548 20.8505C17.8427 20.7925 18 20.5348 18 20.2345V20.2345C18 19.9329 17.8384 19.6521 17.5811 19.508C16.6343 18.9774 16 17.9626 16 16.8C16 15.6374 16.6343 14.6226 17.5811 14.092C17.8384 13.9479 18 13.6671 18 13.3655V13.3655C18 13.0652 17.8427 12.8075 17.548 12.7495C17.0538 12.6518 16.536 12.6 16 12.6C16 10 12 2 12 2Z"
            fill="#FF4500"
            initial={{ scale: 0.9, opacity: 0.8 }}
            animate={{
                scale: [0.9, 1.1, 0.95, 1.05, 0.9],
                opacity: [0.8, 1, 0.9, 1, 0.8],
                filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.2, 0.5, 0.8, 1]
            }}
        />
    </svg>
);

// --- 2. Rhetoric: Starburst (璀璨星芒) ---
// Infinite rotation + Pulse
export const Starburst = () => (
    <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="#FFD700" />
        </motion.svg>
        <motion.div
            style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', border: '1px solid gold' }}
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
        />
    </div>
);

// --- 3. Emotion: Resonant Heart (共鸣之心) ---
// Infinite Heartbeat
export const ResonantHeart = () => (
    <div style={{ position: 'relative', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.svg
            viewBox="0 0 24 24" width="14" height="14" fill="#FF1493"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </motion.svg>
    </div>
);

// --- 4. Insight: Neural Zap (智慧闪电) ---
// Infinite Flash/Jitter
export const NeuralZap = () => (
    <motion.svg
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00BFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        animate={{ filter: ["drop-shadow(0 0 0px #00BFFF)", "drop-shadow(0 0 4px #00BFFF)", "drop-shadow(0 0 0px #00BFFF)"] }}
        transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
    >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#00BFFF" fillOpacity="0.2" />
    </motion.svg>
);
