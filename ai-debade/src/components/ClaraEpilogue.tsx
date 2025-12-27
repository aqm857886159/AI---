import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Sparkles } from 'lucide-react';

export const ClaraEpilogue: React.FC = () => {
    const { characters, praiseHistory, wordCountState } = useStore();
    const clara = characters.find(c => c.id === 'praise');

    // V18 Logic Update:
    // If we have ANY praises in history, show the component.
    // In a real app, we might want to only show for the *current* session or *current* document.
    // For now, if there's history, we show it.

    // Sort by timestamp descending
    const sortedHistory = [...praiseHistory].sort((a, b) => b.timestamp - a.timestamp);
    const recentPraises = sortedHistory.slice(0, 5);
    const hasPraises = recentPraises.length > 0;

    console.log('[ClaraEpilogue] Check:', { hasCharacter: !!clara, praiseCount: praiseHistory.length, show: hasPraises });

    if (!clara || !hasPraises) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="clara-epilogue-container"
            style={{
                marginTop: '64px',
                marginBottom: '40px',
                padding: '32px',
                background: '#ECFDF5', // Emerald 50
                borderRadius: '16px',
                borderLeft: '4px solid #059669', // Emerald 600
                position: 'relative',
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start'
            }}
        >
            {/* Avatar Section */}
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '3px solid #059669',
                    background: 'white',
                    marginBottom: '8px'
                }}>
                    <img
                        src={clara.avatar}
                        alt={clara.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: '#059669',
                    fontSize: '14px'
                }}>
                    {clara.name}
                </div>
            </div>

            {/* Content Section */}
            <div style={{ flex: 1 }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    color: '#047857', // Emerald 700
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Sparkles size={20} />
                    <span>你的专属高光时刻</span>
                </h3>

                <div className="praise-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recentPraises.map((p, i) => (
                        <div key={p.id} style={{
                            background: 'rgba(255,255,255,0.6)',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(5, 150, 105, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{
                                    background: '#059669', color: 'white',
                                    fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                                    fontWeight: 600, textTransform: 'uppercase'
                                }}>
                                    {p.type.replace('_', ' ')}
                                </span>
                                <span style={{ fontWeight: 600, color: '#047857' }}>{p.wow}</span>
                            </div>
                            <p style={{ margin: 0, color: '#065F46', fontSize: '15px', lineHeight: 1.5 }}>
                                {p.reason}
                            </p>
                            {p.quote && (
                                <div style={{
                                    marginTop: '6px',
                                    fontSize: '13px',
                                    color: '#6EE7B7', // Light green for quote
                                    fontStyle: 'italic',
                                    display: 'flex',
                                    gap: '4px'
                                }}>
                                    <span>"</span>{p.quote.slice(0, 30)}...<span>"</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '16px', textAlign: 'right', fontSize: '13px', color: '#10B981' }}>
                    —— 来自 {wordCountState.total} 字的注视
                </div>
            </div>

        </motion.div>
    );
};
