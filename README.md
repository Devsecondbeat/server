# server

Server code for second beat to host the features: Buying/Selling used products, Tutor module.

## Onboarding for New Developers

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database with SSL certificate support
- SendGrid account for emails
- AWS account with S3 bucket access
- Bruno (API client) for testing endpoints

### Setup Steps
1. Clone the repository and checkout the feature branch if needed.
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file and configure it:
   ```
   cp .env.example .env
   ```
   Edit `.env` with your actual (non-secret) values for DB, AWS, SendGrid, etc. Never commit `.env`.
4. Run the server:
   ```
   npm start
   ```
   Server starts on the port specified in `PORT` (default 3000). Access root at `http://localhost:PORT/`.

### Environment Variables
See `.env.example` for all required variables. Key ones include:
- Database connection (DB*)
- JWT secret (`Token_Secret_Key`)
- SendGrid API key
- AWS S3 credentials and bucket

### Testing with Bruno
- Import the Bruno collection (if provided in repo or shared separately).
- Use it to test API endpoints under `/api/v1` (e.g., user registration, auth, used instruments).
- Ensure `.env` is set so server runs before testing.

### Project Structure
- `src/routes/` - Route definitions and middleware
- `src/controllers/` - HTTP request handling and validation
- `src/models/` - Database access (SQL via pg)
- `src/services/` - External API wrappers (if added)
- `src/config/` - Shared configs (database, logger)
- `src/Utils/` - Helpers (email, tokens, etc.)

Keep changes within layers and follow ES module style with explicit `.js` imports.

For issues or contributions, reference GitHub issue #15.
