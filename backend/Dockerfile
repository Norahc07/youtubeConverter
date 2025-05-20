# Use a base image with Node.js
FROM node:20-slim

# Install Python, pip, and ffmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-pip ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp using pip
RUN pip3 install yt-dlp

# Set the working directory inside the container
WORKDIR /app

# Copy backend files
COPY . /app

# Install Node.js dependencies
RUN npm install

# Expose the port (Render will use this)
EXPOSE 4000

# Command to run your application
CMD ["npm", "start"]
