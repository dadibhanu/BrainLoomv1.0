import { AuthResponse, TopicListResponse, TopicDetailResponse, Topic } from '../types';

const API_BASE_URL = 'https://api.brainloom.in/api';

// Helper to get headers with Auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, as: 'admin' }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json();
};

export const fetchRootTopics = async (): Promise<TopicListResponse> => {
  const response = await fetch(`${API_BASE_URL}/topics/root`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch topics');
  }
  return response.json();
};

export const fetchTopicBySlug = async (slugPath: string): Promise<TopicDetailResponse> => {
  const cleanPath = slugPath.endsWith('/') ? slugPath.slice(0, -1) : slugPath;
  const encodedPath = encodeURIComponent(cleanPath);
  
  const response = await fetch(`${API_BASE_URL}/topics/slug/${encodedPath}`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch topic details (${response.status})`);
  }
  return response.json();
};

export const createTopic = async (data: { 
  title: string; 
  slug: string; 
  description: string; 
  parent_id: number | null; 
  order_no: number 
}): Promise<Topic> => {
  const payload = {
    ...data,
    parentId: data.parent_id,
    order: data.order_no
  };
  
  const response = await fetch(`${API_BASE_URL}/topics/add`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create topic');
  }
  return response.json();
};

export const deleteTopic = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/topics/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete topic');
  }
};

export const saveTopicContent = async (topicId: number, content: string, blockId?: number): Promise<void> => {
  const payload = {
    topic_id: topicId,
    block_type: "page",
    block_order: 0,
    metadata: {
        tags: ["JSON", "Editor"]
    },
    components: [
        {
            type: "json_block",
            json: {
                type: "rich_text",
                content: content,
                updated_at: new Date().toISOString()
            }
        }
    ]
  };

  // Correct Method Selection: POST to create, PUT to update
  const url = blockId 
    ? `${API_BASE_URL}/content-blocks/${blockId}` 
    : `${API_BASE_URL}/topics/${topicId}/content`;

  const response = await fetch(url, {
    method: blockId ? 'PUT' : 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to save content');
  }
};

export const uploadMedia = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/upload/server`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  // Return the S3 URL from the successful response
  return data.files?.[0]?.url || '';
};