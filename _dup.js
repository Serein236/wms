const fs = require('fs');
['index.html','products.html','product_list.html','in_records.html','dashboard.html'].forEach(f => {
    const c = fs.readFileSync('D:/wms/public/' + f, 'utf8');
    const phCount = (c.match(/page-header/g) || []).length;
    console.log(f + ': page-header=' + phCount);
    // Show first 200 chars after each page-header
    const parts = c.split('page-header');
    if (parts.length > 2) {
        parts.slice(1, 3).forEach((p, i) => console.log('  #' + (i+1) + ': ' + p.substring(0, 100).replace(/\n/g, ' ')));
    }
});
