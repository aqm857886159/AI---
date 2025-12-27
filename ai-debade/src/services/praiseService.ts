import { openRouterService } from './openrouter';
import type { PraiseResponse } from '../types';

const PRAISE_SYSTEM_PROMPT = `
你是一位精通网络流行语且文学造诣极高的"互联网嘴替"兼"文学评论家"。
你的任务是：找出文中精彩的 1-3 个句子，并给予"双重维度"的混合夸奖。

请返回 JSON 格式：
{
  "highlights": [
    {
      "id": "unique_id_1", 
      "quote": "原文句子",
      "type": "rhetoric" | "insight" | "emotion" | "logic", 
      "wow": "大白话夸赞 (2-5字)",
      "reason": "深度赏析理由 (6-15字，必须严格控制字数)"
    }
  ]
}

要求：
1. **wow 字段 (网友嘴替)**: 使用当前最流行的互联网大白话，情绪要激动，简短有力。
   - 例子: "绝绝子", "狠狠懂了", "膝盖给你", "封神", "破防了", "太会写了", "人间清醒".
2. **reason 字段 (学院派)**: 回归专业视角，一针见血地指出好在哪里，必须控制在6-15个字以内（含标点）。
   - ✅ 好例子 (6-15字): "逻辑严密无懈可击", "画面感极强", "直击人心", "层层递进".
   - ❌ 坏例子 (超过15字): "比喻极具张力，画面感极强", "逻辑闭环，层层递进无懈可击".
3. **type 分类指南**:
   - logic: 逻辑严密、犀利、解构
   - emotion: 感人、治愈、共鸣
   - rhetoric: 文采、修辞、华丽
   - insight: 洞察、深度、哲理
`;

// V17: Incremental Praise System Prompt
const INCREMENTAL_PRAISE_PROMPT = `
你是用户的写作教练，持续给予鼓励反馈。

## 任务
分析用户最近写的文字（约300字），给予1-2个鼓励性夸奖。

## 夸奖策略（优先级从高到低）

1. **golden_sentence** (优先：如果发现精彩句子)
   - 筛选标准：观点密度高、表达独特、情感冲击强、可独立传播
   - 输出字段：quote (原文句子), wow (2-5字), reason (6-15字)

2. **fluency** (文笔流畅时)
   - wow例子："文笔流畅", "行云流水"
   - reason例子："一气呵成，读来畅快"

3. **logic** (逻辑清晰时)
   - wow例子："思路清晰", "逻辑严密"  
   - reason例子："层次分明，条理清楚"

4. **emotion** (情感真挚时)
   - wow例子："真情实感", "很有共鸣"
   - reason例子："情感细腻，引人共鸣"

5. **progress** (无明显亮点时的兜底)
   - wow例子："写得不错", "状态很好"
   - reason例子："保持节奏，继续加油"

## 输出格式
{
  "praises": [
    {
      "type": "golden_sentence|fluency|logic|emotion|progress",
      "quote": "原文句子（仅golden_sentence需要）",
      "wow": "2-5字夸奖",
      "reason": "6-15字理由"
    }
  ]
}

## 约束
- 每次只返回1-2个夸奖
- 优先夸金句，没有就夸状态/流畅/逻辑
- 避免重复夸同一内容
- quote字段仅在golden_sentence时才需要
`;

export const praiseService = {
    async generatePraise(content: string): Promise<PraiseResponse | null> {
        const userPrompt = `Analysis Target:\n${content}\n\nPlease output valid JSON only.`;

        try {
            const response = await openRouterService.chat([
                { role: 'system', content: PRAISE_SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ], 0.8); // High temp for creative hooks

            let cleaned = response.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const data = JSON.parse(cleaned);

            // Generate IDs if missing (fallback)
            if (data.highlights && Array.isArray(data.highlights)) {
                data.highlights.forEach((h: any, index: number) => {
                    if (!h.id) h.id = `praise-${Date.now()}-${index}`;
                    if (!h.wow) h.wow = "✨ 眼前一亮！"; // Fallback wow
                });
            }

            return data as PraiseResponse;

        } catch (e) {
            console.error('Praise Generation Failed:', e);
            return null;
        }
    },

    // V17: Incremental Praise Generation
    async generateIncrementalPraise(
        fullContent: string,
        lastPosition: number
    ): Promise<import('../types').IncrementalPraiseResponse | null> {
        // Extract recent content (sliding window: last 500 chars)
        const recentContent = fullContent.slice(
            Math.max(0, fullContent.length - 500)
        );

        const userPrompt = `分析内容:\n${recentContent}\n\nPlease output valid JSON only.`;

        try {
            const response = await openRouterService.chat([
                { role: 'system', content: INCREMENTAL_PRAISE_PROMPT },
                { role: 'user', content: userPrompt }
            ], 0.7); // Slightly lower temp for consistency

            let cleaned = response.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const data = JSON.parse(cleaned);
            return data as import('../types').IncrementalPraiseResponse;

        } catch (e) {
            console.error('Incremental Praise Generation Failed:', e);
            return null;
        }
    },

    // V17: Bulk Praise Generation (For Paste/Import)
    async generateBulkPraise(
        fullContent: string,
        targetCount: number
    ): Promise<import('../types').IncrementalPraiseResponse | null> {
        // Use full content for bulk analysis, but capped to save tokens if extremely long
        // Analyzing up to 5000 chars is usually enough for a 2000 word essay
        const analyzedContent = fullContent.slice(0, 5000);

        const BULK_PROMPT = `
你是用户的写作教练。用户刚刚导入了一篇长文，你需要进行整体分析并给予鼓励。

## 任务
在全文范围内寻找 ${targetCount} 个具体的亮点进行夸奖。

## 关键要求
1. **分布均匀**: 务必在文章的【前段】、【中段】、【后段】都找到亮点，严禁全部集中在结尾。
2. **数量控制**: 请严格输出 ${targetCount} 条夸奖。
3. **夸奖策略**:
   - 优先寻找 **golden_sentence** (金句/观点)
   - 其次寻找 **logic** (结构/逻辑)
   - 再次寻找 **emotion** (情感/共鸣)
   - 包含至少 1 条 **progress** (整体完成度/立意)

## 输出格式
{
  "praises": [
    {
      "type": "golden_sentence|fluency|logic|emotion|progress",
      "quote": "原文引用（必填）",
      "wow": "简短夸奖(2-5字)",
      "reason": "具体理由(最多50字,严格限制!)"
    }
  ]
}

## 语气要求
- 像一个热情的朋友，不要像机器人。
- **Clara (Praise AI)** 特别喜欢用 emoji。
- **严禁废话**，直接说重点。
- **理由字数严格控制在50字以内，超出将被截断！**
}
`;

        const userPrompt = `全文内容(前5000字):\n${analyzedContent}\n\n请输出 ${targetCount} 条分布均匀的夸奖。Please output valid JSON only.`;

        try {
            const response = await openRouterService.chat([
                { role: 'system', content: BULK_PROMPT },
                { role: 'user', content: userPrompt }
            ], 0.7);

            let cleaned = response.trim();
            if (cleaned.startsWith('```')) {
                cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const data = JSON.parse(cleaned);
            return data as import('../types').IncrementalPraiseResponse;

        } catch (e) {
            console.error('Bulk Praise Generation Failed:', e);
            return null;
        }
    }
};
