// routes/placeRoute.js
const express = require('express');
const router = express.Router();
const {
    getAllPlaces, getFeaturedPlaces,
    getPlaceById, getAllPlacesForMap,
    getPlacesList
} = require('../controllers/placeCtrl');
const { getPostsByPlace } = require('../controllers/postCtrl');
const optAuth = require('../middleware/optAuth');   // ← thêm import

router.get('/places/featured', getFeaturedPlaces);
router.get('/places/map', getAllPlacesForMap);
router.get('/places/list', getPlacesList);
router.get('/places', getAllPlaces);
router.get('/places/:id', getPlaceById);
router.get('/places/:id/posts', optAuth, getPostsByPlace);   // ← thêm optAuth

module.exports = router;