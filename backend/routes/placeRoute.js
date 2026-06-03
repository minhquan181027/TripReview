// routes/placeRoute.js
const express = require('express');
const router = express.Router();
const { getAllPlaces, getFeaturedPlaces, getPlaceById } = require('../controllers/placeCtrl');

router.get('/places', getAllPlaces);
router.get('/places/featured', getFeaturedPlaces);
router.get('/places/:id', getPlaceById);

module.exports = router;