import React from 'react';
import './GlitchText.css';

interface GlitchTextProps {
    children: React.ReactNode;
    duration?: number;
    color1?: string;
    color2?: string;
}

export const GlitchText: React.FC<GlitchTextProps> = ({ children }) => {
    // Extract text content for the data-text attribute
    let validText = "";

    if (typeof children === 'string') {
        validText = children;
    } else if (React.isValidElement(children)) {
        const props = children.props as { children?: string };
        if (props && typeof props.children === 'string') {
            validText = props.children;
        }
    }

    return (
        <div className="glitch-wrapper" data-text={validText}>
            {children}
        </div>
    );
};
