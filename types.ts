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

export interface BreadcrumbItem {
  label: string;
  path: string;
}
