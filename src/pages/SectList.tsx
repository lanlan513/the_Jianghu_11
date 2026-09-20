import { useEffect, useState } from 'react';
import { Building2, Mountain } from 'lucide-react';
import { sectApi } from '../api';
import type { Sect } from '../types';
import SectCard from '../components/sect/SectCard';

export default function SectList() {
  const [sects, setSects] = useState<Sect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSects = async () => {
      try {
        const data = await sectApi.getSects();
        setSects(data);
      } catch (error) {
        console.error('Failed to fetch sects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSects();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="relative h-64 md:h-80 overflow-hidden mb-12">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20painting%20of%20ancient%20chinese%20martial%20arts%20sect%20temples%20in%20mountains%2C%20wudang%20shaolin%20style%2C%20misty%20peaks%2C%20pagodas%2C%20ink%20wash%20style&image_size=landscape_16_9")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100/60 via-ink-100/80 to-ink-100" />
        
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-8 h-8 text-bronze-600" />
              <h1 className="font-brush text-5xl md:text-6xl text-ink-900">武林门派</h1>
            </div>
            <p className="font-song text-lg text-ink-600 max-w-xl ml-11">
              深山藏古寺，剑气凌霄汉。<br />
              探访江湖中的名门大派，领略各大门派的武功绝学。
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <p className="font-song text-ink-600">
            共收录 <span className="text-bronze-600 font-bold">{sects.length}</span> 个门派
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-ink-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sects.map((sect, index) => (
              <SectCard key={sect.id} sect={sect} delay={index * 50} />
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-block ink-card p-8 max-w-lg">
            <Mountain className="w-12 h-12 text-ink-300 mx-auto mb-4" />
            <h3 className="font-brush text-2xl text-ink-700 mb-3">更多门派正在整理中</h3>
            <p className="font-song text-ink-500">
              江湖之大，门派之多，不胜枚举。<br />
              我们正在持续完善各大门派的资料，敬请期待。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
