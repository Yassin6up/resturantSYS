const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken, authorize } = require('../middleware/auth');

// Google Custom Search API endpoint for image search
router.get('/search', authenticateToken, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { query, num = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;

    console.log('Using Google API Key:', GOOGLE_API_KEY ? 'Configured' : 'Not Configured');
    console.log('Using Google CSE ID:', GOOGLE_CSE_ID ? 'Configured' : 'Not Configured');
    
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      return res.status(500).json({ 
        error: 'Google API credentials not configured. Please set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.' 
      });
    }

    // Call Google Custom Search API
    const searchUrl = 'https://www.googleapis.com/customsearch/v1';
    const params = {
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: query,
      searchType: 'image',
      num: Math.min(parseInt(num), 10), // Max 10 results per request
      safe: 'active', // Enable SafeSearch
      imgSize: 'medium', // Medium sized images
    };

    const response = await axios.get(searchUrl, { params });

    // Extract image data
    const images = response.data.items?.map(item => ({
      url: item.link,
      thumbnail: item.image.thumbnailLink,
      title: item.title,
      width: item.image.width,
      height: item.image.height,
      contextLink: item.image.contextLink,
    })) || [];

    res.json({
      success: true,
      query,
      images,
      total: images.length
    });

  } catch (error) {
    console.error('Google Image Search error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Free tier allows 100 searches per day.' 
      });
    }
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'Invalid API credentials or API not enabled. Please check your Google API settings.' 
      });
    }

    res.status(500).json({ 
      error: 'Failed to search images',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
