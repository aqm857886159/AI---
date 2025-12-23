// AI角色类型定义
export type AICharacter = {
  id: string;
  name: string;
  avatar: React.ElementType;
  avatarUrl?: string;
  personality: string;
  style: string[];
  systemPrompt: string;
  isCustom: boolean;
};

// Diff部分
export type DiffPart = {
  type: 'equal' | 'delete' | 'insert';
  text: string;
};

// 单个修改点（用于交互式修订）
export type DiffMark = {
  id: string;
  type: 'delete' | 'insert' | 'replace'; // replace = delete + insert
  originalText?: string; // delete或replace时的原文
  newText?: string; // insert或replace时的新文本
  position: { from: number; to: number }; // 在原文档中的位置
};

// 内联Diff片段
export type InlineDiffPart = {
  type: 'equal' | 'delete' | 'insert';
  text: string;
};

// 段落级修改（带内联diff）
export type ParagraphChange = {
  id: string;
  index: number;
  type: 'modified' | 'added' | 'deleted';
  originalText: string;
  improvedText?: string;
  inlineDiff?: InlineDiffPart[]; // 段落内的字符级diff
  reason?: string; // 修改理由
  nodePos: number; // ProseMirror节点位置
};

// AI全文改写（修订模式 - 段落级）
export type FullTextRewrite = {
  id: string;
  originalText: string;
  improvedText: string;
  paragraphChanges: ParagraphChange[]; // 段落级修改
  diffMarks?: DiffMark[]; // 保留向后兼容
  timestamp: number;
};

// AI建议（选中文本级别，保留用于划词功能）
export type AISuggestion = {
  id: string;
  characterId: string;
  originalText: string;
  improvedText: string;
  diff: DiffPart[];
  comment: string;
  position: {
    from: number;
    to: number;
  };
  timestamp: number;
};

// 评论类型
export type Comment = {
  id: string;
  characterId: string;
  type: 'full' | 'selection';
  content: string;
  position?: {
    from: number;
    to: number;
  };
  suggestion?: string;
  timestamp: number;
};

// OpenRouter配置
export type OpenRouterConfig = {
  apiKey: string;
  model: string;
  baseURL: string;
};

// 标题生成结果
export type TitleSuggestion = {
  title: string;
  reason: string;
};
