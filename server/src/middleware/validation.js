const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

const schemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  pinLogin: Joi.object({
    username: Joi.string().required(),
    pin: Joi.string().length(4).required()
  }),

  createOrder: Joi.object({
    branchId: Joi.number().integer().positive().required(),
    tableId: Joi.number().integer().positive().required(),
    customerName: Joi.string().max(100),
    customerPhone: Joi.string().max(20),
    items: Joi.array().items(
      Joi.object({
        menuItemId: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required(),
        notes: Joi.string().max(500),
        modifiers: Joi.array().items(
          Joi.object({
            modifierId: Joi.number().integer().positive().required()
          })
        )
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('CASH', 'CARD', 'ONLINE').default('CASH'),
    notes: Joi.string().max(1000)
  }),

  createMenuItem: Joi.object({
    branchId: Joi.number().integer().positive().required(),
    categoryId: Joi.number().integer().positive().required(),
    sku: Joi.string().max(50),
    name: Joi.string().max(200).required(),
    description: Joi.string().max(1000),
    price: Joi.number().positive().required(),
    image: Joi.string().max(500),
    prepTime: Joi.number().integer().positive().default(15),
    allergens: Joi.array().items(Joi.string())
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid(
      'SUBMITTED', 'AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 
      'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'
    ).required()
  }),

  recordPayment: Joi.object({
    orderId: Joi.number().integer().positive().required(),
    paymentType: Joi.string().valid('CASH', 'CARD', 'ONLINE').required(),
    amount: Joi.number().positive().required(),
    transactionRef: Joi.string().max(100)
  })
};

module.exports = {
  validateRequest,
  schemas
};