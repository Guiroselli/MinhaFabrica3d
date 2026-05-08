import fs from 'fs';
import { execSync } from 'child_process';

const originalContent = execSync('git show HEAD:src/App.tsx', { encoding: 'utf8' });
let currentContent = fs.readFileSync('src/App.tsx', 'utf8');

const originalMatches = [...originalContent.matchAll(/(?<!dark:)text-white\/(\d+)/g)];
let buggedCount = 0;

currentContent = currentContent.replace(/dark:text-white\/\s*text-black\//g, () => {
    // We need the next unmatched original match that wasn't 40, 60, or 80!
    // Wait, let's just find the first original match that hasn't been consumed.
    // Actually, it's much safer to find the original text-white/XX by string similarity or just matching the whole file.
    return "BUGGED_TOKEN";
});

// A better way: The bugged tokens were created from `/text-white\/(\d+)/g`.
// Let's just find all `text-white/(\d+)` in originalContent.
// For each match, we can find its surrounding text (e.g. 20 chars before and after).
// Then we find that surrounding text in currentContent.
// If it contains `BUGGED_TOKEN`, we replace it with `dark:text-white/$1 text-black/$1`.
// If it contains `dark:text-white/$1 text-black/$1`, we ignore it (already correctly replaced).

let newContent = currentContent;

for (const match of originalMatches) {
    const opacity = match[1];
    const originalString = match[0]; // text-white/XX
    const index = match.index;
    
    // Get context
    const start = Math.max(0, index - 30);
    const end = Math.min(originalContent.length, index + 30);
    const contextOriginal = originalContent.substring(start, end);
    
    // We create a regex from the context, replacing the original string with either BUGGED_TOKEN or the correct replacement
    // To avoid regex escaping hell, let's just do a simple search.
    // We know the exact string before the match.
    const prefix = originalContent.substring(Math.max(0, index - 20), index);
    
    // Find this prefix in newContent
    const prefixIndex = newContent.indexOf(prefix);
    if (prefixIndex !== -1) {
        // Look at what follows the prefix
        const afterPrefix = newContent.substring(prefixIndex + prefix.length, prefixIndex + prefix.length + 50);
        if (afterPrefix.startsWith("BUGGED_TOKEN")) {
            newContent = newContent.substring(0, prefixIndex + prefix.length) + 
                         `dark:text-white/${opacity} text-black/${opacity}` + 
                         newContent.substring(prefixIndex + prefix.length + "BUGGED_TOKEN".length);
            buggedCount++;
        }
    }
}

// Any remaining BUGGED_TOKEN?
const remaining = (newContent.match(/BUGGED_TOKEN/g) || []).length;
console.log(`Replaced ${buggedCount} bugged tokens. Remaining: ${remaining}`);

fs.writeFileSync('src/App.tsx', newContent);
