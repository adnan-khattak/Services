# Services App

This is a React Native mobile application for connecting service providers with users. The app allows users to browse and contact service providers, as well as participate in community discussions.

## Project Structure

- `src/screens/` - Main application screens
- `src/components/` - Reusable UI components
- `src/navigation/` - Navigation configuration
- `src/utils/` - Utility functions and Supabase client
- `src/assets/` - Images, fonts, and other static resources
- `src/docs/` - Documentation files

## Features

1. **Authentication** - Email/password login and signup
2. **Services Browsing** - View services by category
3. **Service Provider Management** - Apply to become a service provider
4. **Community Discussions** - Create and engage with posts
5. **Profile Management** - View and update profile information

## Running the Project

1. Install dependencies:
   ```
   npm install
   ```

2. Set up Supabase:
   - Create a Supabase account at https://supabase.io
   - Create a new project
   - Set up database tables and policies as described in `src/docs/supabase_setup.md`
   - Update the `.env` file with your Supabase URL and anonymous key

3. Run on Android:
   ```
   npx react-native run-android
   ```

4. Run on iOS:
   ```
   npx react-native run-ios
   ```

## Important Notes

- The app uses TypeScript for type safety
- Supabase is used as the backend service
- Authentication is handled via Supabase Auth
- Media uploads use Supabase Storage
- The app follows a responsive design approach

## Testing

For demonstration purposes, the app includes dummy data. In a production environment, all data would be fetched from Supabase.

## Navigation Structure

- Auth Screen
- Main Tabs:
  - Home
  - Services
  - Discussions
  - Profile
- Detail Screens:
  - Service Details
  - Post Details
  - Add Service
  - New Post

## Dependencies

- React Native 0.76.0
- Supabase JS Client
- React Navigation
- React Native Vector Icons
- React Native Responsive Screen
- And more (see package.json) 