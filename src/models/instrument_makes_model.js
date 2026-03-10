import { getPool } from '../config/database.js';
import logger from '../config/logger.js';
import { buildDeliveryUrl } from '../services/cloudflareImages.js';

const getInstrumentMakes = async () => {
  try {
    const query = 'select * from instrument_makes';
    const pool = getPool();
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching instrument makes', { error: error.message, stack: error.stack });
    throw error;
  }
};

const createInstrumentAds = async (adData) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // create an instrument ad with optional images
    const {
      user_id, make_id, name, description, price, condition, imageIds,
    } = adData;

    await client.query('BEGIN');

    // Insert the ad
    const result = await client.query(
      'INSERT INTO used_instrument_ads (user_id, make_id, name, description, price, condition) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, make_id, name, description, price, condition],
    );

    const createdAd = result.rows[0];

    // Insert images if provided
    let images = [];
    if (imageIds && imageIds.length > 0) {
      // Validate max images
      if (imageIds.length > 5) {
        throw new Error('Maximum 5 images allowed per ad');
      }

      // Insert images using the ad_images_model
      // Note: We need to use the pool directly here since we're in a transaction
      const imageValues = imageIds.map((imageId, index) => `($1, $${index + 2}, ${index})`).join(', ');
      const imageParams = [createdAd.id, ...imageIds];

      const imageResult = await client.query(
        `INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order) VALUES ${imageValues} RETURNING *`,
        imageParams,
      );
      images = imageResult.rows;
    }

    await client.query('COMMIT');

    // Return ad with images
    return {
      ...createdAd,
      images: images.map((img) => ({
        ...img,
        urls: {
          thumbnail: buildDeliveryUrl(img.cloudflare_image_id, 'thumbnail'),
          card: buildDeliveryUrl(img.cloudflare_image_id, 'card'),
          full: buildDeliveryUrl(img.cloudflare_image_id, 'full'),
        },
      })),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating instrument ad', { error: error.message, stack: error.stack, adData });
    throw error;
  } finally {
    client.release();
  }
};

const getInstrumentAds = async () => {
  try {
    // get all instrument ads with images
    const pool = getPool();

    // Get all ads
    const adsResult = await pool.query('SELECT * FROM used_instrument_ads ORDER BY created_at DESC');
    const ads = adsResult.rows;

    if (ads.length === 0) {
      return [];
    }

    // Get all images for these ads in one query
    const adIds = ads.map((ad) => ad.id);
    const imagesResult = await pool.query(
      'SELECT * FROM ad_images WHERE ad_id = ANY($1) ORDER BY display_order ASC',
      [adIds],
    );

    // Group images by ad_id
    const imagesByAdId = {};
    imagesResult.rows.forEach((img) => {
      if (!imagesByAdId[img.ad_id]) {
        imagesByAdId[img.ad_id] = [];
      }
      imagesByAdId[img.ad_id].push({
        ...img,
        urls: {
          thumbnail: buildDeliveryUrl(img.cloudflare_image_id, 'thumbnail'),
          card: buildDeliveryUrl(img.cloudflare_image_id, 'card'),
          full: buildDeliveryUrl(img.cloudflare_image_id, 'full'),
        },
      });
    });

    // Attach images to each ad
    return ads.map((ad) => ({
      ...ad,
      images: imagesByAdId[ad.id] || [],
    }));
  } catch (error) {
    logger.error('Error fetching instrument ads', { error: error.message, stack: error.stack });
    throw error;
  }
};

