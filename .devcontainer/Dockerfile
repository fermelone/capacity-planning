FROM mcr.microsoft.com/devcontainers/javascript-node:20

# The javascript-node image already includes Node.js and basic build tools
# Check if yarn is already installed, install if not
RUN if ! command -v yarn &> /dev/null; then \
        npm install -g yarn; \
    fi

# Set the default shell to bash rather than sh
ENV SHELL /bin/bash
