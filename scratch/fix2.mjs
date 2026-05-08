import fs from 'fs';
import { execSync } from 'child_process';

const originalContent = execSync('git show HEAD:src/App.tsx', { encoding: 'utf8' });
let currentContent = fs.readFileSync('src/App.tsx', 'utf8');

const originalMatches = [...originalContent.matchAll(/(?<!dark:)text-white\/(\d+)/g)];

// Filter out the ones that were successfully replaced in the FIRST script
const failedMatches = originalMatches.filter(m => !['40', '60', '80'].includes(m[1]));

console.log(`Original matches: ${originalMatches.length}`);
console.log(`Failed matches (should match BUGGED_TOKEN count): ${failedMatches.length}`);

const buggedCount = (currentContent.match(/BUGGED_TOKEN/g) || []).length;
console.log(`BUGGED_TOKEN count: ${buggedCount}`);

if (failedMatches.length === buggedCount) {
    let i = 0;
    currentContent = currentContent.replace(/BUGGED_TOKEN/g, () => {
        const opacity = failedMatches[i][1];
        i++;
        return `dark:text-white/${opacity} text-black/${opacity}`;
    });
    fs.writeFileSync('src/App.tsx', currentContent);
    console.log('Fixed successfully!');
} else {
    console.log('Mismatch in counts! Cannot perform sequential replace safely.');
}
