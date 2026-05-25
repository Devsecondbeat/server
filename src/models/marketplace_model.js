import { getPool } from '../config/database.js';
import logger from '../config/logger.js';
import { buildDeliveryUrl, validateImageIds } from '../services/cloudflareImages.js';

const MAX_IMAGES_PER_AD = 5;

export const INVALID_IMAGE_IDS = 'INVALID_IMAGE_IDS';

const assertValidImageIds = async (imageIds) => {
  if (!imageIds || imageIds.length === 0) {
    return;
  }

  const result = await validateImageIds(imageIds);
  if (!result.valid) {
    const error = new Error('One or more image IDs are invalid or not uploaded to Cloudflare');
    error.code = INVALID_IMAGE_IDS;
    error.invalidIds = result.invalidIds;
    throw error;
  }
};

const addDeliveryUrls = (image) => ({
  ...image,
  urls: {
    thumbnail: buildDeliveryUrl(image.cloudflare_image_id, 'thumbnail'),
    card: buildDeliveryUrl(image.cloudflare_image_id, 'card'),
    full: buildDeliveryUrl(image.cloudflare_image_id, 'full'),
  },
});

const groupImagesByAdId = (images) => images.reduce((groupedImages, image) => {
  const adImages = groupedImages[image.ad_id] || [];
  return {
    ...groupedImages,
    [image.ad_id]: [...adImages, addDeliveryUrls(image)],
  };
}, {});

const getImagesForAds = async (pool, ads) => {
  if (ads.length === 0) {
    return {};
  }

  const adIds = ads.map((ad) => ad.id);
  const imagesResult = await pool.query(
    'SELECT * FROM ad_images WHERE ad_id = ANY($1) ORDER BY display_order ASC',
    [adIds],
  );

  return groupImagesByAdId(imagesResult.rows);
};

const getAdImagesWithClient = async (client, adId) => {
  const result = await client.query(
    'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
    [adId],
  );
  return result.rows;
};

const insertAdImages = async (client, adId, imageIds) => {
  if (!imageIds || imageIds.length === 0) {
    return [];
  }

  if (imageIds.length > MAX_IMAGES_PER_AD) {
    throw new Error(`Maximum ${MAX_IMAGES_PER_AD} images allowed per ad`);
  }

  const values = imageIds.map((imageId, index) => `($1, $${index + 2}, ${index})`).join(', ');
  const params = [adId, ...imageIds];

  const result = await client.query(
    `INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order)
     VALUES ${values}
     RETURNING *`,
    params,
  );

  return result.rows;
};

const syncAdImages = async (client, adId, imageIds) => {
  if (imageIds.length > MAX_IMAGES_PER_AD) {
    throw new Error(`Maximum ${MAX_IMAGES_PER_AD} images allowed per ad`);
  }

  const existingResult = await client.query(
    'SELECT cloudflare_image_id FROM ad_images WHERE ad_id = $1',
    [adId],
  );
  const existingIds = existingResult.rows.map((row) => row.cloudflare_image_id);
  const toRemove = existingIds.filter((id) => !imageIds.includes(id));
  const toAdd = imageIds.filter((id) => !existingIds.includes(id));

  if (toRemove.length > 0) {
    await client.query(
      'DELETE FROM ad_images WHERE ad_id = $1 AND cloudflare_image_id = ANY($2)',
      [adId, toRemove],
    );
  }

  if (toAdd.length > 0) {
    const maxOrderResult = await client.query(
      'SELECT COALESCE(MAX(display_order), -1) as max_order FROM ad_images WHERE ad_id = $1',
      [adId],
    );
    const nextOrder = maxOrderResult.rows[0].max_order + 1;
    const values = toAdd
      .map((imageId, index) => `($1, $${index + 2}, ${nextOrder + index})`)
      .join(', ');
    const params = [adId, ...toAdd];

    await client.query(
      `INSERT INTO ad_images (ad_id, cloudflare_image_id, display_order) VALUES ${values}`,
      params,
    );
  }

  const imagesResult = await client.query(
    'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
    [adId],
  );

  return imagesResult.rows;
};

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

const VALID_INSTRUMENT_TYPES = ['guitar', 'drums', 'piano', 'accessories'];

const createInstrumentAds = async (adData) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const {
      user_id: userId,
      make_id: makeId,
      name,
      description,
      price,
      condition,
      instrument_type: instrumentType,
      imageIds,
    } = adData;

    if (instrumentType && !VALID_INSTRUMENT_TYPES.includes(instrumentType)) {
      throw new Error(
        `instrument_type must be one of: ${VALID_INSTRUMENT_TYPES.join(', ')}`,
      );
    }

    await assertValidImageIds(imageIds);

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO used_instrument_ads (user_id, make_id, name, description, price, condition, instrument_type)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, makeId, name, description, price, condition, instrumentType ?? null],
    );

    const createdAd = result.rows[0];
    const images = await insertAdImages(client, createdAd.id, imageIds);

    await client.query('COMMIT');

    return {
      ...createdAd,
      images: images.map(addDeliveryUrls),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating instrument ad', { error: error.message, stack: error.stack, adData });
    throw error;
  } finally {
    client.release();
  }
};

