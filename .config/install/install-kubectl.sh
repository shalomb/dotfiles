#!/bin/bash
set -e

# Custom kubectl installer
echo "Installing kubectl via custom script..."

# Get latest version
KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)

# Download kubectl
curl -LO "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"

# Make executable and install
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

echo "✓ kubectl ${KUBECTL_VERSION} installed successfully"
