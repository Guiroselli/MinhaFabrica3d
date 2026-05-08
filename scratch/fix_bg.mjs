import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/(?<!dark:)bg-\[#(141414|101010|0B0B0B|0A0A0A|1A1A1A)\](\/\d+)?/g, (match, hex, opacity) => {
    const op = opacity || '';
    const lightBg = (hex === '0A0A0A' || hex === '0B0B0B' || hex === '1A1A1A') ? 'bg-gray-100' : 'bg-white';
    return `dark:bg-[#${hex}]${op} ${lightBg}${op}`;
});

content = content.replace(/(?<!dark:)border-white\/(5|10|20)/g, (match, op) => {
    return `dark:border-white/${op} border-black/${op}`;
});

content = content.replace(/(?<!dark:)bg-\[#0F1316\]\/90/g, 'dark:bg-[#0F1316]/90 bg-white/90');

fs.writeFileSync('src/App.tsx', content);
console.log('Fixed backgrounds and borders.');
