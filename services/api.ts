import { AuthResponse, TopicListResponse, TopicDetailResponse, Topic } from '../types';

const API_BASE_URL = 'https://api.brainloom.space/api';

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
  const response = await fetch(`${API_BASE_URL}/topics/root`);
  if (!response.ok) {
    throw new Error('Failed to fetch topics');
  }
  return response.json();
};

export const fetchTopicBySlug = async (slugPath: string): Promise<TopicDetailResponse> => {
  const cleanPath = slugPath.endsWith('/') ? slugPath.slice(0, -1) : slugPath;
  const response = await fetch(`${API_BASE_URL}/topics/slug/${cleanPath}/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch topic details');
  }
  return response.json();
};

// --- Admin Functions ---

export const createTopic = async (data: { 
  title: string; 
  slug: string; 
  description: string; 
  parent_id: number | null; 
  order_no: number 
}): Promise<Topic> => {
  const payload = {
    ...data,
    parentId: data.parent_id, // Map for API consistency if backend expects camelCase for root
    order: data.order_no // Map for API consistency
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

export const reorderTopics = async (parentId: number | 'root', items: { id: number; order_no: number }[]): Promise<void> => {
  const endpoint = parentId === 'root' 
    ? `${API_BASE_URL}/topics/root/reorder` // Assuming root reorder endpoint follows pattern
    : `${API_BASE_URL}/topics/${parentId}/reorder`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(items),
  });

  if (!response.ok) {
    // Fallback: If strict root reorder endpoint doesn't exist, we might need a specific one.
    // Based on prompt: topics/428/reorder. 
    throw new Error('Failed to save order');
  }
};