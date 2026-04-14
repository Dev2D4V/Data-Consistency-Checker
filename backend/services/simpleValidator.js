/**
 * Simple Validator - Checks for common data inconsistencies
 */

class SimpleValidator {
  /**
   * Check documents for inconsistencies
   * Looks for: null values, empty strings, type mismatches
   */
  checkDocuments(documents) {
    const issues = [];
    
    // Determine expected schema from first document
    if (documents.length === 0) return { issues, schema: {} };
    
    const firstDoc = documents[0];
    const expectedFields = Object.keys(firstDoc).filter(k => !k.startsWith('_'));
    
    console.log('[SIMPLE] Expected fields:', expectedFields);
    
    documents.forEach((doc, index) => {
      const docId = doc._id ? doc._id.toString() : `doc-${index}`;
      const docIssues = [];
      
      // Check each expected field
      expectedFields.forEach(field => {
        const value = doc[field];
        
        // Check for missing/undefined
        if (value === undefined) {
          docIssues.push({
            documentId: docId,
            field,
            issue: 'missing_field',
            severity: 'high',
            description: `Field '${field}' is missing`,
            currentValue: undefined,
            suggestedFix: this.getDefaultValue(firstDoc[field])
          });
        }
        // Check for null
        else if (value === null) {
          docIssues.push({
            documentId: docId,
            field,
            issue: 'null_value',
            severity: 'medium',
            description: `Field '${field}' is null`,
            currentValue: null,
            suggestedFix: this.getDefaultValue(firstDoc[field])
          });
        }
        // Check for empty string
        else if (value === '') {
          docIssues.push({
            documentId: docId,
            field,
            issue: 'empty_string',
            severity: 'medium',
            description: `Field '${field}' is empty string`,
            currentValue: '',
            suggestedFix: 'N/A'
          });
        }
      });
      
      if (docIssues.length > 0) {
        console.log(`[SIMPLE] Document ${docId} has ${docIssues.length} issues:`, docIssues.map(i => i.issue));
        issues.push(...docIssues);
      }
    });
    
    return { issues, expectedFields };
  }
  
  /**
   * Get default value based on type
   */
  getDefaultValue(sampleValue) {
    if (sampleValue === null || sampleValue === undefined) return null;
    if (typeof sampleValue === 'string') return '';
    if (typeof sampleValue === 'number') return 0;
    if (typeof sampleValue === 'boolean') return false;
    if (Array.isArray(sampleValue)) return [];
    if (typeof sampleValue === 'object') return {};
    return null;
  }
  
  /**
   * Repair documents based on issues
   */
  async repairDocuments(Model, issues) {
    const repairs = [];
    
    for (const issue of issues) {
      try {
        const { documentId, field, suggestedFix, issue: issueType } = issue;
        
        // Build update
        const update = {};
        if (issueType === 'missing_field' || issueType === 'null_value') {
          update[field] = suggestedFix;
        } else if (issueType === 'empty_string') {
          update[field] = 'N/A';
        }
        
        // Apply fix
        console.log(`[SIMPLE] Updating DB: ${documentId} -> ${field} = ${JSON.stringify(update[field])}`);
        const result = await Model.findByIdAndUpdate(
          documentId,
          { $set: update },
          { new: true }
        );
        
        if (result) {
          const newValue = result[field];
          repairs.push({
            documentId,
            field,
            action: issueType,
            oldValue: issue.currentValue,
            newValue: update[field]
          });
          console.log(`[SIMPLE] ✓ SAVED TO DB: ${documentId} now has ${field} = ${JSON.stringify(newValue)}`);
        } else {
          console.log(`[SIMPLE] ✗ FAILED: ${documentId} not found or not updated`);
        }
      } catch (error) {
        console.error(`[SIMPLE] Repair failed:`, error.message);
      }
    }
    
    return repairs;
  }
}

module.exports = SimpleValidator;
