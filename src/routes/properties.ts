import express from 'express';
import { Property } from '../models/Property';
import { AuthRequest } from '../middleware/auth';
import { Favorite } from '../models/Favorite';
import { CacheService } from '../services/cacheService';
import { RequestHandler } from 'express';

const router = express.Router();

// GET all properties
router.get('/', (async (req: AuthRequest, res) => {
  try {
    const properties = await Property.find();
    if (!properties) {
      return res.status(404).send({ message: 'No properties found' });
    }

    // Add favorite status if user is authenticated
    let propertiesWithFavorites = properties;
    if (req.user) {
      const favoritePropertyIds = await Favorite.find({
        userId: req.user._id,
        propertyId: { $in: properties.map(p => p._id) },
      }).distinct('propertyId');

      propertiesWithFavorites = properties.map(property => {
        const propertyWithFavorite = property as any;
        propertyWithFavorite.isFavorite = favoritePropertyIds.some(id => id.toString() === property._id.toString());
        return propertyWithFavorite;
      });
    }

    return res.status(200).send(propertiesWithFavorites);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching properties' });
  }
}) as RequestHandler);

// GET property by ID
router.get('/:id', (async (req: AuthRequest, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }

    const { id } = req.params;

    // Add favorite status if user is authenticated
    let propertyWithFavorite = property as any;
    if (req.user) {
      let isFavorite = await CacheService.getFavoriteCheck(req.user._id.toString(), id);
      
      if (isFavorite === null) {
        const favorite = await Favorite.findOne({
          userId: req.user._id,
          propertyId: id,
        });
        isFavorite = !!favorite;
        await CacheService.setFavoriteCheck(req.user._id.toString(), id, isFavorite);
      }
      
      propertyWithFavorite = {
        ...property,
        isFavorite,
      } as any;
    }

    return res.status(200).send(propertyWithFavorite);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error fetching property' });
  }
})as RequestHandler);

// POST a new property
router.post('/', async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    res.status(201).send(property);
  } catch (error) {
    console.error(error);
    res.status(400).send({ message: 'Error creating property' });
  }
});

// PUT (update) an existing property
router.put('/:id', (async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }
    res.status(200).send(property);
  } catch (error) {
    console.error(error);
    res.status(400).send({ message: 'Error updating property' });
  }
}) as RequestHandler);

// DELETE a property
router.delete('/:id', (async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).send({ message: 'Property not found' });
    }
    res.status(200).send({ message: 'Property deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error deleting property' });
  }
}) as RequestHandler);

export default router;