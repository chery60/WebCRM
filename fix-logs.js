const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/lib/db/repositories/supabase');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

let totalChanges = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let changes = 0;

    // Using a simpler replacement strategy
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('console.error(') && line.includes('error);')) {
            lines[i] = line.replace(/error\);$/, 'error?.message || error);');
            changes++;
        } else if (line.includes('console.error(') && line.includes('convError);')) {
            lines[i] = line.replace(/convError\);$/, 'convError?.message || convError);');
            changes++;
        } else if (line.includes('console.error(') && line.includes('fetchError);')) {
            lines[i] = line.replace(/fetchError\);$/, 'fetchError?.message || fetchError);');
            changes++;
        } else if (line.includes('console.error(') && line.includes('membershipError);')) {
            lines[i] = line.replace(/membershipError\);$/, 'membershipError?.message || membershipError);');
            changes++;
        }
    }

    if (changes > 0) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Updated ${changes} logs in ${file}`);
        totalChanges += changes;
    }
}
console.log(`Done. Total ${totalChanges} log entries updated.`);
