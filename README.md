# Services App

A cross-platform React Native app for iOS and Android that connects users with service providers. This app features user authentication, service listings, social discussions, and profile management with role-based access.

## Features

- **User Authentication**
  - Email/password signup/login with Supabase Auth
  - Role-based system (user, service_provider)

- **Services**
  - Browse services by category
  - Create and manage services (for service providers)
  - View service details and contact providers

- **Social Discussions**
  - Create and view discussions
  - Like and comment on posts
  - Media upload support

- **Profile Management**
  - View and update profile information
  - Apply for service provider status
  - Manage personal services and posts

## Technology Stack

- React Native 0.76.0
- Supabase (Backend as a Service)
- React Navigation
- Native UI components with react-native-paper

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- React Native development environment set up
- Supabase account

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/services-app.git
cd services-app
```

2. Install dependencies:
```
npm install
```

3. Configure Supabase:
   - Create a new Supabase project
   - Set up database tables and policies following the instructions in `src/docs/supabase_setup.md`
   - Copy your Supabase URL and anonymous key

4. Create a `.env` file in the root directory:
```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Run the app:
```
npx react-native run-android
# or
npx react-native run-ios
```

### Supabase Setup

This app requires a specific Supabase configuration. See `src/docs/supabase_setup.md` for detailed instructions on:
- Creating required database tables
- Setting up Row Level Security policies
- Configuring storage buckets
- Creating functions and triggers

## Project Structure

```
src/
├── assets/         # Images, fonts, and static resources
├── components/     # Reusable UI components
├── navigation/     # React Navigation setup
├── screens/        # App screens
├── services/       # API calls and business logic
├── utils/          # Utilities and helpers
└── docs/           # Documentation
```

## Development

### Key Files

- `App.tsx` - Entry point of the application
- `src/navigation/AppNavigator.tsx` - Main navigation setup
- `src/utils/supabaseClient.ts` - Supabase client configuration

### Main Screens

- AuthScreen - Login and signup functionality
- HomeScreen - Display popular services and discussions
- ServicesScreen - Browse and filter services
- DiscussionsScreen - View and interact with social posts
- ProfileScreen - User profile management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [React Native](https://reactnative.dev/)
- [Supabase](https://supabase.io/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
<!-- db password Adnanktk1234@--> #   S e r v i c e s  
 