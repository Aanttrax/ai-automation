export const LABELS = ['AI/SPAM', 'AI/JOBS', 'AI/IMPORTANT', 'AI/NEWS', 'AI/OTHER'] as const;

export type LabelType = (typeof LABELS)[number];
