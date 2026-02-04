/**
 * Social Flow - Types
 * Tipos TypeScript para todo o sistema multi-plataforma
 */

// =======================
// ENUMS
// =======================

export type SocialNetwork = 
  | 'instagram' 
  | 'facebook' 
  | 'twitter' 
  | 'linkedin' 
  | 'youtube' 
  | 'tiktok' 
  | 'pinterest';

export type PostStatus = 
  | 'idea'
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'deleted';

export type UserRole = 'viewer' | 'creator' | 'editor' | 'approver' | 'admin';

export type MediaType = 'image' | 'video' | 'gif' | 'document' | 'carousel';

// =======================
// NETWORK CONFIG
// =======================

export interface NetworkConfig {
  id: SocialNetwork;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  postTypes: PostType[];
  maxHashtags: number;
  maxMentions: number;
  maxCaptionLength: number;
  supportsScheduling: boolean;
  supportsAnalytics: boolean;
  supportsStories: boolean;
  supportsReels: boolean;
  supportsDMs: boolean;
  requiresBusinessAccount: boolean;
  oauthScopes: string[];
}

export interface PostType {
  id: string;
  name: string;
  icon: string;
  description: string;
  maxMediaCount: number;
  allowedMediaTypes: MediaType[];
  aspectRatios: string[];
  maxDurationSeconds?: number;
  maxFileSizeMB: number;
}

// =======================
// ACCOUNTS
// =======================

export interface SocialAccount {
  id: string;
  user_id: string;
  network: SocialNetwork;
  platform_account_id: string;
  username: string;
  display_name?: string;
  profile_picture_url?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  auxiliary_ids: Record<string, string>;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_active: boolean;
  is_primary: boolean;
  connection_status: 'connected' | 'expired' | 'revoked' | 'error';
  last_error?: string;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
}

// =======================
// MEDIA LIBRARY
// =======================

export interface MediaItem {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_type: MediaType;
  file_size_bytes?: number;
  mime_type?: string;
  public_url?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
  aspect_ratio?: string;
  folder_path: string;
  tags: string[];
  color_label?: string;
  is_favorite: boolean;
  detected_objects?: string[];
  dominant_color?: string;
  alt_text?: string;
  ai_description?: string;
  uploaded_at: string;
  deleted_at?: string;
}

// =======================
// POSTS
// =======================

export interface Post {
  id: string;
  account_id: string;
  user_id: string;
  network: SocialNetwork;
  post_type: string;
  caption?: string;
  title?: string;
  description?: string;
  hashtags: string[];
  first_comment?: string;
  media_ids: string[];
  metadata: PostMetadata;
  is_cross_post: boolean;
  cross_post_parent_id?: string;
  cross_post_children_ids: string[];
  status: PostStatus;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  scheduled_for?: string;
  published_at?: string;
  platform_post_id?: string;
  platform_permalink?: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments_count: number;
  shares: number;
  saves: number;
  video_views: number;
  link_clicks: number;
  engagement_rate: number;
  publish_error?: string;
  publish_attempts: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

// Metadata específico por rede
export interface PostMetadata {
  // Instagram
  location_id?: string;
  location_name?: string;
  tagged_users?: Array<{ username: string; x: number; y: number }>;
  cover_url?: string;
  share_to_feed?: boolean;
  
  // Twitter
  is_thread?: boolean;
  thread_tweets?: string[];
  poll?: { options: string[]; duration_hours: number };
  reply_settings?: 'everyone' | 'followers' | 'mentioned';
  
  // YouTube
  tags?: string[];
  category_id?: string;
  thumbnail_url?: string;
  privacy_status?: 'public' | 'private' | 'unlisted';
  made_for_kids?: boolean;
  
  // LinkedIn
  visibility?: 'PUBLIC' | 'CONNECTIONS';
  document_title?: string;
  article_content?: string;
  
  // Pinterest
  board_id?: string;
  board_name?: string;
  link_url?: string;
  
  // TikTok
  allow_comments?: boolean;
  allow_duet?: boolean;
  allow_stitch?: boolean;
  
  // Genérico
  [key: string]: unknown;
}

// =======================
// CONTENT IDEAS
// =======================

export interface ContentIdea {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  reference_url?: string;
  reference_image_url?: string;
  tags: string[];
  media_ids: string[];
  suggested_networks: SocialNetwork[];
  priority: 'low' | 'medium' | 'high';
  is_used: boolean;
  used_in_post_id?: string;
  created_at: string;
}

// =======================
// TEMPLATES
// =======================

export interface PostTemplate {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  network: SocialNetwork;
  post_type?: string;
  caption_template?: string;
  hashtags_template: string[];
  media_ids: string[];
  metadata_template: Partial<PostMetadata>;
  usage_count: number;
  last_used_at?: string;
  category?: string;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
}

// =======================
// ANALYTICS
// =======================

export interface PostAnalytics {
  id: string;
  post_id: string;
  impressions: number;
  reach: number;
  engagement: number;
  likes: number;
  comments_count: number;
  shares: number;
  saves: number;
  video_views: number;
  video_completion_rate?: number;
  link_clicks: number;
  profile_visits: number;
  network_metrics: Record<string, number>;
  fetched_at: string;
}

export interface AccountAnalyticsDaily {
  id: string;
  account_id: string;
  date: string;
  followers_count: number;
  followers_gained: number;
  followers_lost: number;
  following_count: number;
  posts_published: number;
  total_impressions: number;
  total_reach: number;
  total_engagement: number;
  profile_views: number;
  website_clicks: number;
  network_metrics: Record<string, number>;
}

export interface BestTime {
  id: string;
  account_id: string;
  post_type?: string;
  day_of_week: number;
  hour_of_day: number;
  avg_engagement_rate: number;
  avg_reach: number;
  avg_impressions: number;
  total_posts_analyzed: number;
  confidence_score: number;
}

// =======================
// REPORTS
// =======================

export interface Report {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  report_type: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  date_from: string;
  date_to: string;
  account_ids: string[];
  networks: SocialNetwork[];
  pdf_url?: string;
  pdf_size_bytes?: number;
  ai_summary?: string;
  ai_insights: string[];
  ai_recommendations: string[];
  is_public: boolean;
  public_token?: string;
  branding: ReportBranding;
  include_sections: string[];
  created_at: string;
  download_count: number;
}

export interface ReportBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  company_name?: string;
  footer_text?: string;
}

