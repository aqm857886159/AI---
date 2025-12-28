/**
 * @module components/praise/PraiseIcons
 * @description 夸夸图标组件 - 单一职责：根据夸夸类型渲染动画图标
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
    Zap, Brain, Lightbulb,
    Heart, Flame, Smile,
    Sparkles, Feather, Stars,
    Eye, Telescope, Target
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PraiseType } from '../../features/praise/types';

interface PraiseIconsProps {
    type: PraiseType;
    id: string;
}

// 存储已使用的变体以避免重复
const usedVariants = new Map<string, number[]>();

const getColorByType = (type: PraiseType): string => {
    switch (type) {
        case 'logic': return '#00BFFF';
        case 'emotion': return '#FF1493';
        case 'rhetoric': return '#FFD700';
        case 'insight': return '#9370DB';
        case 'golden_sentence': return '#FFA500';
        case 'fluency': return '#00CED1';
        case 'progress': return '#32CD32';
        default: return '#000';
    }
};

const getAnimationProps = (type: PraiseType) => {
    switch (type) {
        case 'logic':
            return {
                initial: { scale: 0.8, opacity: 0 },
                animate: { scale: [0.8, 1.1, 1], opacity: [0, 1, 1], rotate: [0, 5, -5, 0] },
                transition: { duration: 0.6, times: [0, 0.5, 1] }
            };
        case 'emotion':
            return {
                initial: { scale: 0.5 },
                animate: { scale: [0.5, 1.2, 1] },
                transition: { duration: 0.5, times: [0, 0.6, 1], repeat: Infinity, repeatDelay: 1 }
            };
        case 'rhetoric':
            return {
                initial: { scale: 0, rotate: -30 },
                animate: { scale: [0, 1.15, 1], rotate: [-30, 10, 0] },
                transition: { duration: 0.7, times: [0, 0.7, 1] }
            };
        case 'insight':
        case 'golden_sentence':
        case 'fluency':
        case 'progress':
        default:
            return {
                initial: { scale: 0.7, opacity: 0 },
                animate: { scale: [0.7, 1, 0.95, 1], opacity: [0, 1, 0.8, 1] },
                transition: { duration: 0.8, times: [0, 0.4, 0.7, 1] }
            };
    }
};

export const PraiseIcons: React.FC<PraiseIconsProps> = ({ type, id }) => {
    const getIconVariant = (): LucideIcon => {
        const typeKey = type;
        const recentVariants = usedVariants.get(typeKey) || [];
        const hash = id.charCodeAt(id.length - 1) % 3;

        let selectedVariant: number;
        if (recentVariants.includes(hash) && recentVariants.length < 3) {
            selectedVariant = [0, 1, 2].find(v => !recentVariants.includes(v)) || hash;
        } else {
            selectedVariant = hash;
        }

        const updated = [...recentVariants, selectedVariant].slice(-2);
        usedVariants.set(typeKey, updated);

        switch (type) {
            case 'logic':
                return [Zap, Brain, Lightbulb][selectedVariant];
            case 'emotion':
                return [Heart, Flame, Smile][selectedVariant];
            case 'rhetoric':
                return [Sparkles, Feather, Stars][selectedVariant];
            case 'insight':
                return [Eye, Telescope, Target][selectedVariant];
            case 'golden_sentence':
                return [Stars, Sparkles, Zap][selectedVariant];
            case 'fluency':
                return [Feather, Smile, Heart][selectedVariant];
            case 'progress':
                return [Target, Brain, Lightbulb][selectedVariant];
            default:
                return [Sparkles, Stars, Zap][selectedVariant];
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

export const clearIconHistory = () => usedVariants.clear();
