/**
 * Parse pagination parameters from query string
 * @param {Object} query - req.query
 * @param {Object} options - { defaultPage: 1, defaultPageSize: 20, maxPageSize: 100 }
 * @returns {Object} { page, pageSize, offset, limit }
 */
function parsePagination(query, options = {}) {
    const { defaultPage = 1, defaultPageSize = 20, maxPageSize = 100 } = options;
    let page = parseInt(query.page) || defaultPage;
    let pageSize = parseInt(query.pageSize) || defaultPageSize;
    if (page < 1) page = 1;
    if (pageSize < 1) pageSize = defaultPageSize;
    if (pageSize > maxPageSize) pageSize = maxPageSize;
    const offset = (page - 1) * pageSize;
    return { page, pageSize, offset, limit: pageSize };
}

/**
 * Add LIMIT and OFFSET to SQL query
 * @param {string} sql - Original SQL
 * @param {Object} pagination - { offset, limit }
 * @returns {string} SQL with LIMIT clause
 */
function addPagination(sql, pagination) {
    return `${sql} LIMIT ${pagination.limit} OFFSET ${pagination.offset}`;
}

/**
 * Build pagination response
 * @param {number} total - Total records
 * @param {Object} pagination - { page, pageSize }
 * @returns {Object} { page, pageSize, total, totalPages }
 */
function buildPaginationResponse(total, pagination) {
    return {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.ceil(total / pagination.pageSize)
    };
}

module.exports = { parsePagination, addPagination, buildPaginationResponse };
