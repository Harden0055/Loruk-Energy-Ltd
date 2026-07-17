const fs = require('fs');
const glob = require('glob'); // Note: we can just use child_process or standard fs

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = dir + '/' + file;
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace sorting by date to sorting by createdAt
            // Examples: b.date - a.date
            content = content.replace(/b\.date - a\.date/g, '(b.createdAt || b.date) - (a.createdAt || a.date)');
            // a.date - b.date
            content = content.replace(/a\.date - b\.date/g, '(a.createdAt || a.date) - (b.createdAt || b.date)');
            
            // String localeCompare dates: b.date.localeCompare(a.date)
            content = content.replace(/b\.date\.localeCompare\(a\.date\)/g, '((b.createdAt || b.date) > (a.createdAt || a.date) ? -1 : 1)');
            content = content.replace(/a\.date\.localeCompare\(b\.date\)/g, '((a.createdAt || a.date) > (b.createdAt || b.date) ? 1 : -1)');
            
            // Also handle (b.date || '').localeCompare(a.date || '')
            content = content.replace(/\(b\.date \|\| ''\)\.localeCompare\(a\.date \|\| ''\)/g, '((b.createdAt || b.date) > (a.createdAt || a.date) ? -1 : 1)');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

processDirectory('./src');
