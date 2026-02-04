'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  ImageIcon,
  Film,
  Sparkles,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Instagram
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduledPost {
  id: string;
  caption?: string;
  post_type: 'feed' | 'reel' | 'story' | 'carousel';
  scheduled_for: string;
  status: string;
  media_urls: string[];
}

type ViewMode = 'month' | 'week' | 'day';

const POST_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  feed: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  reel: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  story: { bg: 'bg-green-500/20', text: 'text-green-400', dot: 'bg-green-500' },
  carousel: { bg: 'bg-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' },
};

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    loadPosts();
  }, [currentDate]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const response = await fetch(
        `/api/social/instagram/posts?startDate=${startOfMonth.toISOString()}&endDate=${endOfMonth.toISOString()}`
      );
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getPostsForDate = (date: Date) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduled_for);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const days = getDaysInMonth();

  return (
    <div className="min-h-screen bg-[#101A1E] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Calendário</h1>
            <p className="text-sm text-gray-400">
              Visualize e gerencie seus posts agendados
            </p>
          </div>
        </div>

        <Link href="/admin/social/composer">
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Post
          </Button>
        </Link>
      </div>

      {/* Calendar Controls */}
      <Card className="bg-gray-800/50 border-gray-700/50 mb-6">
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
                className="border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white w-9 h-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <span className="text-lg font-semibold text-white min-w-[200px] text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
                className="border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white w-9 h-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="ml-2 border-gray-700 text-gray-300 hover:bg-gray-700/50 hover:text-white"
              >
                Hoje
              </Button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('month')}
                className={viewMode === 'month' 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Mês
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('week')}
                className={viewMode === 'week' 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              >
                <List className="w-4 h-4 mr-1" />
                Semana
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('day')}
                className={viewMode === 'day' 
                  ? 'bg-gray-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Dia
              </Button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3">
              {Object.entries(POST_TYPE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                  <span className="text-xs text-gray-400 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-800/50" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-700/50">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {days.map((date, index) => (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b border-gray-700/30 p-2 transition-colors
                  ${date ? 'hover:bg-gray-700/30 cursor-pointer' : 'bg-gray-900/30'}
                  ${date && isToday(date) ? 'bg-purple-900/20' : ''}
                `}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(date) 
                        ? 'w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white' 
                        : 'text-gray-300'
                    }`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {getPostsForDate(date).slice(0, 3).map((post) => {
                        const colors = POST_TYPE_COLORS[post.post_type] || POST_TYPE_COLORS.feed;
                        return (
                          <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className={`${colors.bg} rounded px-1.5 py-0.5 text-xs truncate ${colors.text} cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(post.scheduled_for)}
                            </span>
                          </div>
                        );
                      })}
                      {getPostsForDate(date).length > 3 && (
                        <div className="text-xs text-gray-500 pl-1">
                          +{getPostsForDate(date).length - 3} mais
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post Preview Modal */}
      {selectedPost && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPost(null)}
        >
          <Card 
            className="bg-gray-800 border-gray-700 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedPost.post_type === 'reel' ? (
                    <Film className="w-5 h-5 text-red-400" />
                  ) : selectedPost.post_type === 'story' ? (
                    <Sparkles className="w-5 h-5 text-green-400" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                  )}
                  <CardTitle className="text-white capitalize">
                    {selectedPost.post_type}
                  </CardTitle>
                </div>
                <Badge className={POST_TYPE_COLORS[selectedPost.post_type]?.bg + ' ' + POST_TYPE_COLORS[selectedPost.post_type]?.text}>
                  {selectedPost.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Media Preview */}
              {selectedPost.media_urls.length > 0 ? (
                <div className="aspect-square bg-gray-700 rounded-lg mb-4 overflow-hidden">
                  <img 
                    src={selectedPost.media_urls[0]} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-600" />
                </div>
              )}

              {/* Caption */}
              <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                {selectedPost.caption || 'Sem legenda'}
              </p>

              {/* Schedule Info */}
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                <Clock className="w-4 h-4" />
                <span>
                  Agendado para {new Date(selectedPost.scheduled_for).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Link href={`/admin/social/composer/${selectedPost.id}`} className="flex-1">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {posts.filter(p => p.status === 'scheduled').length}
                </p>
                <p className="text-xs text-gray-400">Agendados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {posts.filter(p => p.post_type === 'feed').length}
                </p>
                <p className="text-xs text-gray-400">Posts Feed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {posts.filter(p => p.post_type === 'reel').length}
                </p>
                <p className="text-xs text-gray-400">Reels</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {posts.filter(p => p.post_type === 'story').length}
                </p>
                <p className="text-xs text-gray-400">Stories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
