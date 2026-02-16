const { validateDocument, repairDocument } = require('../validationRules');

class ConsistencyChecker {
  constructor() {
    this.isRunning = false;
    this.currentCheck = null;
  }

  /**
   * Performs a consistency check on a specified collection
   * @param {string} collectionName - Name of the collection to check
   * @param {Object} Model - Mongoose model for the collection
   * @returns {Object} Detailed report of the consistency check
   */
  async checkCollection(collectionName, Model) {
    if (this.isRunning) {
      throw new Error('Consistency check already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    const report = {
      timestamp: new Date(),
      collection: collectionName,
      totalDocuments: 0,
      inconsistenciesFound: 0,
      repairsApplied: 0,
      documentsDeleted: 0,
      errors: [],
      details: [],
      duration: 0
    };

    try {
      console.log(`Starting consistency check for collection: ${collectionName}`);
      
      // Get all documents in the collection
      const documents = await Model.find({}).lean();
      report.totalDocuments = documents.length;
      
      console.log(`Found ${documents.length} documents to check`);

      for (const doc of documents) {
        try {
          // Validate the document
          const issues = validateDocument(doc, collectionName);
          
          if (issues.length > 0) {
            report.inconsistenciesFound += issues.length;
            
            // Attempt to repair the document
            const repairResult = repairDocument(doc, issues, collectionName);
            
            if (repairResult.shouldDelete) {
              // Delete the document if it's irreparable
              await Model.findByIdAndDelete(doc._id);
              report.documentsDeleted += 1;
              report.details.push({
                documentId: doc._id.toString(),
                issue: 'irreparable_document',
                action: 'deleted',
                details: issues.map(i => i.description).join('; ')
              });
              console.log(`Deleted irreparable document: ${doc._id}`);
            } else if (repairResult.repairs.length > 0) {
              // Update the document with repairs
              await Model.findByIdAndUpdate(doc._id, repairResult.document);
              report.repairsApplied += repairResult.repairs.length;
              
              repairResult.repairs.forEach(repair => {
                report.details.push({
                  documentId: doc._id.toString(),
                  issue: `${repair.field}: ${repair.action}`,
                  action: 'repaired',
                  oldValue: repair.oldValue,
                  newValue: repair.newValue
                });
              });
              
              console.log(`Repaired document: ${doc._id} with ${repairResult.repairs.length} fixes`);
            } else {
              // Document has issues but no repairs were applied
              report.details.push({
                documentId: doc._id.toString(),
                issue: 'unrepaired_issues',
                action: 'none',
                details: issues.map(i => i.description).join('; ')
              });
            }
          }
        } catch (docError) {
          const errorMsg = `Error processing document ${doc._id}: ${docError.message}`;
          report.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // Update eventual consistency status
      await this.updateConsistencyStatus(collectionName, report);

    } catch (error) {
      const errorMsg = `Consistency check failed: ${error.message}`;
      report.errors.push(errorMsg);
      console.error(errorMsg);
    } finally {
      report.duration = Date.now() - startTime;
      this.isRunning = false;
      this.currentCheck = null;
      
      console.log(`Consistency check completed for ${collectionName}:`);
      console.log(`- Total documents: ${report.totalDocuments}`);
      console.log(`- Inconsistencies found: ${report.inconsistenciesFound}`);
      console.log(`- Repairs applied: ${report.repairsApplied}`);
      console.log(`- Documents deleted: ${report.documentsDeleted}`);
      console.log(`- Duration: ${report.duration}ms`);
    }

    return report;
  }

  /**
   * Updates the eventual consistency status in the database
   * @param {string} collectionName - Name of the collection
   * @param {Object} report - The consistency check report
   */
  async updateConsistencyStatus(collectionName, report) {
    try {
      // For simplicity, we'll store status in a separate collection
      // In a real system, this would check replica set status
      const Status = require('../models/Status');
      
      const isConsistent = report.inconsistenciesFound === 0 || 
                          (report.inconsistenciesFound === report.repairsApplied + report.documentsDeleted);
      
      await Status.findOneAndUpdate(
        { collection: collectionName },
        {
          collection: collectionName,
          isConsistent,
          lastCheckTime: new Date(),
          lastConsistentTime: isConsistent ? new Date() : undefined,
          allReplicasConsistent: isConsistent, // Simulated
          lastReportId: report._id
        },
        { upsert: true, new: true }
      );
      
      console.log(`Updated consistency status for ${collectionName}: ${isConsistent ? 'Consistent' : 'Inconsistent'}`);
    } catch (error) {
      console.error(`Failed to update consistency status: ${error.message}`);
    }
  }

  /**
   * Gets the current consistency status for a collection
   * @param {string} collectionName - Name of the collection
   * @returns {Object} Current consistency status
   */
  async getConsistencyStatus(collectionName) {
    try {
      const Status = require('../models/Status');
      const status = await Status.findOne({ collection: collectionName });
      
      if (!status) {
        return {
          collection: collectionName,
          isConsistent: false,
          lastCheckTime: null,
          lastConsistentTime: null,
          allReplicasConsistent: false,
          status: 'never_checked'
        };
      }
      
      return {
        collection: status.collection,
        isConsistent: status.isConsistent,
        lastCheckTime: status.lastCheckTime,
        lastConsistentTime: status.lastConsistentTime,
        allReplicasConsistent: status.allReplicasConsistent,
        status: status.isConsistent ? 'consistent' : 'inconsistent'
      };
    } catch (error) {
      console.error(`Failed to get consistency status: ${error.message}`);
      return {
        collection: collectionName,
        isConsistent: false,
        lastCheckTime: null,
        lastConsistentTime: null,
        allReplicasConsistent: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Checks if a consistency check is currently running
   * @returns {boolean} True if a check is in progress
   */
  isActive() {
    return this.isRunning;
  }

  /**
   * Gets information about the currently running check
   * @returns {Object|null} Current check information or null
   */
  getCurrentCheck() {
    return this.currentCheck;
  }
}

module.exports = ConsistencyChecker;
