import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, SortDesc, X, ChevronLeft, ChevronRight, Sword } from 'lucide-react';
import { swordApi } from '../api';
import type { Sword as SwordType, SwordFilterParams } from '../types';
import SwordCard from '../components/sword/SwordCard';
import { cn } from '@/lib/utils';

const DYNASTIES = ['全部', '上古', '夏商', '西周', '春秋', '战国', '秦', '汉', '三国', '晋', '南北朝', '隋', '唐', '宋', '元', '明', '清'];
const SECTS = ['全部', '人族', '越国', '楚国', '汉室', '铸剑门', '刺客门', '收藏阁', '蜀汉', '武当', '少林', '峨眉', '昆仑', '崆峒', '华山'];
const SORT_OPTIONS = [
  { value: 'popularity', label: '人气最高' },
  { value: 'dynasty', label: '年代排序' },
  { value: 'name', label: '名称排序' },
];

export default function SwordList() {
  const [swords, setSwords] = useState<SwordType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SwordFilterParams>({
    page: 1,
    limit: 9,
    dynasty: undefined,
    sect: undefined,
    keyword: undefined,
    sortBy: 'popularity',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const fetchSwords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await swordApi.getSwords(filters);
      setSwords(response.list);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch swords:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSwords();
  }, [fetchSwords]);

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      keyword: searchInput.trim() || undefined,
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFilterChange = (key: keyof SwordFilterParams, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      [key]: value === '全部' ? undefined : value,
    }));
  };

  const handleSortChange = (sortBy: SwordFilterParams['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      page: 1,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 9,
      dynasty: undefined,
      sect: undefined,
      keyword: undefined,
      sortBy: 'popularity',
      sortOrder: 'desc',
    });
    setSearchInput('');
  };

  const totalPages = Math.ceil(total / (filters.limit || 9));
  const hasActiveFilters = filters.dynasty || filters.sect || filters.keyword;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="relative h-64 md:h-80 overflow-hidden mb-12">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=traditional%20chinese%20ink%20painting%20of%20ancient%20sword%20collection%2C%20scrolls%20and%20swords%20on%20wooden%20table%2C%20atmospheric%2C%20scholarly%20atmosphere%2C%20sepia%20tones&image_size=landscape_16_9")`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-100/60 via-ink-100/80 to-ink-100" />
        
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-3 mb-3">
              <Sword className="w-8 h-8 text-cinnabar-600" />
              <h1 className="font-brush text-5xl md:text-6xl text-ink-900">名剑谱</h1>
            </div>
            <p className="font-song text-lg text-ink-600 max-w-xl ml-11">
              收录天下名剑，品鉴兵器之美。<br />
              从轩辕剑到青釭剑，跨越千年的神兵传奇。
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
            <input
              type="text"
              placeholder="搜索名剑、剑客、门派..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full pl-12 pr-12 py-3 bg-ink-50 border-2 border-ink-200 focus:border-cinnabar-500 outline-none font-song transition-colors"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 border-2 font-song transition-all',
                showFilters 
                  ? 'bg-cinnabar-600 text-ink-100 border-cinnabar-600' 
                  : 'bg-ink-50 text-ink-700 border-ink-200 hover:border-ink-400'
              )}
            >
              <Filter className="w-5 h-5" />
              筛选
            </button>
            
            <div className="relative group">
              <button className="flex items-center gap-2 px-6 py-3 bg-ink-50 border-2 border-ink-200 hover:border-ink-400 font-song transition-colors">
                <SortDesc className="w-5 h-5" />
                排序
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 bg-ink-50 border-2 border-ink-200 shadow-ink opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value as SwordFilterParams['sortBy'])}
                    className={cn(
                      'w-full px-4 py-2 text-left font-song text-sm transition-colors flex items-center justify-between',
                      filters.sortBy === option.value 
                        ? 'bg-cinnabar-50 text-cinnabar-700' 
                        : 'hover:bg-ink-100 text-ink-700'
                    )}
                  >
                    {option.label}
                    {filters.sortBy === option.value && (
                      <span className="text-xs">{filters.sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="ink-card p-6 mb-8 animate-ink-spread">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-brush text-xl text-ink-900">筛选条件</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-cinnabar-600 font-song hover:text-cinnabar-700 transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  清除筛选
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-song text-sm text-ink-600 mb-2">朝代</label>
                <div className="flex flex-wrap gap-2">
                  {DYNASTIES.map((dynasty) => (
                    <button
                      key={dynasty}
                      onClick={() => handleFilterChange('dynasty', dynasty)}
                      className={cn(
                        'px-4 py-1.5 text-sm font-song transition-all',
                        (filters.dynasty === dynasty || (!filters.dynasty && dynasty === '全部'))
                          ? 'bg-cinnabar-600 text-ink-100'
                          : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                      )}
                    >
                      {dynasty}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block font-song text-sm text-ink-600 mb-2">门派</label>
                <div className="flex flex-wrap gap-2">
                  {SECTS.map((sect) => (
                    <button
                      key={sect}
                      onClick={() => handleFilterChange('sect', sect)}
                      className={cn(
                        'px-4 py-1.5 text-sm font-song transition-all',
                        (filters.sect === sect || (!filters.sect && sect === '全部'))
                          ? 'bg-bronze-600 text-ink-100'
                          : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                      )}
                    >
                      {sect}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <p className="font-song text-ink-600">
            共找到 <span className="text-cinnabar-600 font-bold">{total}</span> 把名剑
          </p>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-ink-500 font-song">当前筛选：</span>
              {filters.dynasty && (
                <span className="seal-stamp text-xs">{filters.dynasty}</span>
              )}
              {filters.sect && (
                <span className="bg-bronze-600 text-ink-100 text-xs px-3 py-1 font-song">{filters.sect}</span>
              )}
              {filters.keyword && (
                <span className="bg-gold-500 text-ink-100 text-xs px-3 py-1 font-song">关键词：{filters.keyword}</span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-96 bg-ink-50 animate-pulse" />
            ))}
          </div>
        ) : swords.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {swords.map((sword, index) => (
                <SwordCard key={sword.id} sword={sword} delay={index * 50} />
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => handlePageChange((filters.page || 1) - 1)}
                  disabled={(filters.page || 1) <= 1}
                  className="p-2 bg-ink-50 border border-ink-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ink-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  const isActive = page === filters.page;
                  const isNear = Math.abs(page - (filters.page || 1)) <= 2 || page === 1 || page === totalPages;
                  
                  if (!isNear) {
                    if (Math.abs(page - (filters.page || 1)) === 3) {
                      return <span key={page} className="px-2 text-ink-400">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={cn(
                        'w-10 h-10 font-song transition-all',
                        isActive 
                          ? 'bg-cinnabar-600 text-ink-100 shadow-brush' 
                          : 'bg-ink-50 border border-ink-200 hover:bg-ink-100'
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange((filters.page || 1) + 1)}
                  disabled={(filters.page || 1) >= totalPages}
                  className="p-2 bg-ink-50 border border-ink-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ink-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Sword className="w-16 h-16 text-ink-300 mx-auto mb-4" />
            <h3 className="font-brush text-2xl text-ink-600 mb-2">未找到名剑</h3>
            <p className="font-song text-ink-500 mb-4">请尝试调整筛选条件或搜索关键词</p>
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-6 py-2 bg-cinnabar-600 text-ink-100 font-song hover:bg-cinnabar-700 transition-colors"
            >
              清除所有筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
