const express = require('express');
const router = express.Router();
const ConsistencyChecker = require('../services/consistencyChecker');
const ReportGenerator = require('../services/reportGenerator');
const User = require('../models/User');

// Initialize services
const consistencyChecker = new ConsistencyChecker();
const reportGenerator = new ReportGenerator();

/**
 * POST /api/check
 * Triggers a consistency check on a specified collection
 * Body: { collection: "users" }
 */
router.post('/check', async (req, res) => {
  try {
    const { collection = 'users' } = req.body;
    
    // Validate collection name
    const validCollections = ['users'];
    if (!validCollections.includes(collection)) {
      return res.status(400).json({
        success: false,
        error: `Invalid collection: ${collection}. Valid collections: ${validCollections.join(', ')}`
      });
    }
    
    // Check if a check is already running
    if (consistencyChecker.isActive()) {
      return res.status(409).json({
        success: false,
        error: 'Consistency check already in progress'
      });
    }
    
    console.log(`Starting consistency check for collection: ${collection}`);
    
    // Perform the consistency check
    const report = await consistencyChecker.checkCollection(collection, User);
    
    // Save the report to database
    const savedReport = await reportGenerator.saveReport(report);
    
    // Format the report for response
    const formattedReport = reportGenerator.formatReportForDisplay(savedReport);
    
    res.json({
      success: true,
      report: formattedReport,
      message: `Consistency check completed for ${collection}`
    });
    
  } catch (error) {
    console.error('Error in consistency check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/report/latest
 * Returns the most recent consistency check report
 * Query: ?collection=users (optional)
 */
router.get('/report/latest', async (req, res) => {
  try {
    const { collection } = req.query;
    
    const report = await reportGenerator.getLatestReport(collection);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'No reports found'
      });
    }
    
    const formattedReport = reportGenerator.formatReportForDisplay(report);
    
    res.json({
      success: true,
      report: formattedReport
    });
    
  } catch (error) {
    console.error('Error fetching latest report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/reports
 * Returns all reports (with optional collection filter)
 * Query: ?collection=users&limit=10
 */
router.get('/reports', async (req, res) => {
  try {
    const { collection, limit = 20 } = req.query;
    
    const reports = await reportGenerator.getAllReports(collection, parseInt(limit));
    const formattedReports = reports.map(report => 
      reportGenerator.formatReportForDisplay(report)
    );
    
    res.json({
      success: true,
      reports: formattedReports,
      count: formattedReports.length
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/status
 * Returns the current consistency status
 * Query: ?collection=users (optional)
 */
router.get('/status', async (req, res) => {
  try {
    const { collection = 'users' } = req.query;
    
    const status = await consistencyChecker.getConsistencyStatus(collection);
    const latestReport = await reportGenerator.getLatestReport(collection);
    
    res.json({
      success: true,
      status: {
        ...status,
        isActive: consistencyChecker.isActive(),
        latestReport: latestReport ? reportGenerator.formatReportForDisplay(latestReport) : null
      }
    });
    
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stats
 * Returns summary statistics
 * Query: ?collection=users (optional)
 */
router.get('/stats', async (req, res) => {
  try {
    const { collection } = req.query;
    
    const stats = await reportGenerator.generateSummaryStats(collection);
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    active: consistencyChecker.isActive()
  });
});

/**
 * POST /api/cleanup
 * Cleanup old reports
 * Body: { daysToKeep: 30, collection: "users" }
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30, collection } = req.body;
    
    const result = await reportGenerator.cleanupOldReports(daysToKeep, collection);
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} old reports`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
