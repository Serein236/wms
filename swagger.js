const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: '仓库进销存管理系统 API',
            version: '1.0.0',
            description: '仓库进销存管理系统后端 API 文档',
            contact: {
                name: '技术支持'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: '本地开发服务器'
            }
        ],
        components: {
            securitySchemes: {
                sessionAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                    description: '基于 session 的认证，需要先登录获取 session'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', description: '用户ID' },
                        username: { type: 'string', description: '用户名' },
                        role: { type: 'string', enum: ['admin', 'user'], description: '用户角色' },
                        is_active: { type: 'boolean', description: '是否启用' },
                        created_at: { type: 'string', format: 'date-time', description: '创建时间' }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', description: '商品ID' },
                        name: { type: 'string', description: '商品名称' },
                        product_code: { type: 'string', description: '商品编码' },
                        spec: { type: 'string', description: '规格' },
                        unit: { type: 'string', description: '单位' },
                        packing_spec: { type: 'string', description: '包装规格' },
                        retail_price: { type: 'number', description: '零售价' },
                        barcode: { type: 'string', description: '条形码' },
                        manufacturer: { type: 'string', description: '生产厂家' },
                        warning_quantity: { type: 'integer', description: '预警数量' },
                        danger_quantity: { type: 'integer', description: '危险数量' },
                        current_stock: { type: 'integer', description: '当前库存' }
                    }
                },
                InRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', description: '记录ID' },
                        product_id: { type: 'integer', description: '商品ID' },
                        product_name: { type: 'string', description: '商品名称' },
                        stock_method_name: { type: 'string', description: '入库方式' },
                        batch_number: { type: 'string', description: '批次号' },
                        production_date: { type: 'string', format: 'date', description: '生产日期' },
                        expiration_date: { type: 'string', format: 'date', description: '保质期' },
                        quantity: { type: 'integer', description: '数量' },
                        unit_price: { type: 'number', description: '单价' },
                        total_amount: { type: 'number', description: '总金额' },
                        source: { type: 'string', description: '供应商' },
                        remark: { type: 'string', description: '备注' },
                        recorded_date: { type: 'string', format: 'date', description: '记录日期' },
                        created_by: { type: 'integer', description: '创建人ID' },
                        created_at: { type: 'string', format: 'date-time', description: '创建时间' }
                    }
                },
                OutRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', description: '记录ID' },
                        product_id: { type: 'integer', description: '商品ID' },
                        product_name: { type: 'string', description: '商品名称' },
                        stock_method_name: { type: 'string', description: '出库方式' },
                        batch_number: { type: 'string', description: '批次号' },
                        quantity: { type: 'integer', description: '数量' },
                        unit_price: { type: 'number', description: '单价' },
                        total_amount: { type: 'number', description: '总金额' },
                        destination: { type: 'string', description: '客户/去向' },
                        remark: { type: 'string', description: '备注' },
                        recorded_date: { type: 'string', format: 'date', description: '记录日期' },
                        created_by: { type: 'integer', description: '创建人ID' },
                        created_at: { type: 'string', format: 'date-time', description: '创建时间' }
                    }
                },
                Log: {
                    type: 'object',
                    properties: {
                        timestamp: { type: 'string', format: 'date-time', description: '时间戳' },
                        level: { type: 'string', enum: ['INFO', 'WARN', 'ERROR'], description: '日志级别' },
                        operator: { type: 'string', description: '操作人' },
                        operatorId: { type: 'integer', description: '操作人ID' },
                        action: { type: 'string', description: '操作类型' },
                        target: { type: 'string', description: '操作对象' },
                        description: { type: 'string', description: '描述' },
                        extra: { type: 'object', description: '额外信息' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', description: '错误信息' }
                    }
                },
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', description: '成功信息' }
                    }
                }
            }
        }
    },
    apis: [
        './routes/*.js',
        './controllers/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
