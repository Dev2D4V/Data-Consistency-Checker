/**
 * Validation Rules for Data Consistency Checker
 * Version: 1.0.0
 * 
 * This file contains validation rules for checking and repairing data inconsistencies
 * in MongoDB collections. Rules are version-controlled via Git.
 */

const validationRules = {
  users: {
    // Required fields that must exist
    requiredFields: ['name', 'email'],
    
    // Field type validation
    fieldTypes: {
      name: 'string',
      email: 'string',
      age: 'number',
      role: 'string',
      isActive: 'boolean'
    },
    
    // Allowed values for specific fields
    allowedValues: {
      role: ['user', 'admin', 'moderator']
    },
    
    // Field value ranges
    valueRanges: {
      age: { min: 0, max: 150 }
    },
    
    // Default values for missing fields
    defaultValues: {
      email: 'missing@example.com',
      age: 0,
      role: 'user',
      isActive: true
    },
    
    // Custom validation functions
    customValidations: {
      email: (value) => {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      }
    }
  }
};

/**
 * Validates a single document against the rules
 * @param {Object} document - The document to validate
 * @param {string} collection - The collection name
 * @returns {Array} Array of validation issues found
 */
function validateDocument(document, collection = 'users') {
  const issues = [];
  const rules = validationRules[collection];
  
  if (!rules) {
    return [`No validation rules found for collection: ${collection}`];
  }
  
  // Check required fields
  rules.requiredFields.forEach(field => {
    if (document[field] === undefined || document[field] === null || document[field] === '') {
      issues.push({
        field,
        issue: 'missing_required_field',
        severity: 'high',
        description: `Required field '${field}' is missing or empty`
      });
    }
  });
  
  // Check field types
  Object.keys(rules.fieldTypes).forEach(field => {
    if (document[field] !== undefined) {
      const expectedType = rules.fieldTypes[field];
      const actualType = typeof document[field];
      
      // Special case for number validation (strings that can be parsed as numbers)
      if (expectedType === 'number' && actualType === 'string') {
        const parsed = parseInt(document[field], 10);
        if (isNaN(parsed)) {
          issues.push({
            field,
            issue: 'invalid_type',
            severity: 'medium',
            description: `Field '${field}' should be ${expectedType} but is ${actualType} and cannot be parsed`
          });
        }
      } else if (expectedType !== actualType) {
        issues.push({
          field,
          issue: 'invalid_type',
          severity: 'medium',
          description: `Field '${field}' should be ${expectedType} but is ${actualType}`
        });
      }
    }
  });
  
  // Check allowed values
  Object.keys(rules.allowedValues).forEach(field => {
    if (document[field] !== undefined) {
      const allowed = rules.allowedValues[field];
      if (!allowed.includes(document[field])) {
        issues.push({
          field,
          issue: 'invalid_value',
          severity: 'high',
          description: `Field '${field}' has invalid value '${document[field]}'. Allowed: ${allowed.join(', ')}`
        });
      }
    }
  });
  
  // Check value ranges
  Object.keys(rules.valueRanges).forEach(field => {
    if (document[field] !== undefined) {
      const range = rules.valueRanges[field];
      const value = typeof document[field] === 'string' ? parseInt(document[field], 10) : document[field];
      
      if (value < range.min || value > range.max) {
        issues.push({
          field,
          issue: 'out_of_range',
          severity: 'medium',
          description: `Field '${field}' value ${value} is out of range [${range.min}, ${range.max}]`
        });
      }
    }
  });
  
  // Custom validations
  Object.keys(rules.customValidations).forEach(field => {
    if (document[field] !== undefined) {
      const isValid = rules.customValidations[field](document[field]);
      if (!isValid) {
        issues.push({
          field,
          issue: 'custom_validation_failed',
          severity: 'medium',
          description: `Field '${field}' failed custom validation`
        });
      }
    }
  });
  
  return issues;
}

/**
 * Attempts to repair a document based on validation issues
 * @param {Object} document - The document to repair
 * @param {Array} issues - Array of validation issues
 * @param {string} collection - The collection name
 * @returns {Object} Object containing repaired document and repair actions
 */
function repairDocument(document, issues, collection = 'users') {
  const rules = validationRules[collection];
  const repairedDoc = { ...document };
  const repairs = [];
  
  issues.forEach(issue => {
    const { field, issue: issueType } = issue;
    
    switch (issueType) {
      case 'missing_required_field':
        if (rules.defaultValues[field]) {
          repairedDoc[field] = rules.defaultValues[field];
          repairs.push({
            field,
            action: 'set_default',
            oldValue: undefined,
            newValue: rules.defaultValues[field]
          });
        }
        break;
        
      case 'invalid_type':
        if (field === 'age' && typeof repairedDoc[field] === 'string') {
          const parsed = parseInt(repairedDoc[field], 10);
          if (!isNaN(parsed)) {
            repairs.push({
              field,
              action: 'type_conversion',
              oldValue: repairedDoc[field],
              newValue: parsed
            });
            repairedDoc[field] = parsed;
          }
        }
        break;
        
      case 'invalid_value':
        if (field === 'role') {
          // Set to default role if invalid
          repairedDoc[field] = rules.defaultValues[field];
          repairs.push({
            field,
            action: 'set_default',
            oldValue: document[field],
            newValue: rules.defaultValues[field]
          });
        }
        break;
        
      case 'out_of_range':
        if (field === 'age') {
          const range = rules.valueRanges[field];
          const value = typeof repairedDoc[field] === 'string' ? parseInt(repairedDoc[field], 10) : repairedDoc[field];
          
          if (value < range.min) {
            repairedDoc[field] = range.min;
            repairs.push({
              field,
              action: 'clamp_to_min',
              oldValue: value,
              newValue: range.min
            });
          } else if (value > range.max) {
            repairedDoc[field] = range.max;
            repairs.push({
              field,
              action: 'clamp_to_max',
              oldValue: value,
              newValue: range.max
            });
          }
        }
        break;
    }
  });
  
  return {
    document: repairedDoc,
    repairs,
    shouldDelete: issues.some(issue => 
      issue.severity === 'high' && 
      issue.issue === 'invalid_value' && 
      !rules.defaultValues[issue.field]
    )
  };
}

module.exports = {
  validationRules,
  validateDocument,
  repairDocument
};
