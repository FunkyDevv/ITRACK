// One-time migration script to add phone numbers to existing interns
import { migrateUsersToIncludePhone } from './migration';

export const runPhoneMigration = async () => {
  console.log('🚀 Starting phone number migration for existing interns...');
  
  try {
    const result = await migrateUsersToIncludePhone();
    
    if (result.success) {
      console.log(`✅ Migration completed successfully! Updated ${result.updatedCount} records.`);
      return `Migration successful: Updated ${result.updatedCount} documents with phone number fields.`;
    } else {
      console.error('❌ Migration failed:', result.error);
      return `Migration failed: ${result.error}`;
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    return `Migration error: ${error}`;
  }
};

// Auto-run migration when this module is imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  console.log('📱 Phone migration module loaded');
}