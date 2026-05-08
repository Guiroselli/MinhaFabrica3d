import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Normalize newlines
content = content.replace(/\r\n/g, '\n');

const target = `          <div className="hidden md:block z-10">
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
            className="dark:text-white text-black p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>`.replace(/\r\n/g, '\n');

const replacement = `          <div className="hidden md:flex items-center gap-4 z-10">
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

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Replaced successfully');
} else {
  console.log('Target not found');
}
