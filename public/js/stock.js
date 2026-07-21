function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// 分页状态
let stockPagination = PaginationHelper.getDefaultState();
let allStockData = [];

async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    undefined
                    loadStock();
                }
            } catch (error) { console.error(error); }
        }

        async function loadStock(page) {
            const paginationDiv = document.getElementById('paginationControls');

            if (page) stockPagination.page = page;

            try {
                const loadingRow = document.getElementById('loadingRow');
                if (loadingRow) {
                    loadingRow.style.display = '';
                }

                const noDataMessage = document.getElementById('noDataMessage');
                if (noDataMessage) {
                    noDataMessage.style.display = 'none';
                }

                const url = PaginationHelper.buildUrl('/api/stock', {}, stockPagination);
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }

                const result = await response.json();

                if (loadingRow) {
                    loadingRow.style.display = 'none';
                }

                // Handle both paginated and non-paginated responses
                let stockData;
                if (result.success && result.data) {
                    stockData = result.data;
                    stockPagination = { ...stockPagination, ...result.pagination };
                } else {
                    stockData = result;
                }

                if (stockData.error) {
                    alert('加载库存失败: ' + stockData.error);
                    return;
                }

                if (stockData.length === 0) {
                    if (noDataMessage) {
                        noDataMessage.style.display = 'block';
                    }
                    if (paginationDiv) paginationDiv.innerHTML = '';
                }

                allStockData = stockData;
                renderStock(stockData);

                // Render pagination controls
                if (paginationDiv && result.pagination) {
                    paginationDiv.innerHTML = PaginationHelper.render(result.pagination, 'loadStock');
                } else if (paginationDiv) {
                    paginationDiv.innerHTML = '';
                }
            } catch (error) {
                console.error('加载库存失败:', error);

                const loadingRow = document.getElementById('loadingRow');
                if (loadingRow) {
                    loadingRow.style.display = 'none';
                }

                const tbody = document.getElementById('stockTable');
                if (tbody) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="9" class="text-center text-danger">
                                <i class="bi bi-exclamation-triangle me-2"></i>加载失败: ${error.message}
                            </td>
                        </tr>
                    `;
                }
            }
        }

        function refreshStock() {
            stockPagination.page = 1;
            loadStock();
        }

        function filterStock() {
            const searchQuery = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
            const statusFilter = document.getElementById('statusFilter')?.value || '';
            let filtered = allStockData;

            if (searchQuery) {
                filtered = filtered.filter(item =>
                    (item.product_name || '').toLowerCase().includes(searchQuery) ||
                    (item.product_spec || '').toLowerCase().includes(searchQuery) ||
                    String(item.product_id).includes(searchQuery)
                );
            }
            if (statusFilter) {
                filtered = filtered.filter(item => item.batch_status === statusFilter);
            }
            renderStock(filtered);
        }

        function renderStock(stockData) {
            const tbody = document.getElementById('stockTable');
            if (!tbody) return;

            tbody.innerHTML = '';

            let totalValue = 0;

            if (!stockData || stockData.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="10" class="text-center text-muted">
                        <i class="bi bi-inbox me-2"></i>暂无库存数据
                    </td>
                `;
                tbody.appendChild(row);

                const totalValueElement = document.getElementById('totalValue');
                if (totalValueElement) {
                    totalValueElement.textContent = '¥0.00';
                }
                return;
            }

            stockData.forEach(item => {
                const totalIn = item.batch_in_quantity || 0;
                const totalOut = item.batch_out_quantity || 0;
                const currentStock = item.current_stock || 0;
                const inPrice = item.in_price || 0;
                const stockValue = inPrice * currentStock;
                totalValue += stockValue;

                let stockBadgeClass = 'bg-success';
                if (currentStock <= 0) {
                    stockBadgeClass = 'bg-danger';
                } else if (item.danger_quantity && currentStock <= item.danger_quantity) {
                    stockBadgeClass = 'bg-danger';
                } else if (item.warning_quantity && currentStock <= item.warning_quantity) {
                    stockBadgeClass = 'bg-warning';
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.product_id || '-'}</td>
                    <td>${escapeHtml(item.product_name) || '-'}</td>
                    <td>${escapeHtml(item.product_spec) || '-'}</td>
                    <td>${escapeHtml(item.product_unit) || '-'}</td>
                    <td>${escapeHtml(item.batch_number) || '-'}</td>
                    <td><span class="badge bg-info">${totalIn}</span></td>
                    <td><span class="badge bg-warning">${totalOut}</span></td>
                    <td>
                        <span class="badge ${stockBadgeClass}">
                            ${currentStock}
                        </span>
                    </td>
                    <td>${inPrice ? '¥' + parseFloat(inPrice).toFixed(2) : '-'}</td>
                    <td class="fw-bold">${stockValue ? '¥' + stockValue.toFixed(2) : '-'}</td>
                `;
                tbody.appendChild(row);
            });

            const totalValueElement = document.getElementById('totalValue');
            if (totalValueElement) {
                totalValueElement.textContent = '¥' + totalValue.toFixed(2);
            }
        }

        function exportToExcel() {
            const table = document.getElementById('stockTable');
            if (!table) {
                alert('表格不存在');
                return;
            }

            const rows = table.getElementsByTagName('tr');

            if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
                alert('没有数据可以导出');
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "商品ID,商品名称,规格,单位,产品批号,总入库,总出库,现有库存,入库价,库存价值\n";

            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].getElementsByTagName('td');
                if (cells.length === 0) continue;

                const row = [];
                for (let j = 0; j < cells.length; j++) {
                    let cellText = cells[j].textContent.trim();
                    cellText = cellText.replace('¥', '');
                    cellText = cellText.replace(/,/g, '，');
                    row.push(`"${cellText}"`);
                }

                csvContent += row.join(',') + "\n";
            }

            const totalValueElement = document.getElementById('totalValue');
            if (totalValueElement) {
                const totalValue = totalValueElement.textContent.replace('¥', '');
                csvContent += `,,,,,,,总计,${totalValue}\n`;
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            link.setAttribute("download", `库存报表_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        async function logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = 'login.html';
            } catch (error) {
                console.error('退出登录失败:', error);
            }
        }

        document.addEventListener('DOMContentLoaded', checkLogin);
