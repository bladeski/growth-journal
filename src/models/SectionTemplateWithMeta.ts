import { ISectionTemplate } from './ISectionTemplate.ts';

export type SectionTemplateWithMeta = ISectionTemplate & { value?: string; challenge?: string };
