import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import { Property } from '../models/Property';
import { User } from '../models/User';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger';

dotenv.config();

interface CSVRow {
  [key: string]: string;
}

const importCSV = async () => {
  try {
    // Connect to database
    await connectDB();

    // Create a default user for imported properties
    let defaultUser = await User.findOne({ email: 'admin@propertylistings.com' });
    if (!defaultUser) {
      defaultUser = new User({
        email: 'admin@propertylistings.com',
        password: 'admin123456',
        firstName: 'System',
        lastName: 'Admin',
      });
      await defaultUser.save();
      logger.info('Created default admin user');
    }

    const csvFilePath = path.join(__dirname, '../../data/properties.csv');
    
    // Check if CSV file exists
    if (!fs.existsSync(csvFilePath)) {
      logger.error(`CSV file not found at: ${csvFilePath}`);
      logger.info('Please download the CSV file and place it in the data/ directory');
      process.exit(1);
    }

    const properties: any[] = [];
    let rowCount = 0;

    // Read and parse CSV
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        rowCount++;
        
        try {
          // Map CSV columns to property schema
          // Adjust these mappings based on the actual CSV structure
          const property = {
            title: row.title || row.name || `Property ${rowCount}`,
            description: row.description || row.details || 'No description available',
            price: parseFloat(row.price || row.rent || '0'),
            propertyType: mapPropertyType(row.type || row.property_type || 'other'),
            bedrooms: parseInt(row.bedrooms || row.beds || '0'),
            bathrooms: parseInt(row.bathrooms || row.baths || '0'),
            area: parseFloat(row.area || row.sqft || row.square_feet || '0'),
            location: {
              address: row.address || row.street || 'Address not provided',
              city: row.city || 'Unknown City',
              state: row.state || row.province || 'Unknown State',
              zipCode: row.zipcode || row.zip || row.postal_code || '00000',
              coordinates: {
                latitude: parseFloat(row.latitude || row.lat || '0'),
                longitude: parseFloat(row.longitude || row.lng || '0'),
              },
            },
            amenities: parseAmenities(row.amenities || row.features || ''),
            images: parseImages(row.images || row.photos || ''),
            isAvailable: parseBoolean(row.available || row.is_available || 'true'),
            createdBy: defaultUser._id,
          };

          properties.push(property);
        } catch (error) {
          logger.error(`Error parsing row ${rowCount}:`, error);
        }
      })
      .on('end', async () => {
        try {
          logger.info(`Parsed ${properties.length} properties from CSV`);

          // Clear existing properties (optional)
          const clearExisting = process.argv.includes('--clear');
          if (clearExisting) {
            await Property.deleteMany({});
            logger.info('Cleared existing properties');
          }

          // Insert properties in batches
          const batchSize = 100;
          let insertedCount = 0;

          for (let i = 0; i < properties.length; i += batchSize) {
            const batch = properties.slice(i, i + batchSize);
            try {
              await Property.insertMany(batch, { ordered: false });
              insertedCount += batch.length;
              logger.info(`Inserted batch ${Math.floor(i / batchSize) + 1}, total: ${insertedCount}`);
            } catch (error) {
              logger.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
            }
          }

          logger.info(`Successfully imported ${insertedCount} properties`);
          process.exit(0);
        } catch (error) {
          logger.error('Error importing properties:', error);
          process.exit(1);
        }
      })
      .on('error', (error) => {
        logger.error('Error reading CSV file:', error);
        process.exit(1);
      });

  } catch (error) {
    logger.error('Import failed:', error);
    process.exit(1);
  }
};

// Helper functions
const mapPropertyType = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    'apartment': 'apartment',
    'apt': 'apartment',
    'house': 'house',
    'home': 'house',
    'condo': 'condo',
    'condominium': 'condo',
    'townhouse': 'townhouse',
    'townhome': 'townhouse',
    'villa': 'villa',
    'studio': 'studio',
  };

  const normalizedType = type.toLowerCase().trim();
  return typeMap[normalizedType] || 'other';
};

const parseAmenities = (amenitiesStr: string): string[] => {
  if (!amenitiesStr) return [];
  
  return amenitiesStr
    .split(/[,;|]/)
    .map(amenity => amenity.trim())
    .filter(amenity => amenity.length > 0);
};

const parseImages = (imagesStr: string): string[] => {
  if (!imagesStr) return [];
  
  return imagesStr
    .split(/[,;|]/)
    .map(image => image.trim())
    .filter(image => image.length > 0 && (image.startsWith('http') || image.startsWith('/')));
};

const parseBoolean = (value: string): boolean => {
  const normalizedValue = value.toLowerCase().trim();
  return ['true', '1', 'yes', 'y', 'available'].includes(normalizedValue);
};

// Run the import
if (require.main === module) {
  importCSV();
}

export { importCSV };