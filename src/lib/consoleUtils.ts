// Manual fix for missing phone fields - run this in browser console
// Usage: await window.fixPhoneFields();

import { fixMissingPhoneFields } from './fixPhoneFields';

declare global {
  interface Window {
    fixPhoneFields: () => Promise<void>;
  }
}

export const setupPhoneFieldsFix = () => {
  if (typeof window !== 'undefined') {
    window.fixPhoneFields = async () => {
      console.log('🔧 Running manual phone fields fix...');
      
      const internsToFix = [
        'e8SKEmy09MhMOK3x6WK5VLZdBRl2', // james2@gmail.com
        'Nis2VzrIgeVa2Q4mHXf460WE35S2', // GAG@gmail.com
        'K1tdEltZCBTqDc7UBxq9Sd2kjqh1'  // lobot@gmail.com (new intern example)
      ];
      
      for (const uid of internsToFix) {
        const result = await fixMissingPhoneFields(uid);
        console.log(`Result for ${uid}:`, result);
      }
      
      console.log('✅ Manual phone fields fix completed!');
    };
    
    console.log('📱 Phone fields fix utility loaded. Run: await window.fixPhoneFields()');
  }
};