import React from 'react';
import type { PraiseHighlight } from '../types';
import { PraiseIconV16 } from './PraiseIconsV16';

interface PraiseIconsProps {
    type: PraiseHighlight['type'];
    id: string; // Required for V16 variant selection
}

export const PraiseIcons: React.FC<PraiseIconsProps> = ({ type, id }) => {
    return <PraiseIconV16 type={type} id={id} />;
};
