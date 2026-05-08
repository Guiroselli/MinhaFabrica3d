import fs from 'fs';
import { execSync } from 'child_process';

let content = execSync('git show HEAD:src/App.tsx', { encoding: 'utf8' });

// 1. Image URLs
content = content.replace(
  "import logoGoogle from '../logoGoogle.jpg';\nimport heroBonecoExample from '../boneco3d_enhanced.png';",
  "const logoGoogle = 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg';\nconst heroBonecoExample = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=600&auto=format&fit=crop';"
);

// 2. Icons
content = content.replace(
  "  Lock,\n  UserRound\n} from 'lucide-react';",
  "  Lock,\n  UserRound,\n  Moon,\n  Sun\n} from 'lucide-react';"
);

// 3. Theme State
content = content.replace(
  "export default function App() {\n  const [view, setView] = useState<View>('home');",
  `export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const [view, setView] = useState<View>('home');`
);

// 4. Auth Error
content = content.replace(
  "setAuthError('Entre na sua conta para salvar o pedido e as imagens no Supabase.');",
  "setAuthError(null);"
);

// 5. Header Layout & Toggle
const oldHeader = `<div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-10 h-10 bg-funko-blue rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,174,239,0.4)] group-hover:scale-110 transition-transform">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-funko-blue drop-shadow-md">
              MINHA FABRICA3D
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/60">
            <button onClick={() => scrollTo(howItWorksRef)} className="hover:text-white transition-colors">Como Funciona</button>
            <button onClick={() => scrollTo(galleryRef)} className="hover:text-white transition-colors">Galeria</button>
            <button onClick={() => scrollTo(pricingRef)} className="hover:text-white transition-colors">Preços</button>
            <button onClick={() => scrollTo(faqRef)} className="hover:text-white transition-colors">Dúvidas</button>
          </div>
          <div className="hidden md:block">
            <button
              onClick={openAccountView}
              disabled={isAuthLoading}
              className="bg-funko-yellow text-[#0A0A0A] px-6 py-2.5 rounded-full text-sm font-black hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,210,0,0.3)] disabled:opacity-70 disabled:cursor-wait"
            >
              {renderAccountButtonContent()}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>`.replace(/\r\n/g, '\n');

const newHeader = `<div className="w-full px-6 lg:px-12 h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 cursor-pointer group z-10" onClick={reset}>
            <div className="w-10 h-10 bg-funko-blue rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,174,239,0.4)] group-hover:scale-110 transition-transform">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-funko-blue drop-shadow-md">
              MINHA FABRICA3D
            </span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 text-sm font-bold dark:text-white/60 text-black/60 w-max">
            <button onClick={() => scrollTo(howItWorksRef)} className="hover:dark:text-white hover:text-black transition-colors">Como Funciona</button>
            <button onClick={() => scrollTo(galleryRef)} className="hover:dark:text-white hover:text-black transition-colors">Galeria</button>
            <button onClick={() => scrollTo(pricingRef)} className="hover:dark:text-white hover:text-black transition-colors">Preços</button>
            <button onClick={() => scrollTo(faqRef)} className="hover:dark:text-white hover:text-black transition-colors">Dúvidas</button>
          </div>
          <div className="hidden md:flex items-center gap-4 z-10">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-full dark:bg-white/5 bg-black/5 dark:text-white/60 text-black/60 hover:dark:bg-white/10 hover:bg-black/10 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={openAccountView}
              disabled={isAuthLoading}
              className="bg-funko-yellow text-[#0A0A0A] px-6 py-2.5 rounded-full text-sm font-black hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,210,0,0.3)] disabled:opacity-70 disabled:cursor-wait"
            >
              {renderAccountButtonContent()}
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-3 z-10">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full dark:text-white/60 text-black/60"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
            <button 
              className="dark:text-white text-black p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>`;

content = content.replace(/\r\n/g, '\n');
content = content.replace(oldHeader, newHeader);

// 6. Global Dark Mode Regex Replacements using a reviver function so $1 is not stripped!
content = content.replace(/(?<!dark:)text-white\/(\d+)/g, (match, p1) => `dark:text-white/${p1} text-black/${p1}`);
content = content.replace(/(?<!dark:)hover:text-white(?!\/)/g, 'hover:dark:text-white hover:text-black');
content = content.replace(/(?<!dark:)bg-\[#0F0F0F\]/g, 'dark:bg-[#0F0F0F] bg-white');
content = content.replace(/text-white placeholder:/g, 'dark:text-white text-gray-900 placeholder:');

// Specific text-white issues found
content = content.replace('className="text-lg font-black text-white">Administrador', 'className="text-lg font-black dark:text-white text-gray-900">Administrador');
content = content.replace('className="text-2xl font-black text-white">R$ 149,90', 'className="text-2xl font-black dark:text-white text-gray-900">R$ 149,90');
content = content.replace('className="text-5xl font-black text-white mb-8">R$ 149,90', 'className="text-5xl font-black dark:text-white text-gray-900 mb-8">R$ 149,90');
content = content.replace('className="text-6xl md:text-8xl font-display font-black tracking-tighter leading-[0.85] mb-8 text-white"', 'className="text-6xl md:text-8xl font-display font-black tracking-tighter leading-[0.85] mb-8 dark:text-white text-gray-900"');
// The "QUERO MEU KIT" buttons which have text-white
content = content.replace('hover:dark:bg-white/10 bg-black/10 transition-colors text-white"', 'hover:dark:bg-white/10 bg-black/10 transition-colors dark:text-white text-gray-900"');

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx successfully rebuilt and patched!');
