import { Sword, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="relative bg-ink-900 text-ink-100 mt-20">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cinnabar-600 via-gold-500 to-cinnabar-600" />
      
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cinnabar-600 to-gold-500 flex items-center justify-center">
                <Sword className="w-5 h-5 text-ink-100" />
              </div>
              <span className="font-brush text-2xl">江湖名剑谱</span>
            </div>
            <p className="text-ink-300 font-song text-sm leading-relaxed">
              收录天下名剑，传承武侠文化。<br />
              展示中国古代兵器之美，讲述剑客传奇故事。
            </p>
          </div>
          
          <div>
            <h4 className="font-brush text-lg mb-4 text-gold-400">快速链接</h4>
            <ul className="space-y-2 font-song text-sm">
              <li>
                <a href="/" className="text-ink-300 hover:text-gold-400 transition-colors">首页</a>
              </li>
              <li>
                <a href="/swords" className="text-ink-300 hover:text-gold-400 transition-colors">名剑谱</a>
              </li>
              <li>
                <a href="/swordsmen" className="text-ink-300 hover:text-gold-400 transition-colors">剑客</a>
              </li>
              <li>
                <a href="/sects" className="text-ink-300 hover:text-gold-400 transition-colors">门派</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-brush text-lg mb-4 text-gold-400">关于</h4>
            <p className="text-ink-300 font-song text-sm leading-relaxed mb-4">
              《江湖名剑谱》旨在收集整理中国古代传说中的名剑、剑客和门派信息，为武侠文化爱好者提供一个交流和学习的平台。
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-ink-300 hover:text-gold-400 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-ink-800 text-center">
          <p className="text-ink-400 font-song text-xs">
            © {new Date().getFullYear()} 江湖名剑谱. 传承武侠文化，弘扬民族精神.
          </p>
        </div>
      </div>
    </footer>
  );
}
