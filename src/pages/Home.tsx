import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sword, ChevronRight, Sparkles, Users, Building2, TrendingUp } from 'lucide-react';
import { swordApi, swordsmanApi, sectApi } from '../api';
import type { Sword as SwordType, Swordsman, Sect } from '../types';
import SwordCard from '../components/sword/SwordCard';
import SwordsmanCard from '../components/swordsman/SwordsmanCard';
import SectCard from '../components/sect/SectCard';

export default function Home() {
  const [popularSwords, setPopularSwords] = useState<SwordType[]>([]);
  const [latestSwordsmen, setLatestSwordsmen] = useState<Swordsman[]>([]);
  const [popularSects, setPopularSects] = useState<Sect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [swords, swordsmen, sects] = await Promise.all([
          swordApi.getPopularSwords(6),
          swordsmanApi.getLatestSwordsmen(4),
          sectApi.getPopularSects(6),
        ]);
        setPopularSwords(swords);
        setLatestSwordsmen(swordsmen);
        setPopularSects(sects);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20wash%20painting%2C%20misty%20mountains%20and%20ancient%20pine%20trees%2C%20atmospheric%2C%20minimalist%2C%20black%20and%20white%20with%20subtle%20sepia%20tones%2C%20legendary%20atmosphere&image_size=landscape_16_9")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100/80 via-ink-100/60 to-ink-100" />
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cinnabar-400/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative container mx-auto px-4 py-20 text-center">
          <div className="animate-scroll-unfold" style={{ transformOrigin: 'top' }}>
            <div className="scroll-container max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 mb-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
                <Sparkles className="w-5 h-5 text-gold-500" />
                <span className="text-gold-600 font-song text-sm tracking-widest">传承千年 · 剑影江湖</span>
                <Sparkles className="w-5 h-5 text-gold-500" />
              </div>
              
              <h1 className="font-brush text-6xl md:text-8xl text-ink-900 mb-6 opacity-0 animate-fade-in-up text-shadow-ink" style={{ animationDelay: '0.7s', animationFillMode: 'forwards' }}>
                江湖名剑谱
              </h1>
              
              <p className="font-song text-lg md:text-xl text-ink-700 max-w-2xl mx-auto mb-8 leading-relaxed opacity-0 animate-fade-in-up" style={{ animationDelay: '0.9s', animationFillMode: 'forwards' }}>
                收录天下名剑，讲述剑客传奇。<br />
                探寻武侠世界的刀光剑影，感受中华文化的博大精深。
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '1.1s', animationFillMode: 'forwards' }}>
                <Link
                  to="/swords"
                  className="group ink-ripple inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cinnabar-600 to-cinnabar-700 text-ink-100 font-song shadow-brush hover:shadow-ink-hover transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Sword className="w-5 h-5" />
                  浏览名剑谱
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/swordsmen"
                  className="group ink-ripple inline-flex items-center gap-2 px-8 py-3 bg-ink-50 text-ink-800 font-song border-2 border-ink-800 hover:bg-ink-100 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Users className="w-5 h-5" />
                  寻访剑客
                </Link>
              </div>
              
              <div className="mt-12 flex justify-center gap-8 text-ink-600 opacity-0 animate-fade-in-up" style={{ animationDelay: '1.3s', animationFillMode: 'forwards' }}>
                <div className="text-center">
                  <div className="font-brush text-3xl text-cinnabar-600">12</div>
                  <div className="font-song text-xs">传世名剑</div>
                </div>
                <div className="w-px bg-ink-300" />
                <div className="text-center">
                  <div className="font-brush text-3xl text-gold-600">8</div>
                  <div className="font-song text-xs">传奇剑客</div>
                </div>
                <div className="w-px bg-ink-300" />
                <div className="text-center">
                  <div className="font-brush text-3xl text-bronze-600">6</div>
                  <div className="font-song text-xs">武林门派</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-ink-400 rotate-90" />
        </div>
      </section>

      <section className="py-20 bg-ink-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-cinnabar-600" />
                <h2 className="font-brush text-4xl text-ink-900">热门名剑</h2>
              </div>
              <p className="font-song text-ink-600 ml-9">江湖人气最高的传世名剑</p>
            </div>
            <Link
              to="/swords"
              className="group hidden md:flex items-center gap-1 text-cinnabar-600 font-song hover:text-cinnabar-700 transition-colors"
            >
              查看全部
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-ink-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularSwords.map((sword, index) => (
                <SwordCard key={sword.id} sword={sword} delay={index * 100} />
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center md:hidden">
            <Link
              to="/swords"
              className="inline-flex items-center gap-1 text-cinnabar-600 font-song hover:text-cinnabar-700 transition-colors"
            >
              查看全部名剑
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="ink-divider max-w-4xl mx-auto" />

      <section className="py-20 bg-ink-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-gold-600" />
                <h2 className="font-brush text-4xl text-ink-900">最新收录剑客</h2>
              </div>
              <p className="font-song text-ink-600 ml-9">近期收录的江湖豪杰</p>
            </div>
            <Link
              to="/swordsmen"
              className="group hidden md:flex items-center gap-1 text-gold-600 font-song hover:text-gold-700 transition-colors"
            >
              查看全部
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-ink-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {latestSwordsmen.map((swordsman, index) => (
                <SwordsmanCard key={swordsman.id} swordsman={swordsman} delay={index * 100} />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="ink-divider max-w-4xl mx-auto" />

      <section className="py-20 bg-ink-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-6 h-6 text-bronze-600" />
                <h2 className="font-brush text-4xl text-ink-900">武林门派</h2>
              </div>
              <p className="font-song text-ink-600 ml-9">江湖中的名门大派</p>
            </div>
            <Link
              to="/sects"
              className="group hidden md:flex items-center gap-1 text-bronze-600 font-song hover:text-bronze-700 transition-colors"
            >
              查看全部
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-ink-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularSects.map((sect, index) => (
                <SectCard key={sect.id} sect={sect} delay={index * 100} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
