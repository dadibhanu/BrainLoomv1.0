import { AuthResponse, TopicListResponse, TopicDetailResponse } from '../types';

const API_BASE_URL = 'https://api.brainloom.space/api';

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
  // slugPath handles nested slugs e.g., "parent/child"
  // Ensure we remove trailing slash if present to avoid double slash
  const cleanPath = slugPath.endsWith('/') ? slugPath.slice(0, -1) : slugPath;
  const response = await fetch(`${API_BASE_URL}/topics/slug/${cleanPath}/`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch topic details');
  }
  return response.json();
};
