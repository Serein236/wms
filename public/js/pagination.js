/**
 * Pagination helper for frontend
 */
const PaginationHelper = {
    /**
     * Create pagination HTML controls
     * @param {Object} pagination - { page, pageSize, total, totalPages }
     * @param {string} onPageChange - Function name to call on page change
     * @returns {string} HTML string for pagination controls
     */
    render(pagination, onPageChange) {
        if (!pagination || pagination.totalPages <= 1) return '';

        const { page, total, totalPages } = pagination;
        let html = '<nav aria-label="Page navigation"><ul class="pagination justify-content-center mb-0">';

        // Previous button
        html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${onPageChange}(${page - 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="${onPageChange}(1); return false;">1</a></li>`;
            if (startPage > 2) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" onclick="${onPageChange}(${i}); return false;">${i}</a>
            </li>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            html += `<li class="page-item"><a class="page-link" href="#" onclick="${onPageChange}(${totalPages}); return false;">${totalPages}</a></li>`;
        }

        // Next button
        html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${onPageChange}(${page + 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>`;

        html += '</ul></nav>';
        html += `<div class="text-center text-muted mt-2" style="font-size: 0.85em;">共 ${total} 条记录</div>`;

        return html;
    },

    /**
     * Build URL with pagination params
     * @param {string} baseUrl - Base URL
     * @param {Object} params - Additional query params
     * @param {Object} pagination - { page, pageSize }
     * @returns {string} URL with pagination params
     */
    buildUrl(baseUrl, params = {}, pagination) {
        const url = new URL(baseUrl, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        if (pagination) {
            url.searchParams.set('page', pagination.page);
            url.searchParams.set('pageSize', pagination.pageSize);
        }
        return url.pathname + url.search;
    },

    /**
     * Get default pagination state
     * @returns {Object} Default pagination state
     */
    getDefaultState() {
        return {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 0
        };
    }
};
