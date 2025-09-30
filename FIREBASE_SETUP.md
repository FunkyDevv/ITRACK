# Firebase Backend Setup

## Setting up Firebase Service Account

To use the backend API for teacher creation, you need to set up a Firebase service account:

### 1. Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `itrack-f9dca`

### 2. Create Service Account
1. Go to **Project Settings** (gear icon)
2. Click on **Service Accounts** tab
3. Click **Generate new private key**
4. Download the JSON file (keep it secure!)

### 3. Update Environment Variables
1. Open the downloaded JSON file
2. Copy the values to your `.env` file:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[PASTE_YOUR_PRIVATE_KEY_HERE]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="[PASTE_YOUR_CLIENT_EMAIL_HERE]"
FIREBASE_PROJECT_ID="itrack-f9dca"
```

**Important Notes:**
- Replace `\n` with actual newlines in the private key
- Keep the JSON file secure and never commit it to version control
- The service account needs admin permissions for your Firebase project

### 4. Restart Your Server
After updating the `.env` file, restart your development server:

```bash
npm run dev
```

## API Endpoints

### Create Teacher
```
POST /api/teachers
Content-Type: application/json

{
  "teacherData": {
    "email": "teacher@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "123-456-7890",
    "department": "Mathematics",
    "subject": "Algebra",
    "experience": "5 years",
    "location": "School A",
    "startDate": "2025-01-01"
  },
  "supervisorUid": "current_user_uid"
}
```

### Get Teacher Statistics
```
GET /api/teachers/stats
```

## What This Solves

- ✅ No more automatic logout when creating teachers
- ✅ Secure server-side account creation
- ✅ Current user session remains active
- ✅ Better separation of concerns
- ✅ More secure than client-side account creation
