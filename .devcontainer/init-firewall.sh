#!/bin/bash
set -euo pipefail  # Exit on error, undefined vars, and pipeline failures
IFS=$'\n\t'       # Stricter word splitting

<<<<<<< HEAD
# Check if we have the required capabilities
if ! command -v iptables >/dev/null 2>&1; then
    echo "Warning: iptables not available, skipping firewall setup"
    exit 0
fi

if ! command -v ipset >/dev/null 2>&1; then
    echo "Warning: ipset not available, skipping firewall setup"
    exit 0
fi

# Test if we can actually use iptables (requires proper capabilities)
if ! iptables -L >/dev/null 2>&1; then
    echo "Warning: Cannot access iptables (missing capabilities), skipping firewall setup"
    exit 0
fi

=======
>>>>>>> origin/main
# Flush existing rules and delete existing ipsets
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

# First allow DNS and localhost before any restrictions
# Allow outbound DNS
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
# Allow inbound DNS responses
iptables -A INPUT -p udp --sport 53 -j ACCEPT
# Allow outbound SSH
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow inbound SSH responses
iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset with CIDR support
ipset create allowed-domains hash:net

# Fetch GitHub meta information and aggregate + add their IP ranges
echo "Fetching GitHub IP ranges..."
<<<<<<< HEAD
gh_ranges=$(curl -s --connect-timeout 10 --max-time 30 https://api.github.com/meta || echo "")
if [ -z "$gh_ranges" ]; then
    echo "Warning: Failed to fetch GitHub IP ranges, using fallback configuration"
    # Add minimal GitHub IP ranges as fallback
    ipset add allowed-domains "140.82.112.0/20"
    ipset add allowed-domains "185.199.108.0/22"
    ipset add allowed-domains "192.30.252.0/22"
    ipset add allowed-domains "2606:50c0:8000::/40"
    ipset add allowed-domains "2606:50c0:8001::/40"
    ipset add allowed-domains "2606:50c0:8002::/40"
    ipset add allowed-domains "2606:50c0:8003::/40"
    if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
        echo "Warning: GitHub API response missing required fields, using fallback"
        ipset add allowed-domains "140.82.112.0/20"
        ipset add allowed-domains "185.199.108.0/22"
        ipset add allowed-domains "192.30.252.0/22"
    else
        echo "Processing GitHub IPs..."
        while read -r cidr; do
            if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
                echo "Warning: Invalid CIDR range from GitHub meta: $cidr"
                continue
            fi
            echo "Adding GitHub range $cidr"
            ipset add allowed-domains "$cidr"
        done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)
    fi
fi

=======
gh_ranges=$(curl -s https://api.github.com/meta)
if [ -z "$gh_ranges" ]; then
    echo "ERROR: Failed to fetch GitHub IP ranges"
    exit 1
fi

if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null; then
    echo "ERROR: GitHub API response missing required fields"
    exit 1
fi

echo "Processing GitHub IPs..."
while read -r cidr; do
    if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
        exit 1
    fi
    echo "Adding GitHub range $cidr"
    ipset add allowed-domains "$cidr"
done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)

>>>>>>> origin/main
# Resolve and add other allowed domains
for domain in \
    "registry.npmjs.org" \
    "api.anthropic.com" \
    "sentry.io" \
    "statsig.anthropic.com" \
    "statsig.com"; do
    echo "Resolving $domain..."
<<<<<<< HEAD
    ips=$(dig +short +time=5 +tries=2 A "$domain" || echo "")
    if [ -z "$ips" ]; then
        echo "Warning: Failed to resolve $domain, skipping..."
        continue
=======
    ips=$(dig +short A "$domain")
    if [ -z "$ips" ]; then
        echo "ERROR: Failed to resolve $domain"
        exit 1
>>>>>>> origin/main
    fi
    
    while read -r ip; do
        if [[ ! "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
<<<<<<< HEAD
            echo "Warning: Invalid IP from DNS for $domain: $ip"
            continue
=======
            echo "ERROR: Invalid IP from DNS for $domain: $ip"
            exit 1
>>>>>>> origin/main
        fi
        echo "Adding $ip for $domain"
        ipset add allowed-domains "$ip"
    done < <(echo "$ips")
done

# Get host IP from default route
<<<<<<< HEAD
HOST_IP=$(ip route 2>/dev/null | grep default | cut -d" " -f3 || echo "")
if [ -z "$HOST_IP" ]; then
    echo "Warning: Failed to detect host IP, using fallback network"
    HOST_NETWORK="172.16.0.0/12"
else
    HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
    echo "Host network detected as: $HOST_NETWORK"
fi

=======
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "Host network detected as: $HOST_NETWORK"

>>>>>>> origin/main
# Set up remaining iptables rules
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Set default policies to DROP first
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# First allow established connections for already approved traffic
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Then allow only specific outbound traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

echo "Firewall configuration complete"
echo "Verifying firewall rules..."
<<<<<<< HEAD
if curl --connect-timeout 5 --max-time 10 https://example.com >/dev/null 2>&1; then
    echo "Warning: Firewall verification failed - was able to reach https://example.com"
    echo "Firewall may not be fully effective, but continuing..."
=======
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - was able to reach https://example.com"
    exit 1
>>>>>>> origin/main
else
    echo "Firewall verification passed - unable to reach https://example.com as expected"
fi

# Verify GitHub API access
<<<<<<< HEAD
if ! curl --connect-timeout 5 --max-time 10 https://api.github.com/zen >/dev/null 2>&1; then
    echo "Warning: Firewall verification failed - unable to reach https://api.github.com"
    echo "GitHub access may be restricted, but continuing..."
=======
if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
    echo "ERROR: Firewall verification failed - unable to reach https://api.github.com"
    exit 1
>>>>>>> origin/main
else
    echo "Firewall verification passed - able to reach https://api.github.com as expected"
fi