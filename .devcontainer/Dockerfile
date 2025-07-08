<<<<<<< HEAD
FROM node:20-bookworm-slim
=======
FROM node:20
>>>>>>> origin/main

ARG TZ
ENV TZ="$TZ"

# Install basic development tools and iptables/ipset
<<<<<<< HEAD
RUN apt update && apt install -y --no-install-recommends \
  less \
=======
RUN apt update && apt install -y less \
>>>>>>> origin/main
  git \
  procps \
  sudo \
  fzf \
  zsh \
  man-db \
  unzip \
  gnupg2 \
  gh \
  iptables \
  ipset \
  iproute2 \
  dnsutils \
  aggregate \
  jq \
  curl \
  wget \
  ca-certificates \
  build-essential \
  python3 \
  python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Ensure default node user has access to /usr/local/share
RUN mkdir -p /usr/local/share/npm-global && \
  chown -R node:node /usr/local/share

ARG USERNAME=node

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R $USERNAME /commandhistory

# Set `DEVCONTAINER` environment variable to help with orientation
ENV DEVCONTAINER=true

# Create workspace and config directories and set permissions
RUN mkdir -p /workspace /home/node/.claude && \
  chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

RUN ARCH=$(dpkg --print-architecture) && \
  wget "https://github.com/dandavison/delta/releases/download/0.18.2/git-delta_0.18.2_${ARCH}.deb" && \
  sudo dpkg -i "git-delta_0.18.2_${ARCH}.deb" && \
  rm "git-delta_0.18.2_${ARCH}.deb"

# Set up non-root user
USER node

# Install global packages
ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
<<<<<<< HEAD
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PATH:$PNPM_HOME

# Install pnpm
RUN npm install -g pnpm@8.15.0
=======
>>>>>>> origin/main

# Set the default shell to zsh rather than sh
ENV SHELL=/bin/zsh

# Default powerline10k theme
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.0/zsh-in-docker.sh)" -- \
  -p git \
  -p fzf \
  -a "source /usr/share/doc/fzf/examples/key-bindings.zsh" \
  -a "source /usr/share/doc/fzf/examples/completion.zsh" \
  -a "export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  -x

<<<<<<< HEAD
# Install Claude and other development tools
RUN npm install -g @anthropic-ai/claude-code \
  && pnpm install -g playwright@latest \
  && pnpm install -g @playwright/test \
  && pnpm install -g typescript@latest \
  && pnpm install -g tsx@latest \
  && pnpm install -g vitest@latest
=======
# Install Claude
RUN npm install -g @anthropic-ai/claude-code \
  && npm install -g task-master-ai \
  && npm install -g pnpm@latest 
>>>>>>> origin/main

# Copy and set up firewall script
COPY init-firewall.sh /usr/local/bin/
USER root
RUN chmod +x /usr/local/bin/init-firewall.sh && \
  echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
<<<<<<< HEAD
  echo "node ALL=(root) NOPASSWD: /usr/bin/chown" >> /etc/sudoers.d/node-firewall && \
=======
>>>>>>> origin/main
  chmod 0440 /etc/sudoers.d/node-firewall
RUN git config --global --add push.autoSetupRemote true
USER node