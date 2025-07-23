# Lima Bot
A Discord bot for Princess Connect Re:Dive clan management, specifically designed for tracking Clan Battle (CB) hits and managing clan member data.

## Features

- **Clan Management**: Add, edit, remove clan members
- **Clan Battle Tracking**: Track hits for 5-day Clan Battles
- **Hit Management**: Add/remove hits with validation
- **Player Coordination**: Ping systems for players missing hits
- **Automatic Scheduling**: CB day progression with timers
- **Multi-Clan Support**: Support for multiple clans per Discord server

## Prerequisites

Before setting up Lima Bot, ensure you have:

- [Node.js](https://nodejs.org/) (version 16.9.0 or higher)
- [MongoDB](https://www.mongodb.com/) database (local or cloud)
- A Discord Application and Bot Token

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/jesseji2806/Lima-Bot.git
cd Lima-Bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Discord Application Setup

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token (you'll need this for the `.env` file)
5. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

### 4. MongoDB Setup

#### Option A: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string (replace `<password>` with your actual password)

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/lima-bot`

### 5. Environment Configuration

Create a `.env` file in the root directory:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_discord_server_id_for_testing

# MongoDB Configuration
DATABASE_URI=mongodb://localhost:27017/lima-bot
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/lima-bot

```

#### Environment Variables Explained:

- `DISCORD_TOKEN`: Your Discord bot token from the Developer Portal
- `CLIENT_ID`: Your Discord application's client ID
- `GUILD_ID`: Your Discord server ID (for development/testing slash commands)
- `DATABASE_URI`: Your MongoDB connection string

### 6. Deploy Commands

Deploy the slash commands to your Discord server:

**For development/testing (guild-specific):**
```bash
node deploy-commands.js
# or
npm run deploy
```

**For production (global deployment):**
```bash
node deploy-commands.js --prod
# or
npm run deploy:prod
```

> **Note**: Development deployment is faster and only affects your test server. Use production deployment when you're ready to make commands available globally across all servers where your bot is installed.

### 7. Start the Bot

```bash
npm start
```

## Docker Deployment (Alternative)

If you prefer using Docker, you can run Lima Bot in a container:

### Prerequisites for Docker
- [Docker](https://www.docker.com/get-started) installed on your system
- MongoDB database (cloud or separate container)

### 1. Environment Setup
Create a `.env` file in the root directory with the same variables as described in step 5 above.

### 2. Build the Docker Image
```bash
docker build -t lima-bot .
```

### 3. Run the Container
```bash
docker run -d --name lima-bot --env-file .env lima-bot
```

### 4. Deploy Commands
You'll need to deploy commands once. You can do this by running:
```bash
# For development
docker exec lima-bot node deploy-commands.js

# For production
docker exec lima-bot node deploy-commands.js --prod
```

### Docker with MongoDB
If you want to run MongoDB in Docker as well, you can use docker-compose. Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    container_name: lima-bot-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: password

  lima-bot:
    build: .
    container_name: lima-bot
    restart: unless-stopped
    depends_on:
      - mongodb
    env_file:
      - .env
    environment:
      - DATABASE_URI=mongodb://root:password@mongodb:27017/lima-bot?authSource=admin

volumes:
  mongodb_data:
```

Then run:
```bash
docker-compose up -d
```

> **Note**: When using the docker-compose setup, make sure your `.env` file doesn't override the `DATABASE_URI` or update it to match the MongoDB container connection string.

## Usage

### Initial Setup

1. **Invite the Bot**: Generate an invite link with necessary permissions:
   - `applications.commands` (for slash commands)
   - `Send Messages`
   - `Manage Messages`
   - `Read Message History`

2. **Create a Clan**: Use `/clan-add` or `/clan-quickstart` with a clan name to create your first clan

3. **Add Players**: Use `/clan-add` to add players to your clan

### Main Commands

#### Clan Management
- `/clan-add` - Add a player to the clan
- `/clan-edit` - Edit a player's account count
- `/clan-remove` - Remove a player from the clan
- `/clan-view` - View clan information
- `/clan-quickstart` - Quick setup for new clans with multiple players

#### Clan Battle
- `/start-cb` - Start a new Clan Battle
- `/add-hit` - Add hits for a player
- `/remove-hit` - Remove hits for a player
- `/get-hit` - Check hit count for a player
- `/ping-setting` - Set ping preferences for coordination
- `/find-unhit` - Find players who haven't completed hits
- `/ping-unhit` - Ping players who haven't hit

## Project Structure

```
Lima-Bot/
├── commands/           # Slash command definitions
│   ├── cb/            # Clan Battle related commands
│   └── clan/          # Clan management commands
├── database/          # Database utilities and schemas
├── events/            # Discord event handlers
├── functions/         # Shared utility functions
├── schemas/           # MongoDB schemas
├── .env               # Environment variables (create this)
├── deploy-commands.js # Command deployment script
├── index.js           # Main bot entry point
└── package.json       # Dependencies and scripts
```

## Database Schema

The bot uses MongoDB with the following main collections:

- **Clans**: Store clan information and member data
- **CB Queue**: Manage Clan Battle scheduling and progression
- **Hit Lists**: Track individual player hits per CB day

## Development

### Adding New Commands

1. Create a new file in the appropriate folder under `commands/`
2. Follow the existing command structure
3. Re-run `node deploy-commands.js` to update slash commands (development)
4. When ready for production, run `node deploy-commands.js --prod` for global deployment

## Troubleshooting

### Common Issues

1. **Commands not appearing**: 
   - Re-run `deploy-commands.js` for development
   - Use `deploy-commands.js --prod` for production deployment
2. **Database connection errors**: Check your MongoDB URI and network access
3. **Permission errors**: Ensure the bot has necessary permissions in your server
4. **Cache issues**: Bot automatically manages cache, but restart if needed

### Logs

The bot logs important operations to the console. Check for error messages if something isn't working.

---

**Note**: This bot is specifically designed for Princess Connect Re:Dive clan management. Some features may be game-specific.

