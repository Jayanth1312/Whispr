# Use the official Bun image
FROM oven/bun:1.2

# Set working directory
WORKDIR /app

# Copy package.json and lockfile first (better cache utilization)
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose the server port (matches your index.ts defaults)
EXPOSE 3000

# Run the app
CMD ["bun", "run", "start"]
