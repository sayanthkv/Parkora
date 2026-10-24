const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocationById,
  getFloorBaysWithAvailability,
} = require('../controllers/locationController');

router.get('/', getLocations);
router.get('/:id', getLocationById);
router.get('/:locationId/floors/:floorId/bays', getFloorBaysWithAvailability);

module.exports = router;