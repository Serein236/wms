let trendChart = null;
let statusChart = null;
let topProductsChart = null;

async function checkLogin() {
    try {
        const res = await fetch('/api/auth/current-user');
        const data = await res.json();
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('currentUser').textContent = '欢迎, ' + data.username;
            loadDashboard();
        }
    } catch (e) {
        console.error('check login failed', e);
    }
}

async function loadDashboard() {
    await Promise.all([loadKPI(), loadTrend(), loadTopProducts(), loadStockStatus(), loadAlerts()]);
}

async function loadKPI() {
    try {
        const resp = await fetch('/api/dashboard/kpi');
        const result = await resp.json();
        if (result.success) {
            var d = result.data;
            document.getElementById('kpiProducts').textContent = d.totalProducts;
            document.getElementById('kpiStock').textContent = Number(d.totalStock).toLocaleString();
            document.getElementById('kpiValue').textContent = '¥' + Number(d.totalValue).toLocaleString(undefined, {minimumFractionDigits: 2});
            document.getElementById('kpiRecords').textContent = d.totalInRecords + d.totalOutRecords;
        }
    } catch (e) { console.error('加载KPI失败:', e); }
}

async function loadTrend() {
    try {
        var resp = await fetch('/api/dashboard/trend?months=6');
        var result = await resp.json();
        if (!result.success) return;
        var inbound = result.data.inbound || [];
        var outbound = result.data.outbound || [];

        var allMonths = [];
        var seen = {};
        inbound.concat(outbound).forEach(function(r) {
            if (!seen[r.month]) { seen[r.month] = true; allMonths.push(r.month); }
        });
        allMonths.sort();

        var inMap = {};
        inbound.forEach(function(r) { inMap[r.month] = r.total_amount || 0; });
        var outMap = {};
        outbound.forEach(function(r) { outMap[r.month] = r.total_amount || 0; });

        var ctx = document.getElementById('trendChart').getContext('2d');
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: allMonths,
                datasets: [
                    { label: '入库金额', data: allMonths.map(function(m) { return inMap[m] || 0; }), backgroundColor: 'rgba(13,202,240,0.6)', borderColor: '#0dcaf0', borderWidth: 1 },
                    { label: '出库金额', data: allMonths.map(function(m) { return outMap[m] || 0; }), backgroundColor: 'rgba(255,193,7,0.6)', borderColor: '#ffc107', borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    } catch (e) { console.error('加载趋势失败:', e); }
}

async function loadTopProducts() {
    try {
        var resp = await fetch('/api/dashboard/top-products?limit=10');
        var result = await resp.json();
        if (!result.success || !result.data || !result.data.length) return;

        var ctx = document.getElementById('topProductsChart').getContext('2d');
        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: result.data.map(function(p) { return p.name; }),
                datasets: [{ label: '当前库存', data: result.data.map(function(p) { return p.current_stock; }), backgroundColor: 'rgba(25,135,84,0.6)', borderColor: '#198754', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        });
    } catch (e) { console.error('加载库存排行失败:', e); }
}

async function loadStockStatus() {
    try {
        var resp = await fetch('/api/dashboard/stock-status');
        var result = await resp.json();
        if (!result.success || !result.data || !result.data.length) return;

        var statusLabels = { normal: '正常', warning: '预警', danger: '危险', out_of_stock: '缺货' };
        var statusColors = { normal: '#198754', warning: '#ffc107', danger: '#fd7e14', out_of_stock: '#dc3545' };

        var ctx = document.getElementById('statusChart').getContext('2d');
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: result.data.map(function(r) { return statusLabels[r.stock_status] || r.stock_status; }),
                datasets: [{ data: result.data.map(function(r) { return r.count; }), backgroundColor: result.data.map(function(r) { return statusColors[r.stock_status] || '#6c757d'; }) }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    } catch (e) { console.error('加载库存状态失败:', e); }
}

async function loadAlerts() {
    try {
        var resp = await fetch('/api/stock?pageSize=100');
        var result = await resp.json();
        var tbody = document.getElementById('alertTable');
        var empty = document.getElementById('alertEmpty');

        var items = [];
        var data = result.data || result;
        if (Array.isArray(data)) {
            items = data.filter(function(s) { return s.stock_status === 'danger' || s.stock_status === 'out_of_stock'; });
        }

        if (!items.length) {
            tbody.innerHTML = '';
            empty.classList.remove('d-none');
            return;
        }
        empty.classList.add('d-none');
        var statusMap = { danger: ['bg-warning text-dark', '危险'], out_of_stock: ['bg-danger', '缺货'] };
        tbody.innerHTML = items.map(function(s) {
            var st = statusMap[s.stock_status] || ['bg-secondary', s.stock_status];
            return '<tr><td>' + (s.name || '') + '</td><td>' + s.current_stock + '</td><td>' + (s.warning_quantity || '-') + '</td><td><span class="badge ' + st[0] + '">' + st[1] + '</span></td></tr>';
        }).join('');
    } catch (e) { console.error('加载预警失败:', e); }
}

function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = 'login.html'; } catch (e) {}
}

document.addEventListener('DOMContentLoaded', checkLogin);
