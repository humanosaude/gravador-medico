/**
 * InstaFlow - Tipos TypeScript
 */

// =====================================================
// DATABASE TYPES (correspondentes às tabelas Supabase)
// =====================================================

export interface DBInstagramAccount {
  id: string;
  user_id: string;
  instagram_business_account_id: string;
  instagram_user_id?: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  biography?: string;
  website?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  facebook_page_id: string;
  facebook_page_name?: string;
  facebook_page_access_token?: string;
  access_token: string;
  token_type: 'user' | 'page';
  token_expires_at?: string;
  token_scopes?: string[];
  is_active: boolean;
  last_sync_at?: string;
  connection_status: 'connected' | 'expired' | 'error';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DBMediaLibrary {
  id: string;
  account_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: 'image' | 'video' | 'carousel';
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  thumbnail_url?: string;
  folder: string;
  tags: string[];
  alt_text?: string;
  is_archived: boolean;
  uploaded_at: string;
  updated_at: string;
}

export interface DBScheduledPost {
  id: string;
  account_id: string;
  user_id: string;
  post_type: 'feed' | 'story' | 'reel' | 'carousel';
  caption?: string;
  hashtags?: string;
  first_comment?: string;
  location_id?: string;
  location_name?: string;
  media_ids: string[];
  media_urls: string[];
  cover_url?: string;
  share_to_feed: boolean;
  audio_name?: string;
  scheduled_for?: string;
  timezone: string;
  status: PostStatus;
  instagram_media_id?: string;
  instagram_permalink?: string;
  published_at?: string;
  publish_error?: string;
  publish_attempts: number;
  ai_generated: boolean;
  ai_prompt?: string;
  ai_variations?: AIVariations;
  cached_likes: number;
  cached_comments: number;
  cached_reach: number;
  metrics_updated_at?: string;
  created_at: string;
  updated_at: string;
}

export type PostStatus = 
  | 'draft'
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export interface AIVariations {
  captions?: string[];
  hashtags?: string[][];
  prompt?: string;
  model?: string;
  generated_at?: string;
}

export interface DBPostAnalytics {
  id: string;
  post_id: string;
  instagram_media_id: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  video_views: number;
  plays: number;
  total_interactions: number;
  exits: number;
  replies: number;
  taps_forward: number;
  taps_back: number;
  engagement_rate?: number;
  fetched_at: string;
  period: 'lifetime' | 'day' | 'week' | 'days_28';
}

export interface DBAccountAnalytics {
  id: string;
  account_id: string;
  date: string;
  followers_count: number;
  follows_count: number;
  followers_gained: number;
  followers_lost: number;
  net_followers: number;
  impressions: number;
  reach: number;
  profile_views: number;
  website_clicks: number;
  email_contacts: number;
  phone_call_clicks: number;
  get_directions_clicks: number;
  total_posts: number;
  total_stories: number;
  total_reels: number;
  total_likes: number;
  total_comments: number;
  total_saves: number;
  total_shares: number;
  average_engagement_rate?: number;
  audience_city?: Record<string, number>;
  audience_country?: Record<string, number>;
  audience_gender_age?: Record<string, number>;
  online_followers?: Record<string, number>;
  created_at: string;
}

export interface DBTemplate {
  id: string;
  account_id: string;
  user_id: string;
  name: string;
  description?: string;
  post_type: 'feed' | 'story' | 'reel' | 'carousel';
  caption_template?: string;
  hashtags_template?: string;
  day_of_week?: number;
  preferred_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DBHashtag {
  id: string;
  account_id: string;
  hashtag: string;
  category?: 'nicho' | 'local' | 'trending' | 'branded';
  times_used: number;
  avg_reach?: number;
  avg_engagement?: number;
  instagram_hashtag_id?: string;
  posts_count?: number;
  last_used_at: string;
  created_at: string;
}

export interface DBActivityLog {
  id: string;
  account_id: string;
  user_id?: string;
  action: ActivityAction;
  entity_type?: 'post' | 'media' | 'account';
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export type ActivityAction =
  | 'account_connected'
  | 'account_disconnected'
  | 'token_refreshed'
  | 'post_created'
  | 'post_scheduled'
  | 'post_published'
  | 'post_failed'
  | 'post_cancelled'
  | 'media_uploaded'
  | 'media_deleted'
  | 'template_created'
  | 'template_updated'
  | 'analytics_synced';

// =====================================================
// UI/COMPONENT TYPES
// =====================================================

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: 'feed' | 'story' | 'reel' | 'carousel';
  status: PostStatus;
  thumbnailUrl?: string;
  post?: DBScheduledPost;
}

export interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  name: string;
  size?: number;
  dimensions?: { width: number; height: number };
  duration?: number;
}

export interface PostComposerData {
  type: 'feed' | 'story' | 'reel' | 'carousel';
  media: MediaItem[];
  caption: string;
  hashtags: string;
  firstComment?: string;
  location?: { id: string; name: string };
  scheduledFor?: Date;
  coverUrl?: string;
  shareToFeed?: boolean;
}

export interface AnalyticsOverview {
  followers: number;
  followersChange: number;
  reach: number;
  reachChange: number;
  engagement: number;
  engagementChange: number;
  posts: number;
  postsChange: number;
}

export interface TopPost {
  id: string;
  thumbnailUrl?: string;
  caption?: string;
  type: 'feed' | 'reel' | 'carousel';
  likes: number;
  comments: number;
  reach: number;
  engagement: number;
  publishedAt: string;
  permalink?: string;
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
