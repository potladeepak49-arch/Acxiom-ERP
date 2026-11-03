
const express = require("express");

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deactivateCustomer
} = require("../controllers/customerController");

const { authenticateUser } = require("../middleware/authMiddleware");

const {
  validateCustomer,
  validateCustomerUpdate
} = require("../validators/customerValidator");

const router = express.Router();

// All customer routes require authentication.
router.use(authenticateUser);

// Get all customers
router.get("/", getCustomers);

// Get one customer
router.get("/:id", getCustomerById);

// Create customer
router.post("/", validateCustomer, createCustomer);

// Update customer
router.put("/:id", validateCustomerUpdate, updateCustomer);

// Deactivate customer
router.patch("/:id/deactivate", deactivateCustomer);

module.exports = router;