export interface ReportSchedule {
  id: string;
  user_id: string;
  name: string;
  report_type: string;
  account_ids: string[];
  networks: SocialNetwork[];
  frequency: 'daily' | 'weekly' | 'monthly';
  day_of_week?: number;
  day_of_month?: number;
  time_of_day: string;
  timezone: string;
  recipients: string[];
  branding: ReportBranding;
  include_sections: string[];
  is_active: boolean;
  last_sent_at?: string;
  next_send_at?: string;
}

// =======================
// TEAM
// =======================

export interface TeamMember {
  id: string;
  workspace_owner_id: string;
  member_user_id: string;
  role: UserRole;
  can_create_posts: boolean;
  can_edit_posts: boolean;
  can_delete_posts: boolean;
  can_approve_posts: boolean;
  can_publish_posts: boolean;
  can_manage_media: boolean;
  can_view_analytics: boolean;
  can_generate_reports: boolean;
  can_manage_accounts: boolean;
  can_manage_team: boolean;
  allowed_account_ids: string[];
  allowed_networks: SocialNetwork[];
  invite_status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  accepted_at?: string;
  last_active_at?: string;
}

// =======================
// INBOX
// =======================

export interface InboxConversation {
  id: string;
  account_id: string;
  network: SocialNetwork;
  participant_id: string;
  participant_username?: string;
  participant_name?: string;
  participant_avatar_url?: string;
  last_message_preview?: string;
  last_message_at?: string;
  last_message_is_from_us: boolean;
  unread_count: number;
  is_archived: boolean;
  is_spam: boolean;
  labels: string[];
  created_at: string;
}

export interface InboxMessage {
  id: string;
  conversation_id: string;
  is_from_us: boolean;
  sender_id?: string;
  message_type: 'text' | 'image' | 'video' | 'sticker' | 'share';
  content?: string;
  media_url?: string;
  platform_message_id?: string;
  is_read: boolean;
  sent_at: string;
}

// =======================
// LINK IN BIO
// =======================

export interface LinkInBio {
  id: string;
  user_id: string;
  account_id: string;
  slug: string;
  title?: string;
  bio?: string;
  avatar_url?: string;
  background_color: string;
  text_color: string;
  button_style: 'rounded' | 'square' | 'pill';
  links: LinkInBioLink[];
  total_views: number;
  total_clicks: number;
  is_active: boolean;
  created_at: string;
}

export interface LinkInBioLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  clicks: number;
  is_active: boolean;
}

// =======================
// HASHTAG PERFORMANCE
// =======================

export interface HashtagPerformance {
  id: string;
  account_id: string;
  hashtag: string;
  times_used: number;
  avg_engagement_rate: number;
  avg_reach: number;
  avg_impressions: number;
  category?: 'niche' | 'trending' | 'branded' | 'general';
  volume_estimate?: 'low' | 'medium' | 'high';
  last_used_at?: string;
}

// =======================
// MONITORING
// =======================

export interface MonitoredHashtag {
  id: string;
  user_id: string;
  account_id: string;
  hashtag: string;
  network: SocialNetwork;
  is_active: boolean;
  notify_on_new: boolean;
  posts_found: number;
  last_checked_at?: string;
}

export interface DetectedMention {
  id: string;
  account_id: string;
  network: SocialNetwork;
  platform_post_id?: string;
  author_username?: string;
  author_display_name?: string;
  author_profile_url?: string;
  author_profile_picture?: string;
  content?: string;
  media_url?: string;
  post_url?: string;
  is_read: boolean;
  is_replied: boolean;
  replied_at?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  detected_at: string;
}

// =======================
// API RESPONSES
// =======================

export interface PublishResult {
  success: boolean;
  platform_post_id?: string;
  platform_permalink?: string;
  error?: string;
  error_code?: string;
}

export interface AnalyticsResult {
  success: boolean;
  data?: PostAnalytics | AccountAnalyticsDaily;
  error?: string;
}

export interface TokenRefreshResult {
  success: boolean;
  access_token?: string;
  expires_at?: string;
  error?: string;
}

// =======================
// NETWORK INTERFACE (para cada rede implementar)
// =======================

export interface NetworkPublisher {
  publish(post: Post, account: SocialAccount, media: MediaItem[]): Promise<PublishResult>;
  deletePost(postId: string, account: SocialAccount): Promise<{ success: boolean; error?: string }>;
}

export interface NetworkAnalytics {
  getPostAnalytics(postId: string, account: SocialAccount): Promise<AnalyticsResult>;
  getAccountAnalytics(account: SocialAccount, dateFrom: Date, dateTo: Date): Promise<AnalyticsResult>;
}

export interface NetworkAuth {
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenRefreshResult>;
  refreshToken(account: SocialAccount): Promise<TokenRefreshResult>;
  revokeAccess(account: SocialAccount): Promise<{ success: boolean }>;
}
