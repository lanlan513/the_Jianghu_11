import { useEffect, useState } from 'react';
import { Users, Sword } from 'lucide-react';
import { swordsmanApi } from '../api';
import type { Swordsman } from '../types';
import SwordsmanCard from '../components/swordsman/SwordsmanCard';

export default function SwordsmanList() {
  const [swordsmen, setSwordsmen] = useState<Swordsman[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSwordsmen = async () => {
      try {
        const data = await swordsmanApi.getSwordsmen();
        setSwordsmen(data);
      } catch (error) {
        console.error('Failed to fetch swordsmen:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSwordsmen();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="relative h-64 md:h-80 overflow-hidden mb-12">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20painting%20of%20ancient%20chinese%20swordsmen%2C%20heroic%20warriors%20with%20swords%2C%20dramatic%20atmosphere%2C%20misty%20mountains%2C%20ink%20wash%20style&image_size=landscape_16_9")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100/60 via-ink-100/80 to-ink-100" />
        
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-gold-600" />
              <h1 className="font-brush text-5xl md:text-6xl text-ink-900">剑客列传</h1>
            </div>
            <p className="font-song text-lg text-ink-600 max-w-xl ml-11">
              千古风流人物，一剑霜寒十四州。<br />
              讲述那些江湖豪杰的传奇故事。
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <p className="font-song text-ink-600">
            共收录 <span className="text-gold-600 font-bold">{swordsmen.length}</span> 位剑客
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-ink-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {swordsmen.map((swordsman, index) => (
              <SwordsmanCard key={swordsman.id} swordsman={swordsman} delay={index * 50} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-block ink-card p-8 max-w-lg">
            <Sword className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-brush text-2xl text-ink-700 mb-3">更多剑客正在收录中</h3>
            <p className="font-song text-ink-500">
              我们正在努力整理更多江湖剑客的资料，敬请期待。<br />
              如需贡献内容或建议，请联系我们。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