const getInstrumentAdsbyUser = async (userId) => {
  try {
    // get all instrument ads for the user with images
    const pool = getPool();

    // Get user's ads
    const adsResult = await pool.query(
      'SELECT * FROM used_instrument_ads WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    const ads = adsResult.rows;

    if (ads.length === 0) {
      return [];
    }

    // Get all images for these ads in one query
    const adIds = ads.map((ad) => ad.id);
    const imagesResult = await pool.query(
      'SELECT * FROM ad_images WHERE ad_id = ANY($1) ORDER BY display_order ASC',
      [adIds],
    );

    // Group images by ad_id
    const imagesByAdId = {};
    imagesResult.rows.forEach((img) => {
      if (!imagesByAdId[img.ad_id]) {
        imagesByAdId[img.ad_id] = [];
      }
      imagesByAdId[img.ad_id].push({
        ...img,
        urls: {
          thumbnail: buildDeliveryUrl(img.cloudflare_image_id, 'thumbnail'),
          card: buildDeliveryUrl(img.cloudflare_image_id, 'card'),
          full: buildDeliveryUrl(img.cloudflare_image_id, 'full'),
        },
      });
    });

    // Attach images to each ad
    return ads.map((ad) => ({
      ...ad,
      images: imagesByAdId[ad.id] || [],
    }));
  } catch (error) {
    logger.error('Error fetching instrument ads by user', { error: error.message, stack: error.stack, userId });
    throw error;
  }
};

const updateInstrumentAds = async (adId, updateData) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // update an instrument ad with optional images
    const { description, price, condition, imageIds } = updateData;

    await client.query('BEGIN');

    // Update the ad
    const result = await client.query(
      'UPDATE used_instrument_ads SET description = $2, price = $3, condition = $4 WHERE id = $1 RETURNING *',
      [adId, description, price, condition],
    );

    const updatedAd = result.rows[0];
    if (!updatedAd) {
      await client.query('ROLLBACK');
      return null;
    }

    // Update images if imageIds is provided (even if empty array - means remove all)
    let images = [];
    if (imageIds !== undefined) {
      // Validate max images
      if (imageIds.length > 5) {
        throw new Error('Maximum 5 images allowed per ad');
      }

      // Get existing images
      const existingResult = await client.query(
        'SELECT cloudflare_image_id FROM ad_images WHERE ad_id = $1',
        [adId],
      );
      const existingIds = existingResult.rows.map((r) => r.cloudflare_image_id);

      // Determine what to add and remove
      const toRemove = existingIds.filter((id) => !imageIds.includes(id));
      const toAdd = imageIds.filter((id) => !existingIds.includes(id));

      // Remove images no longer in the list
      if (toRemove.length > 0) {
        await client.query(
          'DELETE FROM ad_images WHERE ad_id = $1 AND cloudflare_image_id = ANY($2)',
          [adId, toRemove],
        );
      }

      // Add new images
      if (toAdd.length > 0) {
        // Get the current max display_order
        const maxOrderResult = await client.query(
          'SELECT COALESCE(MAX(display_order), -1) as max_order FROM ad_images WHERE ad_id = $1',
          [adId],
        );
        let nextOrder = maxOrderResult.rows[0].max_order + 1;

        const addValues = toAdd.map((imageId, index) => `($1, $${index + 2}, ${nextOrder + index})`).join(', ');
        const addParams = [adId, ...toAdd];

        await client.query(
          `INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order) VALUES ${addValues}`,
          addParams,
        );
      }

      // Fetch updated images
      const imagesResult = await client.query(
        'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
        [adId],
      );
      images = imagesResult.rows;
    } else {
      // If imageIds not provided, just fetch existing images
      const imagesResult = await client.query(
        'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
        [adId],
      );
      images = imagesResult.rows;
    }

    await client.query('COMMIT');

    // Return ad with images
    return {
      ...updatedAd,
      images: images.map((img) => ({
        ...img,
        urls: {
          thumbnail: buildDeliveryUrl(img.cloudflare_image_id, 'thumbnail'),
          card: buildDeliveryUrl(img.cloudflare_image_id, 'card'),
          full: buildDeliveryUrl(img.cloudflare_image_id, 'full'),
        },
      })),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating instrument ad', { error: error.message, stack: error.stack, adId, updateData });
    throw error;
  } finally {
    client.release();
  }
};

const deleteInstrumentAds = async (adId) => {
  try {
    // delete an instrument ad
    const pool = getPool();
    const result = await pool.query(
      'delete from used_instrument_ads where id = $1 returning *',
      [adId],
    );
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting instrument ad', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

export {
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
};
