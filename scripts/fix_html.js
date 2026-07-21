/**
 * 修复被损坏的HTML文件
 * 检查并修复缺少的闭合标签和重复内容
 */
const fs = require('fs');
const path = require('path');

const files = ['in.html', 'out.html', 'out_records.html', 'query.html', 'stock.html', 'batch.html', 'suppliers.html', 'dashboard.html', 'import.html', 'settings.html'];

files.forEach(f => {
    const filePath = path.join(__dirname, '..', 'public', f);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix: remove duplicate page-header (first one from template, second from original)
    const headers = content.match(/<div class="page-header[^"]*">[\s\S]*?<\/div>\s*<\/div>/g);
    if (headers && headers.length > 1) {
        // Remove the first page-header (template one)
        content = content.replace(headers[0], '');
    }

    // Fix: ensure main-wrapper has proper closing
    // Count div opens and closes
    const divOpens = (content.match(/<div[\s>]/g) || []).length;
    const divCloses = (content.match(/<\/div>/g) || []).length;
    if (divCloses < divOpens) {
        const missing = divOpens - divCloses;
        // Find where to insert closing divs (before footer)
        const footerIdx = content.indexOf('<footer>');
        if (footerIdx > 0) {
            let closingDivs = '';
            for (let i = 0; i < missing; i++) closingDivs += '    </div>\n';
            content = content.substring(0, footerIdx) + closingDivs + content.substring(footerIdx);
        }
    }

    // Fix: remove duplicate script tags
    const scriptMatches = content.match(/<script src="https:\/\/cdnjs.cloudflare.com\/ajax\/libs\/bootstrap[^"]*"><\/script>/g);
    if (scriptMatches && scriptMatches.length > 1) {
        content = content.replace(scriptMatches[0], '');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + f);
    } else {
        console.log('OK: ' + f);
    }
});
