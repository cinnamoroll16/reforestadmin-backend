// routes/plantingrequests.js
const express = require('express');
const { db } = require('../config/firebaseAdmin');
const router = express.Router();

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date';
  
  // If it's a Firestore timestamp
  if (dateString.toDate) {
    const date = dateString.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  // If it's a date string like "2025-11-17"
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  return dateString;
};

// Helper function to format timestamp with time
const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Unknown date';
  
  if (timestamp.toDate) {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  return timestamp;
};

// Helper function to fetch user email from userRef
const fetchUserEmail = async (userRef) => {
  try {
    if (!userRef) return 'No email';
    
    // If userRef is a document path like "/users/v5Qs4KhsZ8Wapi72JcgE4VisE7N2"
    if (typeof userRef === 'string') {
      const userDoc = await db.doc(userRef).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData.email || 'No email';
      }
    }
    
    return 'No email';
  } catch (error) {
    console.error('Error fetching user email:', error);
    return 'Email unavailable';
  }
};

// Get planting requests - UPDATED with email fetching and date formatting
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('plantingrequests');
    
    if (status) {
      query = query.where('request_status', '==', status);
    }
    
    query = query.orderBy('created_at', 'desc');

    const snapshot = await query.get();
    const requests = [];
    
    // Process all requests and fetch emails in parallel
    const requestPromises = snapshot.docs.map(async (doc) => {
      const data = doc.data();
      
      // Fetch user email
      const userEmail = await fetchUserEmail(data.userRef);
      
      return {
        id: doc.id,
        requestId: data.requestId || doc.id,
        ...data,
        // Format dates
        preferred_date: formatDate(data.preferred_date),
        request_date: formatDate(data.request_date),
        submitted_at: formatDateTime(data.created_at),
        // Add formatted dates for display
        formatted_preferred_date: formatDate(data.preferred_date),
        formatted_created_at: formatDateTime(data.created_at),
        // Add user email
        userEmail: userEmail,
        // Ensure consistent field names
        request_status: data.request_status || 'pending',
        fullName: data.fullName || 'Unknown User',
        locationRef: data.location || data.location_address || 'Unknown Location'
      };
    });
    
    // Wait for all requests to be processed
    const requestsWithData = await Promise.all(requestPromises);
    requests.push(...requestsWithData);

    console.log(`✅ Found ${requests.length} planting requests`);
    res.json(requests);
  } catch (error) {
    console.error('Get planting requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update planting request status - SAME
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    
    const updateData = {
      request_status: status,
      updatedAt: new Date(),
    };
    
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
      updateData.reviewedAt = new Date();
    }
    
    await db.collection('plantingrequests').doc(id).update(updateData);

    console.log(`✅ Planting request ${id} updated to status: ${status}`);
    res.json({ message: `Planting request ${status}`, id });
  } catch (error) {
    console.error('Update planting request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single planting request by ID - UPDATED with email and date formatting
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('plantingrequests').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Planting request not found' });
    }

    const data = doc.data();
    
    // Fetch user email
    const userEmail = await fetchUserEmail(data.userRef);
    
    res.json({
      id: doc.id,
      requestId: data.requestId || doc.id,
      ...data,
      // Format dates for display
      preferred_date: formatDate(data.preferred_date),
      request_date: formatDate(data.request_date),
      submitted_at: formatDateTime(data.created_at),
      // Add formatted versions for frontend
      formatted_preferred_date: formatDate(data.preferred_date),
      formatted_created_at: formatDateTime(data.created_at),
      // Add user email
      userEmail: userEmail,
      request_status: data.request_status || 'pending',
      // Include all fields
      fullName: data.fullName,
      location: data.location,
      location_address: data.location_address,
      location_lat: data.location_lat,
      location_lng: data.location_lng,
      organization: data.organization,
      request_notes: data.request_notes,
      userRef: data.userRef,
      created_at: data.created_at
    });
  } catch (error) {
    console.error('Get planting request error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
