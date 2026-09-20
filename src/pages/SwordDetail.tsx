import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Building2, Flame, BookOpen, History, Sparkles, Share2, Heart } from 'lucide-react';
import { swordApi } from '../api';
import type { Sword } from '../types';
import { cn } from '@/lib/utils';

const ATTRIBUTE_LABELS: Record<string, { label: string; color: string }> = {
  sharpness: { label: '锋利', color: 'from-cinnabar-500 to-cinnabar-700' },
  hardness: { label: '硬度', color: 'from-bronze-500 to-bronze-700' },
  flexibility: { label: '柔韧', color: 'from-gold-500 to-gold-700' },
  craftsmanship: { label: '工艺', color: 'from-ink-600 to-ink-800' },
};

export default function SwordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sword, setSword] = useState<Sword | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchSword = async () => {
      setLoading(true);
      try {
        const data = await swordApi.getSwordById(id);
        setSword(data);
      } catch (error) {
        console.error('Failed to fetch sword:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSword();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ink-200 border-t-cinnabar-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-song text-ink-600">正在加载名剑...</p>
        </div>
      </div>
    );
  }

  if (!sword) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-brush text-3xl text-ink-700 mb-4">名剑未找到</h2>
          <p className="font-song text-ink-500 mb-6">此剑或许已绝迹江湖</p>
          <button
            onClick={() => navigate('/swords')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cinnabar-600 text-ink-100 font-song hover:bg-cinnabar-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回名剑谱
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${sword.imageUrl})`,
            opacity: imageLoaded ? 1 : 0,
          }}
        />
        <img
          src={sword.imageUrl}
          alt={sword.name}
          className="hidden"
          onLoad={() => setImageLoaded(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-100 via-ink-100/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-100/80 via-transparent to-ink-100/60" />
        
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-ink-100/90 backdrop-blur-sm text-ink-700 font-song hover:bg-ink-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        </div>
        
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              'p-3 bg-ink-100/90 backdrop-blur-sm transition-all',
              isLiked ? 'text-cinnabar-600' : 'text-ink-600 hover:text-cinnabar-600'
            )}
          >
            <Heart className={cn('w-5 h-5', isLiked && 'fill-current')} />
          </button>
          <button className="p-3 bg-ink-100/90 backdrop-blur-sm text-ink-600 hover:text-ink-800 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'forwards', opacity: 0 }}>
              <span className="seal-stamp mb-4 inline-block">{sword.alias}</span>
              <h1 className="font-brush text-6xl md:text-8xl text-ink-900 mb-2 text-shadow-ink">
                {sword.name}
              </h1>
              <div className="flex flex-wrap items-center gap-6 text-ink-600">
                <span className="flex items-center gap-2 font-song">
                  <Calendar className="w-4 h-4" />
                  {sword.dynasty}
                </span>
                <span className="flex items-center gap-2 font-song">
                  <User className="w-4 h-4" />
                  {sword.owner}
                </span>
                <span className="flex items-center gap-2 font-song">
                  <Building2 className="w-4 h-4" />
                  {sword.sect}
                </span>
                <span className="flex items-center gap-2 font-song text-gold-600">
                  <Flame className="w-4 h-4" />
                  人气 {sword.popularity.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-12">
            <section className="animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'forwards', opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-cinnabar-600" />
                <h2 className="font-brush text-3xl text-ink-900">名剑简介</h2>
              </div>
              <div className="scroll-container">
                <p className="font-song text-lg text-ink-700 leading-loose first-letter:text-5xl first-letter:font-brush first-letter:text-cinnabar-600 first-letter:float-left first-letter:mr-3">
                  {sword.description}
                </p>
              </div>
            </section>

            <div className="ink-divider" />

            <section className="animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards', opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <History className="w-6 h-6 text-gold-600" />
                <h2 className="font-brush text-3xl text-ink-900">历史渊源</h2>
              </div>
              <div className="ink-card p-6">
                <p className="font-song text-ink-700 leading-loose">
                  {sword.history}
                </p>
              </div>
            </section>

            <div className="ink-divider" />

            <section className="animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards', opacity: 0 }}>
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-6 h-6 text-bronze-600" />
                <h2 className="font-brush text-3xl text-ink-900">传奇故事</h2>
              </div>
              <div className="ink-card p-6 border-l-4 border-l-cinnabar-600">
                <p className="font-song text-ink-700 leading-loose italic">
                  「{sword.legend}」
                </p>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <div className="ink-card p-6 animate-fade-in-up sticky top-24" style={{ animationDelay: '0.3s', animationFillMode: 'forwards', opacity: 0 }}>
              <h3 className="font-brush text-2xl text-ink-900 mb-6">剑之属性</h3>
              
              <div className="space-y-6">
                {Object.entries(sword.attributes).map(([key, value]) => {
                  const attr = ATTRIBUTE_LABELS[key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-song text-sm text-ink-600">{attr.label}</span>
                        <span className="font-brush text-lg text-ink-800">{value}</span>
                      </div>
                      <div className="sword-attribute-bar h-3">
                        <div 
                          className={cn('sword-attribute-bar-fill h-full bg-gradient-to-r', attr.color)}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-ink-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="font-brush text-3xl text-cinnabar-600">
                      {Math.round(
                        (sword.attributes.sharpness + 
                         sword.attributes.hardness + 
                         sword.attributes.flexibility + 
                         sword.attributes.craftsmanship) / 4
                      )}
                    </div>
                    <div className="font-song text-xs text-ink-500">综合评分</div>
                  </div>
                  <div>
                    <div className="font-brush text-3xl text-gold-600">
                      {(sword.popularity / 100).toFixed(1)}k
                    </div>
                    <div className="font-song text-xs text-ink-500">江湖人气</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ink-card p-6 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'forwards', opacity: 0 }}>
              <h3 className="font-brush text-xl text-ink-900 mb-4">相关标签</h3>
              <div className="flex flex-wrap gap-2">
                <span className="seal-stamp text-xs">{sword.dynasty}</span>
                <span className="bg-bronze-50 text-bronze-700 text-xs px-3 py-1 font-song border border-bronze-200">
                  {sword.sect}
                </span>
                <span className="bg-gold-50 text-gold-700 text-xs px-3 py-1 font-song border border-gold-200">
                  {sword.alias}
                </span>
                <span className="bg-ink-50 text-ink-700 text-xs px-3 py-1 font-song border border-ink-200">
                  名剑
                </span>
              </div>
            </div>

            <div className="ink-card p-6 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards', opacity: 0 }}>
              <h3 className="font-brush text-xl text-ink-900 mb-4">了解更多</h3>
              <div className="space-y-3">
                <Link
                  to="/swords"
                  className="flex items-center justify-between p-3 bg-ink-50 hover:bg-ink-100 transition-colors font-song text-sm text-ink-700"
                >
                  <span>浏览全部名剑</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
                <Link
                  to="/swordsmen"
                  className="flex items-center justify-between p-3 bg-ink-50 hover:bg-ink-100 transition-colors font-song text-sm text-ink-700"
                >
                  <span>查看传奇剑客</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
                <Link
                  to="/sects"
                  className="flex items-center justify-between p-3 bg-ink-50 hover:bg-ink-100 transition-colors font-song text-sm text-ink-700"
                >
                  <span>探访武林门派</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
