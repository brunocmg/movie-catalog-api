# API REST Movies

A robust REST API for managing movies, users, and authentication built with NestJS and TypeScript.

## 📋 Description

This is a complete REST API for movie management with user authentication functionality, role-based access control (admin/user), and integration with PostgreSQL database via Prisma ORM.

### Main Features

- **JWT Authentication**: Secure authentication system with JWT tokens
- **User Management**: Create, update, and list users
- **Movie Management**: Complete CRUD for movies (create, read, update, delete)
- **Access Control**: Guards to protect administrative routes
- **Password Hashing**: Secure implementation with bcrypt
- **Database**: PostgreSQL with Prisma ORM
- **Logging and Interceptors**: Integrated logging system and custom interceptors
- **Exception Handling**: Global filter for application exceptions
- **API Documentation**: Swagger integration for interactive API exploration

## 🛠️ Technologies Used

- **NestJS** - Progressive backend framework
- **TypeScript** - Typed language
- **Prisma ORM** - Database ORM
- **PostgreSQL** - Relational database
- **JWT** - Secure authentication
- **Bcrypt** - Password hashing
- **Jest** - Testing framework
- **Swagger** - API documentation

## 📦 Installation

```bash
# Install dependencies
npm install
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/movies_db"
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="3600"
```

### Running Migrations

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

## 🚀 Running the Project

```bash
# Development
npm run start

# Watch mode (auto-restart)
npm run start:dev

# Production
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the project is running, you can access the interactive Swagger documentation at:

```
http://localhost:3000/api
```

The Swagger UI provides an interactive interface where you can:
- View all available endpoints
- See request and response schemas
- Test endpoints directly from the browser
- Understand authentication requirements

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📍 Main Endpoints

### Authentication
- `POST /auth/signin` - User login
- `POST /auth/signup` - Register new user

### Users
- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user data
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user (admin only)

### Movies
- `GET /movies` - List all movies
- `GET /movies/:id` - Get movie details
- `POST /movies` - Create new movie (admin only)
- `PATCH /movies/:id` - Update movie (admin only)
- `DELETE /movies/:id` - Delete movie (admin only)

## 📁 Project Structure

```
src/
├── main.ts                 # Application entry point
├── app/                    # Main module
├── auth/                   # Authentication module
├── users/                  # Users module
├── movies/                 # Movies module
├── prisma/                 # Prisma module
├── common/                 # Shared components
│   ├── filters/           # Exception filters
│   ├── guards/            # Authentication guards
│   ├── interceptors/       # Custom interceptors
│   └── middlewares/        # Middlewares
```

## 🐳 Docker

> ⚠️ **STATUS**: Docker implementation is under development and will be completed soon.
> For now, run the application locally following the installation instructions above.

## 👨‍💻 Author

**Bruno Gomes** - [GitHub](https://github.com)
