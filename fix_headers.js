const fs = require('fs');

const fixes = {
    'index.html': { old: '<div class="page-header d-flex justify-content-between align-items-center">\n            <div>\n                <h2><i class="bi bi-warehouse me-2"></i>仓库管理系统</h2>\n                <p class="mb-0">欢迎使用仓库进销存管理系统</p>\n            </div>\n            <div id="headerActions"></div>\n        </div>\n\n        <div class="page-header d-flex justify-content-between align-items-center">', new: '<div class="page-header d-flex justify-content-between align-items-center">' },
    'product_list.html': { old: '<div class="page-header d-flex justify-content-between align-items-center">\n            <div>\n                <h2><i class="bi bi-list-check me-2"></i>商品管理</h2>\n                <p class="mb-0">查看、编辑、删除商品信息</p>\n            </div>\n            <div id="headerActions"></div>\n        </div>\n\n        <div class="page-header d-flex justify-content-between align-items-center">', new: '<div class="page-header d-flex justify-content-between align-items-center">' },
    'in_records.html': { old: '<div class="page-header d-flex justify-content-between align-items-center">\n            <div>\n                <h2><i class="bi bi-list-ul me-2"></i>入库记录</h2>\n                <p class="mb-0">查看所有入库记录详情</p>\n            </div>\n            <div id="headerActions"></div>\n        </div>\n\n        <div class="page-header d-flex justify-content-between align-items-center">', new: '<div class="page-header d-flex justify-content-between align-items-center">' },
    'dashboard.html': { old: '<div class="page-header d-flex justify-content-between align-items-center">\n            <div>\n                <h2><i class="bi bi-bar-chart-line me-2"></i>数据看板</h2>\n                <p class="mb-0">实时查看仓库运营数据概览</p>\n            </div>\n            <div id="headerActions"></div>\n        </div>\n\n        <div class="page-header d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 1.5rem;">', new: '<div class="page-header d-flex justify-content-between align-items-center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 1.5rem;">' },
};

Object.entries(fixes).forEach(([file, { old, new: newStr }]) => {
    const path = 'D:/wms/public/' + file;
    let content = fs.readFileSync(path, 'utf8');
    if (content.includes(old)) {
        content = content.replace(old, newStr);
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed: ' + file);
    } else {
        console.log('Skip: ' + file);
    }
});
