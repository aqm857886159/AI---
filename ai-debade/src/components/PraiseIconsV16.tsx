import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap, Brain, Lightbulb,
    Heart, Flame, Smile,
    Sparkles, Feather, Stars,
    Eye, Telescope, Target
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PraiseHighlight } from '../types';

interface PraiseIconV16Props {
    type: PraiseHighlight['type'];
    id: string;
}

// Store used variants to avoid repetition in same session
const usedVariants = new Map<string, number[]>();

const getColorByType = (type: PraiseHighlight['type']): string => {
    switch (type) {
        case 'logic': return '#00BFFF';      // Blue
        case 'emotion': return '#FF1493';    // Deep Pink
        case 'rhetoric': return '#FFD700';   // Gold
        case 'insight': return '#9370DB';    // Purple
        default: return '#000';
    }
};

// Animation variants for each icon type
const getAnimationProps = (type: PraiseHighlight['type']) => {
    switch (type) {
        case 'logic':
            return {
                initial: { scale: 0.8, opacity: 0 },
                animate: {
                    scale: [0.8, 1.1, 1],
                    opacity: [0, 1, 1],
                    rotate: [0, 5, -5, 0],
                },
                transition: { duration: 0.6, times: [0, 0.5, 1] }
            };
        case 'emotion':
            return {
                initial: { scale: 0.5 },
                animate: {
                    scale: [0.5, 1.2, 1],
                },
                transition: { duration: 0.5, times: [0, 0.6, 1], repeat: Infinity, repeatDelay: 1 }
            };
        case 'rhetoric':
            return {
                initial: { scale: 0, rotate: -30 },
                animate: {
                    scale: [0, 1.15, 1],
                    rotate: [-30, 10, 0],
                },
                transition: { duration: 0.7, times: [0, 0.7, 1] }
            };
        case 'insight':
            return {
                initial: { scale: 0.7, opacity: 0 },
                animate: {
                    scale: [0.7, 1, 0.95, 1],
                    opacity: [0, 1, 0.8, 1],
                },
                transition: { duration: 0.8, times: [0, 0.4, 0.7, 1] }
            };
    }
};

export const PraiseIconV16: React.FC<PraiseIconV16Props> = ({ type, id }) => {
    // Determine icon variant
    const getIconVariant = (): LucideIcon => {
        // Smart selection: avoid recent variants for this type
        const typeKey = type;
        const recentVariants = usedVariants.get(typeKey) || [];

        // Calculate hash-based variant
        const hash = id.charCodeAt(id.length - 1) % 3;

        // If this variant was used recently, try next one
        let selectedVariant: number;
        if (recentVariants.includes(hash) && recentVariants.length < 3) {
            selectedVariant = [0, 1, 2].find(v => !recentVariants.includes(v)) || hash;
        } else {
            selectedVariant = hash;
        }

        // Update usage tracking (keep last 2)
        const updated = [...recentVariants, selectedVariant].slice(-2);
        usedVariants.set(typeKey, updated);

        // Map to icon component
        switch (type) {
            case 'logic':
                return [Zap, Brain, Lightbulb][selectedVariant];
            case 'emotion':
                return [Heart, Flame, Smile][selectedVariant];
            case 'rhetoric':
                return [Sparkles, Feather, Stars][selectedVariant];
            case 'insight':
                return [Eye, Telescope, Target][selectedVariant];
        }
    };

    const IconComponent = getIconVariant();
    const color = getColorByType(type);
    const animationProps = getAnimationProps(type);

    const MotionIcon = motion(IconComponent as any);

    return (
        <MotionIcon
            size={18}
            strokeWidth={2.5}
            color={color}
            style={{ filter: `drop-shadow(0 1px 3px ${color}40)` }}
            {...animationProps}
        />
    );
};

// Export for testing/debugging
export const clearIconHistory = () => usedVariants.clear();
