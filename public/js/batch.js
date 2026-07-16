let currentMode = 'in';
let batchItems = [];
let products = [];
let stockMethods = { in: ['采购入库', '退货入库', '调拨入库', '生产入库', '其他入库'], out: ['销售出库', '调拨出库', '报损出库', '样品出库', '其他出库'] };

async function checkLogin() {
    try {
        const resp = await fetch('/api/auth/current-user');
        const data = await resp.json();
        if (!data.loggedIn) { window.location.href = 'login.html'; return; }
        document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
        document.getElementById('commonDate').value = new Date().toISOString().split('T')[0];
        await loadProducts();
        addItem();
    } catch (e) { console.error(e); }
}

async function loadProducts() {
    try {
        const resp = await fetch('/api/products');
        const data = await resp.json();
        products = Array.isArray(data) ? data : (data.data || []);
    } catch (e) { console.error('加载商品失败:', e); }
}

function setMode(mode) {
    currentMode = mode;
    document.getElementById('btnInMode').classList.toggle('active', mode === 'in');
    document.getElementById('btnOutMode').classList.toggle('active', mode === 'out');
    document.getElementById('btnInMode').classList.toggle('btn-success', mode === 'in');
    document.getElementById('btnInMode').classList.toggle('btn-outline-success', mode !== 'in');
    document.getElementById('btnOutMode').classList.toggle('btn-warning', mode === 'out');
    document.getElementById('btnOutMode').classList.toggle('btn-outline-warning', mode !== 'out');
    document.getElementById('commonFieldLabel').textContent = mode === 'in' ? '来源（供应商）' : '去向（客户）';
    renderItems();
}

function addItem() {
    batchItems.push({ product_id: '', stock_method_name: stockMethods[currentMode][0], batch_number: '', quantity: 1, unit_price: 0 });
    renderItems();
}

function removeItem(index) {
    batchItems.splice(index, 1);
    renderItems();
}

function renderItems() {
    const container = document.getElementById('batchItems');
    if (!batchItems.length) {
        container.innerHTML = '<div class="text-center text-muted py-4"><i class="bi bi-inbox fs-1"></i><p class="mt-2">点击"添加一行"开始</p></div>';
        document.getElementById('totalCount').textContent = '0';
        return;
    }

    const productOptions = products.map(p => `<option value="${p.id}">${p.name} (${p.spec || ''})</option>`).join('');
    const methodOptions = stockMethods[currentMode].map(m => `<option value="${m}">${m}</option>`).join('');

    container.innerHTML = batchItems.map((item, i) => `
        <div class="card mb-2 border">
            <div class="card-body py-2">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3">
                        <select class="form-select form-select-sm" onchange="batchItems[${i}].product_id=this.value">
                            <option value="">选择商品</option>
                            ${products.map(p => `<option value="${p.id}" ${p.id == item.product_id ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <select class="form-select form-select-sm" onchange="batchItems[${i}].stock_method_name=this.value">
                            ${stockMethods[currentMode].map(m => `<option value="${m}" ${m === item.stock_method_name ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="text" class="form-control form-control-sm" placeholder="批号" value="${item.batch_number}" onchange="batchItems[${i}].batch_number=this.value">
                    </div>
                    <div class="col-md-1">
                        <input type="number" class="form-control form-control-sm" min="1" value="${item.quantity}" onchange="batchItems[${i}].quantity=parseInt(this.value)||1">
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control form-control-sm" step="0.01" placeholder="单价" value="${item.unit_price||''}" onchange="batchItems[${i}].unit_price=parseFloat(this.value)||0">
                    </div>
                    <div class="col-md-1">
                        <button class="btn btn-sm btn-outline-danger" onclick="removeItem(${i})"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('totalCount').textContent = batchItems.length;
}

async function submitBatch() {
    if (!batchItems.length) { alert('请先添加项目'); return; }

    const validItems = batchItems.filter(item => item.product_id && item.batch_number);
    if (!validItems.length) { alert('请至少填写一个完整的项目（商品、批号）'); return; }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>处理中...';

    const payload = {
        items: validItems,
        [currentMode === 'in' ? 'source' : 'destination']: document.getElementById('commonSource').value.trim(),
        recorded_date: document.getElementById('commonDate').value,
        remark: document.getElementById('commonRemark').value.trim()
    };

    try {
        const resp = await fetch(`/api/batch/${currentMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await resp.json();

        if (result.success) {
            let msg = `成功 ${result.successCount} 条`;
            if (result.failCount > 0) msg += `\n失败 ${result.failCount} 条`;
            if (result.errors && result.errors.length) msg += '\n\n' + result.errors.join('\n');
            alert(msg);
            if (result.successCount > 0) {
                batchItems = [];
                addItem();
            }
        } else {
            alert('操作失败: ' + (result.message || '未知错误'));
        }
    } catch (e) {
        alert('操作失败: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>提交批量操作';
    }
}

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = 'login.html'; } catch (e) {}
}

document.addEventListener('DOMContentLoaded', checkLogin);
