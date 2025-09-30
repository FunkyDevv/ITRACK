import emailjs from '@emailjs/browser';

// ✅ UPDATED WITH YOUR NEW EMAILJS CREDENTIALS
const EMAIL_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_zh54egw';
const TEACHER_EMAIL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEACHER_TEMPLATE_ID || 'template_s0ejm84';
const INTERN_EMAIL_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_INTERN_TEMPLATE_ID || 'template_ehwutab';
const EMAIL_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'PMPimYM9ksRpsTqna';

// Initialize EmailJS
emailjs.init(EMAIL_PUBLIC_KEY);

console.log('📧 EmailJS Configuration Loaded:', {
  serviceId: EMAIL_SERVICE_ID,
  teacherTemplateId: TEACHER_EMAIL_TEMPLATE_ID,
  internTemplateId: INTERN_EMAIL_TEMPLATE_ID,
  publicKey: EMAIL_PUBLIC_KEY ? '***' + EMAIL_PUBLIC_KEY.slice(-4) : 'missing'
});

export interface TeacherEmailData {
  to_name: string;
  to_email: string;
  to_password: string;
}

/**
 * Sends welcome email to newly created teacher with their login credentials
 * Updated to handle common EmailJS template variable naming conventions
 */
export const sendTeacherWelcomeEmail = async (emailData: TeacherEmailData): Promise<boolean> => {
  try {
    // Validate configuration first
    if (!validateEmailConfig()) {
      console.error('❌ EmailJS configuration is incomplete');
      return false;
    }

    // Validate input data
    if (!emailData.to_email || !emailData.to_name || !emailData.to_password) {
      console.error('❌ Missing required email data:', {
        hasEmail: !!emailData.to_email,
        hasName: !!emailData.to_name,
        hasPassword: !!emailData.to_password
      });
      return false;
    }

    console.log('📧 Sending welcome email to teacher:', emailData.to_email);
    
    // EmailJS template parameters - try multiple field name variations
    const templateParams = {
      // Primary template variables
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      to_password: emailData.to_password,
      
      // Alternative field names (in case template uses different names)
      email: emailData.to_email,
      recipient_email: emailData.to_email,
      user_email: emailData.to_email,
      
      name: emailData.to_name,
      user_name: emailData.to_name,
      
      password: emailData.to_password,
      user_password: emailData.to_password,
      
      // Additional fields
      subject: 'Welcome to ITRACK - Your Teacher Account',
      message: `Hello ${emailData.to_name}, your login credentials are: Email: ${emailData.to_email}, Password: ${emailData.to_password}`,
    };

    console.log('📧 Template params being sent:', {
      to_email: templateParams.to_email,
      to_name: templateParams.to_name,
      hasPassword: !!templateParams.to_password,
      paramCount: Object.keys(templateParams).length
    });
    
    console.log('📧 Using EmailJS config:', {
      service: EMAIL_SERVICE_ID,
      template: TEACHER_EMAIL_TEMPLATE_ID,
      publicKey: EMAIL_PUBLIC_KEY ? '***' + EMAIL_PUBLIC_KEY.slice(-4) : 'missing'
    });

    // Use emailjs.send with explicit parameters
    const result = await emailjs.send(
      EMAIL_SERVICE_ID,
      TEACHER_EMAIL_TEMPLATE_ID,
      templateParams,
      EMAIL_PUBLIC_KEY
    );

    console.log('✅ EmailJS send result:', result);
    
    if (result.status === 200) {
      console.log('✅ Email sent successfully!');
      return true;
    } else {
      console.error('❌ Email sending failed with status:', result.status, result.text);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Failed to send teacher welcome email:', error);
    
    // Enhanced error logging for specific issues
    if (error?.status === 422) {
      console.error('🔐 Template Configuration Error!');
      console.error('📋 SOLUTION: Check your EmailJS template:');
      console.error('   1. Go to https://emailjs.com → Email Templates');
      console.error('   2. Edit template: template_s0ejm84');
      console.error('   3. Set "To Email" field to: {{to_email}}');
      console.error('   4. Save the template');
      console.error('   5. Test again');
    }
    
    if (error?.status) {
      console.error('❌ EmailJS Error Status:', error.status);
    }
    if (error?.text) {
      console.error('❌ EmailJS Error Text:', error.text);
    }
    if (error?.message) {
      console.error('❌ Error Message:', error.message);
    }
    
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    
    return false;
  }
};

/**
 * Validates email configuration for teachers
 */
export const validateEmailConfig = (): boolean => {
  const isValid = !!(EMAIL_SERVICE_ID && TEACHER_EMAIL_TEMPLATE_ID && EMAIL_PUBLIC_KEY);
  console.log('📧 EmailJS Config Validation:', {
    SERVICE_ID: EMAIL_SERVICE_ID ? '✅' : '❌',
    TEACHER_TEMPLATE_ID: TEACHER_EMAIL_TEMPLATE_ID ? '✅' : '❌', 
    PUBLIC_KEY: EMAIL_PUBLIC_KEY ? '✅' : '❌',
    isValid
  });
  return isValid;
};

/**
 * Test function to help debug EmailJS template issues
 * This sends a test email with various field name combinations
 */
export const sendTestEmail = async (testEmail: string): Promise<void> => {
  try {
    console.log('🧪 Sending test email to debug template fields...');
    
    const testParams = {
      // Try all common field name variations
      to_email: testEmail,
      email: testEmail,
      recipient: testEmail,
      to: testEmail,
      
      to_name: 'Test User',
      name: 'Test User',
      user_name: 'Test User',
      
      to_password: 'TestPassword123',
      password: 'TestPassword123',
      user_password: 'TestPassword123',
      
      message: 'This is a test email to debug template configuration',
      subject: 'ITRACK Test Email',
      from_name: 'ITRACK System',
    };
    
    console.log('🧪 Test parameters:', testParams);
    
    const result = await emailjs.send(
      EMAIL_SERVICE_ID,
      TEACHER_EMAIL_TEMPLATE_ID,
      testParams,
      EMAIL_PUBLIC_KEY
    );
    
    console.log('✅ Test email result:', result);
  } catch (error: any) {
    console.error('❌ Test email failed:', error);
    
    if (error?.status === 412) {
      console.error('🔐 SOLUTION: Gmail Authentication Problem!');
      console.error('📋 Fix Steps:');
      console.error('   1. Go to https://emailjs.com dashboard');
      console.error('   2. Email Services → service_oqmr9v8');
      console.error('   3. Click "Connect Account" or "Reconnect"');
      console.error('   4. Re-authenticate Gmail with full permissions');
      alert('Gmail Authentication Error!\n\nGo to EmailJS Dashboard → Email Services → Reconnect your Gmail account with full permissions.');
    }
  }
};

export interface InternEmailData {
  to_name: string;
  to_email: string;
  to_password: string;
}

/**
 * Sends welcome email to newly created intern with their login credentials
 */
export const sendInternWelcomeEmail = async (emailData: InternEmailData): Promise<boolean> => {
  try {
    // Validate configuration first
    if (!validateInternEmailConfig()) {
      console.error('❌ EmailJS intern configuration is incomplete');
      return false;
    }

    // Validate input data
    if (!emailData.to_email || !emailData.to_name || !emailData.to_password) {
      console.error('❌ Missing required intern email data:', {
        hasEmail: !!emailData.to_email,
        hasName: !!emailData.to_name,
        hasPassword: !!emailData.to_password
      });
      return false;
    }

    console.log('📧 Sending welcome email to intern:', emailData.to_email);
    
    // EmailJS template parameters for intern
    const templateParams = {
      // Primary template variables
      to_email: emailData.to_email,
      to_name: emailData.to_name,
      to_password: emailData.to_password,
      
      // Alternative field names (in case template uses different names)
      email: emailData.to_email,
      recipient_email: emailData.to_email,
      user_email: emailData.to_email,
      
      name: emailData.to_name,
      user_name: emailData.to_name,
      
      password: emailData.to_password,
      user_password: emailData.to_password,
      
      // Additional fields
      subject: 'Welcome to ITRACK - Your Intern Account',
      message: `Hello ${emailData.to_name}, your login credentials are: Email: ${emailData.to_email}, Password: ${emailData.to_password}`,
    };

    console.log('📧 Intern template params being sent:', {
      to_email: templateParams.to_email,
      to_name: templateParams.to_name,
      hasPassword: !!templateParams.to_password,
      paramCount: Object.keys(templateParams).length
    });
    
    console.log('📧 Using EmailJS intern config:', {
      service: EMAIL_SERVICE_ID,
      template: INTERN_EMAIL_TEMPLATE_ID,
      publicKey: EMAIL_PUBLIC_KEY ? '***' + EMAIL_PUBLIC_KEY.slice(-4) : 'missing'
    });

    // Use emailjs.send with explicit parameters
    const result = await emailjs.send(
      EMAIL_SERVICE_ID,
      INTERN_EMAIL_TEMPLATE_ID,
      templateParams,
      EMAIL_PUBLIC_KEY
    );

    console.log('✅ EmailJS intern send result:', result);
    
    if (result.status === 200) {
      console.log('✅ Intern email sent successfully!');
      return true;
    } else {
      console.error('❌ Intern email sending failed with status:', result.status, result.text);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Failed to send intern welcome email:', error);
    
    // Enhanced error logging for specific issues
    if (error?.status === 422) {
      console.error('🔐 Intern Template Configuration Error!');
      console.error('📋 SOLUTION: Check your EmailJS intern template:');
      console.error('   1. Go to https://emailjs.com → Email Templates');
      console.error('   2. Edit template: template_ehwutab');
      console.error('   3. Set "To Email" field to: {{to_email}}');
      console.error('   4. Save the template');
      console.error('   5. Test again');
    }
    
    if (error?.status) {
      console.error('❌ EmailJS Error Status:', error.status);
    }
    if (error?.text) {
      console.error('❌ EmailJS Error Text:', error.text);
    }
    if (error?.message) {
      console.error('❌ Error Message:', error.message);
    }
    
    console.error('❌ Full error object:', JSON.stringify(error, null, 2));
    
    return false;
  }
};

/**
 * Validates email configuration for interns
 */
export const validateInternEmailConfig = (): boolean => {
  const isValid = !!(EMAIL_SERVICE_ID && INTERN_EMAIL_TEMPLATE_ID && EMAIL_PUBLIC_KEY);
  console.log('📧 EmailJS Intern Config Validation:', {
    SERVICE_ID: EMAIL_SERVICE_ID ? '✅' : '❌',
    INTERN_TEMPLATE_ID: INTERN_EMAIL_TEMPLATE_ID ? '✅' : '❌', 
    PUBLIC_KEY: EMAIL_PUBLIC_KEY ? '✅' : '❌',
    isValid
  });
  return isValid;
};