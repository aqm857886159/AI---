// AI夸夸（高光时刻）数据类型

export type PraiseType = 'insight' | 'rhetoric' | 'emotion' | 'punch';

export interface PraiseHighlight {
    quote: string;
    type: PraiseType;
    reason: string;
}

export interface PraiseResponse {
    highlights: PraiseHighlight[];
}
