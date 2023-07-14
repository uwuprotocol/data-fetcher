const mongoose = require("mongoose");

const dataSchema = new mongoose.Schema({
  prices: Object,
  oracle: Object,
  system: Object,
  revenue: Object,
  usm: Object,
  treasury: Object,
  pools: Object
}, { timestamps: true });

module.exports = mongoose.model("Data Snapshots", dataSchema);