const getInstrumentAds = async (filters = {}) => {
  try {
    const { type, make_id: makeId, condition } = filters;
    const pool = getPool();
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (type) {
      if (!VALID_INSTRUMENT_TYPES.includes(type)) {
        throw new Error(
          `type must be one of: ${VALID_INSTRUMENT_TYPES.join(', ')}`,
        );
      }
      conditions.push(`instrument_type = $${paramIndex}`);
      params.push(type);
      paramIndex += 1;
    }

    if (makeId !== undefined && makeId !== null && makeId !== '') {
      conditions.push(`make_id = $${paramIndex}`);
      params.push(Number(makeId));
      paramIndex += 1;
    }

    if (condition) {
      conditions.push(`LOWER(condition) = LOWER($${paramIndex})`);
      params.push(condition);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM used_instrument_ads ${whereClause} ORDER BY created_at DESC`;
    const adsResult = await pool.query(query, params);
    const ads = adsResult.rows;
    const imagesByAdId = await getImagesForAds(pool, ads);

    return ads.map((ad) => ({
      ...ad,
      images: imagesByAdId[ad.id] || [],
    }));
  } catch (error) {
    logger.error('Error fetching instrument ads', { error: error.message, stack: error.stack, filters });
    throw error;
  }
};

const getInstrumentAdsbyUser = async (userId) => {
  try {
    const pool = getPool();
    const adsResult = await pool.query(
      'SELECT * FROM used_instrument_ads WHERE user_id = $1 ORDER BY created_at DESC',
      [userId],
    );
    const ads = adsResult.rows;
    const imagesByAdId = await getImagesForAds(pool, ads);

    return ads.map((ad) => ({
      ...ad,
      images: imagesByAdId[ad.id] || [],
    }));
  } catch (error) {
    logger.error('Error fetching instrument ads by user', {
      error: error.message,
      stack: error.stack,
      userId,
    });
    throw error;
  }
};

const updateInstrumentAds = async (adId, updateData) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const {
      description,
      price,
      condition,
      imageIds,
    } = updateData;

    if (imageIds !== undefined) {
      await assertValidImageIds(imageIds);
    }

    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE used_instrument_ads SET description = $2, price = $3, condition = $4 WHERE id = $1 RETURNING *',
      [adId, description, price, condition],
    );

    const updatedAd = result.rows[0];
    if (!updatedAd) {
      await client.query('ROLLBACK');
      return null;
    }

    const images = imageIds === undefined
      ? await getAdImagesWithClient(client, adId)
      : await syncAdImages(client, adId, imageIds);

    await client.query('COMMIT');

    return {
      ...updatedAd,
      images: images.map(addDeliveryUrls),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating instrument ad', {
      error: error.message,
      stack: error.stack,
      adId,
      updateData,
    });
    throw error;
  } finally {
    client.release();
  }
};

const deleteInstrumentAds = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query('delete from used_instrument_ads where id = $1 returning *', [
      adId,
    ]);
    return result.rows[0];
  } catch (error) {
    logger.error('Error deleting instrument ad', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

const getAdImages = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM ad_images WHERE ad_id = $1 ORDER BY display_order ASC',
      [adId],
    );
    return result.rows;
  } catch (error) {
    logger.error('Error fetching ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

const getAdImageCount = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT COUNT(*) as count FROM ad_images WHERE ad_id = $1', [
      adId,
    ]);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('Error counting ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

const deleteAdImage = async (adId, cloudflareImageId) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM ad_images WHERE ad_id = $1 AND cloudflare_image_id = $2 RETURNING *',
      [adId, cloudflareImageId],
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error deleting ad image', {
      error: error.message,
      stack: error.stack,
      adId,
      cloudflareImageId,
    });
    throw error;
  }
};

const deleteAllAdImages = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query('DELETE FROM ad_images WHERE ad_id = $1 RETURNING *', [adId]);
    logger.info('All ad images deleted', { adId, count: result.rows.length });
    return result.rows;
  } catch (error) {
    logger.error('Error deleting all ad images', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

const updateAdImages = async (adId, imageIds) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await assertValidImageIds(imageIds);

    await client.query('BEGIN');
    const existingImages = await getAdImagesWithClient(client, adId);
    const updatedImages = await syncAdImages(client, adId, imageIds);
    await client.query('COMMIT');

    logger.info('Ad images updated', {
      adId,
      removed: existingImages.filter((image) => !imageIds.includes(image.cloudflare_image_id)).length,
      added: imageIds.filter(
        (imageId) => !existingImages.some((image) => image.cloudflare_image_id === imageId),
      ).length,
    });
    return {
      removed: existingImages.filter((image) => !imageIds.includes(image.cloudflare_image_id)),
      added: updatedImages.filter(
        (image) => !existingImages.some(
          (existingImage) => existingImage.cloudflare_image_id === image.cloudflare_image_id,
        ),
      ),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating ad images', {
      error: error.message,
      stack: error.stack,
      adId,
      imageIds,
    });
    throw error;
  } finally {
    client.release();
  }
};

const canAddImages = async (adId, newImageCount) => {
  const currentCount = await getAdImageCount(adId);
  return {
    allowed: currentCount + newImageCount <= MAX_IMAGES_PER_AD,
    current: currentCount,
    max: MAX_IMAGES_PER_AD,
  };
};

const getAdOwner = async (adId) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, user_id FROM used_instrument_ads WHERE id = $1', [
      adId,
    ]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error fetching ad owner', { error: error.message, stack: error.stack, adId });
    throw error;
  }
};

export {
  MAX_IMAGES_PER_AD,
  VALID_INSTRUMENT_TYPES,
  getInstrumentMakes,
  createInstrumentAds,
  getInstrumentAds,
  getInstrumentAdsbyUser,
  updateInstrumentAds,
  deleteInstrumentAds,
  getAdImages,
  getAdImageCount,
  deleteAdImage,
  deleteAllAdImages,
  updateAdImages,
  canAddImages,
  getAdOwner,
};
