
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TopicMetadata {
  tags?: string[];
  [key: string]: any;
}

export interface Topic {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  is_published: number;
  order_no: number;
  created_at: string;
  full_path?: string;
  children?: Topic[];
}

export interface TopicListResponse {
  count: number;
  topics: Topic[];
}

export interface JsonBlockContent {
  type: string;
  content: string; // This is the HTML/XML mixed string
  updated_at: string;
}

export interface ComponentBlock {
  type: string;
  json: JsonBlockContent;
}

export interface Block {
  id: number;
  topic_id: number;
  block_type: string;
  block_order: number;
  components: ComponentBlock[];
  metadata: TopicMetadata | null;
}

export interface TopicDetailResponse {
  topic: Topic;
  blocks: Block[];
  children: Topic[];
}

// Editor Types
export type BlockType = 'text' | 'heading' | 'code' | 'multi-code' | 'note' | 'image' | 'carousel';

export interface CarouselImage {
  id: string;
  url: string;
  caption: string;
}

export interface CodeSnippet {
  id: string;
  label: string;
  language: string;
  content: string;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    language?: string;
    level?: 'info' | 'warning' | 'tip';
    fontSize?: 'sm' | 'base' | 'lg' | 'xl';
    images?: CarouselImage[];
    snippets?: CodeSnippet[];
  };
}
